import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';
import { createInteractionNotification } from './inboxService.js';

export const POST_LIST_SELECT_FIELDS = `
  id,
  title,
  content,
  media_urls,
  is_anonymous,
  view_count,
  created_at,
  author_id,
  author:profiles!posts_author_id_fkey(
    nickname,
    avatar_url
  ),
  post_likes:post_likes(count),
  comments:comments(count)
`;

export const getAuthenticatedUser = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('用户未登录或认证失败');
  }

  return user;
};

export const getUserAndProfile = async (profileFields = 'role') => {
  const user = await getAuthenticatedUser();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('获取用户信息失败');
  }

  return { user, profile };
};

export const getOptionalUserAndProfile = async (profileFields = 'role, nickname') => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('获取用户信息失败');
  }

  return { user, profile };
};

const buildListAuthor = (post, role) => {
  if (post.is_anonymous) {
    if (role === 'admin' || role === 'superuser') {
      return {
        id: post.author_id,
        nickname: post.author?.nickname || '未知用户',
        avatar_url: post.author?.avatar_url,
        is_anonymous: false,
        is_real_author: true,
      };
    }

    return {
      id: null,
      nickname: '匿名用户',
      avatar_url: null,
      is_anonymous: true,
      is_real_author: false,
    };
  }

  return {
    id: post.author_id,
    nickname: post.author?.nickname || '未知用户',
    avatar_url: post.author?.avatar_url,
    is_anonymous: false,
    is_real_author: true,
  };
};

export const buildProcessedPost = (post, role, userId, liked = false) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  media_urls: post.media_urls || [],
  is_anonymous: post.is_anonymous,
  view_count: post.view_count || 0,
  created_at: post.created_at,
  like_count: post.post_likes?.[0]?.count || 0,
  comment_count: post.comments?.[0]?.count || 0,
  author: buildListAuthor(post, role),
  is_owner: userId ? post.author_id === userId : false,
  liked: Boolean(liked),
  viewer_role: role,
});

export const buildDetailAuthor = (post, role) => {
  if (post.is_anonymous) {
    if (role === 'admin' || role === 'superuser') {
      return {
        ...post.author,
        is_anonymous: true,
        is_real_author: true,
        display_nickname: post.author?.nickname || '未知用户',
      };
    }

    return {
      nickname: '匿名用户',
      avatar_url: null,
      is_anonymous: true,
      is_real_author: false,
      display_nickname: '匿名用户',
    };
  }

  return {
    ...post.author,
    is_anonymous: false,
    is_real_author: true,
    display_nickname: post.author?.nickname || '未知用户',
  };
};

export const canViewPost = (post, user, profile) => {
  if (!profile || !user) {
    return false;
  }
  return true;
};

const normalizePostMediaUrls = (mediaUrls) => {
  const safeMediaUrls = Array.isArray(mediaUrls) ? mediaUrls : [];

  if (safeMediaUrls.length > 5) {
    throw new Error('帖子媒体数量不能超过5个');
  }

  for (const url of safeMediaUrls) {
    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('invalid');
      }
    } catch {
      throw new Error('媒体链接无效');
    }
  }

  return safeMediaUrls;
};

export const validatePostInput = (postData) => {
  const title = postData.title?.trim();
  const content = postData.content?.trim();

  if (!title) {
    throw new Error('帖子标题不能为空');
  }

  if (title.length > 20) {
    throw new Error('帖子标题不能超过20字');
  }

  if (!content) {
    throw new Error('帖子内容不能为空');
  }

  if (content.length > 2000) {
    throw new Error('帖子内容不能超过2000字');
  }

  return {
    title,
    content,
    isAnonymous: Boolean(postData.is_anonymous),
    mediaUrls: normalizePostMediaUrls(postData.media_urls),
  };
};

export const mergeAlbumMediaUrls = async (selectedAlbumPhotos, mediaUrls) => {
  let finalMediaUrls = [...mediaUrls];

  if (selectedAlbumPhotos && selectedAlbumPhotos.length > 0) {
    const { data: albumPhotos, error: albumError } = await supabase
      .from('album_photos')
      .select('url')
      .in('id', selectedAlbumPhotos);

    if (!albumError && albumPhotos) {
      const albumUrls = albumPhotos.map((photo) => photo.url);
      finalMediaUrls = [...finalMediaUrls, ...albumUrls];
    }
  }

  if (finalMediaUrls.length > 5) {
    throw new Error('帖子媒体数量不能超过5个');
  }

  return finalMediaUrls;
};

export const extractPostMediaStoragePath = (url) => {
  if (!url) return null;

  try {
    const parsed = new URL(url);
    const marker = '/storage/v1/object/public/post-media/';
    const signedMarker = '/storage/v1/object/sign/post-media/';

    if (parsed.pathname.includes(marker)) {
      return decodeURIComponent(parsed.pathname.split(marker)[1]);
    }

    if (parsed.pathname.includes(signedMarker)) {
      return decodeURIComponent(parsed.pathname.split(signedMarker)[1]);
    }

    return null;
  } catch {
    return null;
  }
};

export const fetchLikedPostIds = async (userId, postIds, { strict = false } = {}) => {
  if (!userId || !Array.isArray(postIds) || postIds.length === 0) {
    return new Set();
  }

  try {
    const { data: likedRows, error: likedError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('user_id', userId)
      .in('post_id', postIds);

    if (likedError) {
      if (strict) {
        throw new Error(`获取点赞状态失败: ${likedError.message}`);
      }
      return new Set();
    }

    return new Set((likedRows || []).map((row) => row.post_id));
  } catch (error) {
    if (strict) {
      throw error;
    }
    return new Set();
  }
};

export const notifyInteractionSafely = async ({
  recipientId,
  actorId,
  actorName,
  actionType,
  targetType,
  targetId,
}) => {
  if (!recipientId || !actorId || recipientId === actorId) {
    return;
  }

  try {
    await createInteractionNotification(
      recipientId,
      actionType,
      actorName || '有人',
      targetType,
      targetId
    );
  } catch (error) {
    logger.error('createInteractionNotification error:', error);
  }
};

