import { supabase } from '../lib/supabase.js';

const getAuthenticatedUser = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('用户未登录或认证失败');
  }

  return user;
};

const getUserAndProfile = async (profileFields = 'identity_type, role') => {
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

const getOptionalUserAndProfile = async (profileFields = 'identity_type, role, nickname') => {
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

const buildVisibilityCondition = (profile) => {
  if (!profile) {
    return null;
  }
  if (profile.role === 'admin' || profile.role === 'superuser') {
    return '';
  }

  switch (profile.identity_type) {
    case 'classmate':
      return 'visibility.in.(public,alumni_only,classmate_only)';
    case 'alumni':
      return 'visibility.in.(public,alumni_only)';
    case 'guest':
    default:
      return 'visibility.eq.public';
  }
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

const buildProcessedPost = (post, role, userId, liked = false) => ({
  id: post.id,
  title: post.title,
  content: post.content,
  media_urls: post.media_urls || [],
  visibility: post.visibility,
  is_anonymous: post.is_anonymous,
  view_count: post.view_count || 0,
  created_at: post.created_at,
  like_count: post.post_likes?.[0]?.count || 0,
  comment_count: post.comments?.[0]?.count || 0,
  author: buildListAuthor(post, role),
  is_owner: userId ? post.author_id === userId : false,
  liked: Boolean(liked),
});

const buildDetailAuthor = (post, role) => {
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

const canViewPost = (post, user, profile) => {
  if (!profile || !user) {
    return false;
  }
  if (profile.role === 'admin' || profile.role === 'superuser') {
    return true;
  }

  const userId = user?.id;

  switch (post.visibility) {
    case 'public':
      return true;
    case 'alumni_only':
      return profile.identity_type === 'alumni' || profile.identity_type === 'classmate';
    case 'classmate_only':
      return profile.identity_type === 'classmate';
    case 'private':
      return Boolean(userId) && post.author_id === userId;
    default:
      return false;
  }
};

/**
 * 创建新帖子
 * @param {Object} postData - 帖子数据
 * @param {string} postData.title - 帖子标题（必须）
 * @param {string} postData.content - 帖子内容（必须）
 * @param {string[]} postData.media_urls - 图片/视频链接数组（可选）
 * @param {string} postData.visibility - 可见范围: 'private'|'classmate_only'|'alumni_only'|'public'（默认：'public'）
 * @param {boolean} postData.is_anonymous - 是否匿名发布（默认：false）
 * @param {string[]} postData.selectedAlbumPhotos - 从相册选择的图片ID数组（可选）
 * @returns {Promise<Object>} 创建的帖子或错误信息
 */
export const createPost = async (postData) => {
  try {
    // 1. 获取当前登录用户与身份信息
    const { user, profile } = await getUserAndProfile();

    // 3. 检查发布权限（仅本班同学和校友可以发布）
    const canCreatePost =
      profile.identity_type === 'classmate' ||
      profile.identity_type === 'alumni' ||
      profile.role === 'admin' ||
      profile.role === 'superuser';

    if (!canCreatePost) {
      throw new Error('游客不能发布帖子，请联系管理员升级为校友');
    }

    // 4. 验证必填字段
    if (!postData.title || postData.title.trim() === '') {
      throw new Error('帖子标题不能为空');
    }

    if (postData.title.trim().length > 20) {
      throw new Error('帖子标题不能超过20字');
    }

    if (!postData.content || postData.content.trim() === '') {
      throw new Error('帖子内容不能为空');
    }

    if (postData.content.trim().length > 2000) {
      throw new Error('帖子内容不能超过2000字');
    }

    const mediaUrls = Array.isArray(postData.media_urls) ? postData.media_urls : [];
    if (mediaUrls.length > 5) {
      throw new Error('帖子媒体数量不能超过5个');
    }

    for (const url of mediaUrls) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          throw new Error('invalid');
        }
      } catch {
        throw new Error('媒体链接无效');
      }
    }

    // 5. 准备插入数据
    const postPayload = {
      author_id: user.id,
      title: postData.title.trim(),
      content: postData.content.trim(),
      visibility: postData.visibility || 'public',
      is_anonymous: postData.is_anonymous || false,
      created_at: new Date().toISOString(),
      view_count: 0,
    };

    // 6. 处理媒体文件
    if (mediaUrls.length > 0) {
      postPayload.media_urls = mediaUrls;
    }

    // 7. 处理从相册选择的图片（如果有）
    let finalMediaUrls = [...mediaUrls];
    if (postData.selectedAlbumPhotos && postData.selectedAlbumPhotos.length > 0) {
      // 查询相册图片的URL
      const { data: albumPhotos, error: albumError } = await supabase
        .from('album_photos')
        .select('url')
        .in('id', postData.selectedAlbumPhotos);

      if (!albumError && albumPhotos) {
        const albumUrls = albumPhotos.map((photo) => photo.url);
        finalMediaUrls = [...finalMediaUrls, ...albumUrls];
      }
    }

    if (finalMediaUrls.length > 5) {
      throw new Error('帖子媒体数量不能超过5个');
    }

    if (finalMediaUrls.length > 0) {
      postPayload.media_urls = finalMediaUrls;
    }

    // 8. 插入帖子到数据库
    const { data: createdPost, error: insertError } = await supabase
      .from('posts')
      .insert(postPayload)
      .select('*')
      .single();

    if (insertError) {
      throw new Error(`创建帖子失败: ${insertError.message}`);
    }

    // 处理作者信息
    let postWithAuthor = { ...createdPost };
    const { data: author } = await supabase
      .from('profiles')
      .select('nickname, avatar_url, identity_type')
      .eq('id', user.id)
      .single();
    postWithAuthor.author = author;

    // 10. 返回创建的帖子（处理匿名）
    const responsePost = { ...postWithAuthor };

    if (responsePost.is_anonymous && profile.role !== 'admin' && profile.role !== 'superuser') {
      // 对非管理员隐藏作者信息
      delete responsePost.author_id;
      if (responsePost.author) {
        responsePost.author = {
          is_anonymous: true,
          nickname: '匿名用户',
          avatar_url: null,
        };
      }
    }

    return {
      success: true,
      data: responsePost,
      message: '帖子创建成功',
    };
  } catch (error) {
    console.error('createPost error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

/**
 * 获取帖子列表（一次性加载全部可见帖子）
 * @returns {Promise<Object>} 帖子列表或错误信息
 */
export const getPosts = async () => {
  try {
    // 1. 获取当前登录用户与身份信息
    const { user, profile } = await getOptionalUserAndProfile(
      'identity_type, role, nickname, avatar_url'
    );

    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }

    // 2. 根据用户身份确定可见范围条件
    const visibilityCondition = buildVisibilityCondition(profile);
    const userRole = profile.role;
    const userIdentity = profile.identity_type;

    // 4. 构建查询：获取帖子列表 + 统计信息 + 作者信息
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        title,
        content,
        media_urls,
        visibility,
        is_anonymous,
        view_count,
        created_at,
        author_id,
        author:profiles!posts_author_id_fkey(
          nickname,
          avatar_url,
          identity_type
        ),
        post_likes:post_likes(count),
        comments:comments(count)
      `
      )
      .order('created_at', { ascending: false });

    // 5. 应用可见性筛选条件（如果不是管理员）
    if (visibilityCondition) {
      query = query.or(`${visibilityCondition},author_id.eq.${user.id}`);
    }

    // 6. 执行查询
    const { data: posts, error: postsError } = await query;

    if (postsError) {
      throw new Error(`获取帖子列表失败: ${postsError.message}`);
    }

    // 7. 获取用户点赞记录
    const postIds = posts.map((post) => post.id);
    let likedPostIds = new Set();

    if (user?.id && postIds.length > 0) {
      const { data: likedRows, error: likedError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      if (likedError) {
        throw new Error(`获取点赞状态失败: ${likedError.message}`);
      }

      likedPostIds = new Set((likedRows || []).map((row) => row.post_id));
    }

    // 8. 处理数据：格式化统计信息，处理匿名帖子
    const processedPosts = posts.map((post) =>
      buildProcessedPost(post, userRole, user.id, likedPostIds.has(post.id))
    );

    // 8. 返回结果
    return {
      success: true,
      data: processedPosts,
      message: `成功获取 ${processedPosts.length} 条帖子`,
      user_info: {
        identity_type: userIdentity,
        role: userRole,
        nickname: profile.nickname,
      },
    };
  } catch (error) {
    console.error('getPosts error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      user_info: null,
    };
  }
};

/**
 * 获取单个帖子的详细信息（包含评论列表）
 * @param {string} postId - 帖子ID
 * @returns {Promise<Object>} 帖子详情或错误信息
 */
export const getPostById = async (postId, options = {}) => {
  try {
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }

    const { incrementView = true } = options;

    // 1. 获取当前登录用户与身份信息
    console.log('[getPostById] 获取用户信息...');
    const { user, profile } = await getOptionalUserAndProfile('identity_type, role');
    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }
    console.log('[getPostById] 用户身份信息:', { profile });

    console.log('[getPostById] 用户角色和身份:', {
      role: profile.role,
      identity: profile.identity_type,
    });

    // 3. 获取帖子详情
    console.log('[getPostById] 查询帖子...');
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(
        `
        *,
        author:profiles!posts_author_id_fkey(
          nickname,
          avatar_url,
          identity_type,
          bio
        ),
        post_likes:post_likes(count),
        comments:comments(count)
      `
      )
      .eq('id', postId)
      .single();

    console.log('[getPostById] 帖子查询结果:', { post, postError });

    if (postError) {
      if (postError.code === 'PGRST116') {
        throw new Error('帖子不存在');
      }
      throw new Error(`获取帖子失败: ${postError.message}`);
    }

    // 4. 检查访问权限
    const userRole = profile.role;
    if (!canViewPost(post, user, profile)) {
      throw new Error('您没有权限查看此帖子');
    }

    // 5. 增加浏览量（首次进入详情时）
    if (incrementView && (!user?.id || user.id !== post.author_id)) {
      // 不增加作者自己的浏览量
      const nextViewCount = (post.view_count || 0) + 1;
      await supabase.from('posts').update({ view_count: nextViewCount }).eq('id', postId);
      post.view_count = nextViewCount;
    }

    // 6. 获取点赞状态
    let liked = false;
    if (user?.id) {
      const { data: existingLike, error: likeError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('post_id', postId)
        .eq('user_id', user.id)
        .single();

      if (likeError && likeError.code !== 'PGRST116') {
        throw new Error(`查询点赞状态失败: ${likeError.message}`);
      }

      liked = Boolean(existingLike);
    }

    // 7. 处理匿名帖子的作者信息
    const processedPost = {
      ...post,
      author: buildDetailAuthor(post, userRole),
      is_owner: user?.id ? post.author_id === user.id : false,
      liked,
    };

    // 8. 格式化统计信息
    processedPost.like_count = post.post_likes?.[0]?.count || 0;
    processedPost.comment_count = post.comments?.[0]?.count || 0;

    // 9. 移除原始数据中的冗余字段
    delete processedPost.post_likes;
    delete processedPost.comments;
    delete processedPost.author_id;

    return {
      success: true,
      data: processedPost,
      message: '获取帖子详情成功',
    };
  } catch (error) {
    console.error('[getPostById] 错误详情:', {
      message: error.message,
      stack: error.stack,
    });
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

/**
 * 点赞/取消点赞帖子
 * @param {string} postId - 帖子ID
 * @returns {Promise<Object>} 操作结果
 */
export const togglePostLike = async (postId) => {
  try {
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }

    const user = await getAuthenticatedUser();

    const { data: existingLike, error: likeError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .single();

    if (likeError && likeError.code !== 'PGRST116') {
      throw new Error(`查询点赞状态失败: ${likeError.message}`);
    }

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('post_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`取消点赞失败: ${deleteError.message}`);
      }

      return {
        success: true,
        data: { liked: false },
        message: '取消点赞成功',
      };
    }

    const { error: insertError } = await supabase.from('post_likes').insert({
      post_id: postId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(`点赞失败: ${insertError.message}`);
    }

    return {
      success: true,
      data: { liked: true },
      message: '点赞成功',
    };
  } catch (error) {
    console.error('togglePostLike error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

/**
 * 获取帖子评论列表
 * @param {string} postId - 帖子ID
 * @returns {Promise<Array>} 评论列表
 */
export const getComments = async (postId) => {
  try {
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }

    const { user, profile } = await getOptionalUserAndProfile('identity_type, role');
    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, visibility, author_id')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('帖子不存在');
    }

    if (!canViewPost(post, user, profile)) {
      throw new Error('您没有权限查看此帖子');
    }

    const { data: comments, error: commentsError } = await supabase
      .from('comments')
      .select(
        `
        id,
        post_id,
        author_id,
        content,
        parent_id,
        reply_to_user_id,
        created_at,
        author:profiles!comments_author_id_fkey(
          nickname,
          avatar_url,
          identity_type
        ),
        comment_likes:comment_likes(count)
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw new Error(`获取评论失败: ${commentsError.message}`);
    }

    const processedComments = (comments || []).map((comment) => ({
      id: comment.id,
      post_id: comment.post_id,
      author_id: comment.author_id,
      content: comment.content,
      parent_id: comment.parent_id,
      reply_to_user_id: comment.reply_to_user_id,
      created_at: comment.created_at,
      author: {
        id: comment.author_id,
        nickname: comment.author?.nickname || '未知用户',
        avatar_url: comment.author?.avatar_url,
        identity_type: comment.author?.identity_type,
      },
      like_count: comment.comment_likes?.[0]?.count || 0,
    }));

    return {
      success: true,
      data: processedComments,
      message: `成功获取 ${processedComments.length} 条评论`,
    };
  } catch (error) {
    console.error('getComments error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * 发表评论
 * @param {string} postId - 帖子ID
 * @param {string} content - 评论内容
 * @param {string|null} parentId - 父评论ID（二级评论时使用）
 * @param {string|null} replyToUserId - 回复的用户ID
 * @returns {Promise<Object>} 创建的评论
 */
export const addComment = async (postId, content, parentId = null, replyToUserId = null) => {
  try {
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }
    if (!content || content.trim() === '') {
      throw new Error('评论内容不能为空');
    }

    if (content.trim().length > 200) {
      throw new Error('评论内容不能超过200字');
    }

    const user = await getAuthenticatedUser();

    const { data: createdComment, error: insertError } = await supabase
      .from('comments')
      .insert({
        post_id: postId,
        author_id: user.id,
        content: content.trim(),
        parent_id: parentId,
        reply_to_user_id: replyToUserId,
        created_at: new Date().toISOString(),
      })
      .select(
        `
        id,
        post_id,
        author_id,
        content,
        parent_id,
        reply_to_user_id,
        created_at,
        author:profiles!comments_author_id_fkey(
          nickname,
          avatar_url,
          identity_type
        )
      `
      )
      .single();

    if (insertError) {
      throw new Error(`发表评论失败: ${insertError.message}`);
    }

    return {
      success: true,
      data: {
        ...createdComment,
        author: {
          id: createdComment.author_id,
          nickname: createdComment.author?.nickname || '未知用户',
          avatar_url: createdComment.author?.avatar_url,
          identity_type: createdComment.author?.identity_type,
        },
      },
      message: '评论发表成功',
    };
  } catch (error) {
    console.error('addComment error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

/**
 * 点赞/取消点赞评论
 * @param {string} commentId - 评论ID
 * @returns {Promise<Object>} 操作结果
 */
export const toggleCommentLike = async (commentId) => {
  try {
    if (!commentId) {
      throw new Error('评论ID不能为空');
    }

    const user = await getAuthenticatedUser();

    const { data: existingLike, error: likeError } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .single();

    if (likeError && likeError.code !== 'PGRST116') {
      throw new Error(`查询点赞状态失败: ${likeError.message}`);
    }

    if (existingLike) {
      const { error: deleteError } = await supabase
        .from('comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', user.id);

      if (deleteError) {
        throw new Error(`取消点赞失败: ${deleteError.message}`);
      }

      return {
        success: true,
        data: { liked: false },
        message: '取消点赞成功',
      };
    }

    const { error: insertError } = await supabase.from('comment_likes').insert({
      comment_id: commentId,
      user_id: user.id,
      created_at: new Date().toISOString(),
    });

    if (insertError) {
      throw new Error(`点赞失败: ${insertError.message}`);
    }

    return {
      success: true,
      data: { liked: true },
      message: '点赞成功',
    };
  } catch (error) {
    console.error('toggleCommentLike error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

/**
 * 搜索帖子
 * @param {Object} options - 搜索选项
 * @param {string} options.keyword - 搜索关键词（内容搜索）
 * @param {string} options.sortBy - 排序方式: 'time'|'likes'
 * @returns {Promise<Array>} 搜索结果
 */
export const searchPosts = async (options = {}) => {
  try {
    const { user, profile } = await getOptionalUserAndProfile('identity_type, role');
    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }

    const keyword = options.keyword ? options.keyword.trim() : '';
    const sortBy = options.sortBy === 'likes' ? 'likes' : 'time';

    // 1. 可见性条件
    const visibilityCondition = buildVisibilityCondition(profile);

    // 2. 搜索条件
    const orConditions = [];
    if (keyword) {
      orConditions.push(`title.ilike.%${keyword}%`);
      orConditions.push(`content.ilike.%${keyword}%`);
    }

    // 3. 构建查询
    let query = supabase
      .from('posts')
      .select(
        `
        id,
        title,
        content,
        media_urls,
        visibility,
        is_anonymous,
        view_count,
        created_at,
        author_id,
        author:profiles!posts_author_id_fkey(
          nickname,
          avatar_url,
          identity_type
        ),
        post_likes:post_likes(count),
        comments:comments(count)
      `
      )
      .order('created_at', { ascending: false });

    if (visibilityCondition) {
      if (user?.id) {
        query = query.or(`${visibilityCondition},author_id.eq.${user.id}`);
      } else {
        query = query.or(visibilityCondition);
      }
    }

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      throw new Error(`搜索失败: ${postsError.message}`);
    }

    const postIds = (posts || []).map((post) => post.id);
    let likedPostIds = new Set();

    if (user?.id && postIds.length > 0) {
      const { data: likedRows, error: likedError } = await supabase
        .from('post_likes')
        .select('post_id')
        .eq('user_id', user.id)
        .in('post_id', postIds);

      if (likedError) {
        throw new Error(`获取点赞状态失败: ${likedError.message}`);
      }

      likedPostIds = new Set((likedRows || []).map((row) => row.post_id));
    }

    let processedPosts = (posts || []).map((post) =>
      buildProcessedPost(post, profile.role, user.id, likedPostIds.has(post.id))
    );

    if (sortBy === 'likes') {
      processedPosts = processedPosts.sort((a, b) => b.like_count - a.like_count);
    }

    return {
      success: true,
      data: processedPosts,
      message: `成功搜索到 ${processedPosts.length} 条帖子`,
    };
  } catch (error) {
    console.error('searchPosts error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
    };
  }
};

/**
 * 删除帖子（仅作者本人）
 * @param {string} postId - 帖子ID
 * @returns {Promise<Object>} 操作结果
 */
export const deletePost = async (postId) => {
  try {
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }

    const user = await getAuthenticatedUser();

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id, media_urls')
      .eq('id', postId)
      .single();

    if (postError || !post) {
      throw new Error('帖子不存在');
    }

    if (post.author_id !== user.id) {
      throw new Error('无权限删除该帖子');
    }

    const extractStoragePath = (url) => {
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

    const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
    const storagePaths = mediaUrls
      .map((url) => extractStoragePath(url))
      .filter((path) => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('post-media')
        .remove(storagePaths);

      if (storageError) {
        const now = new Date().toISOString();
        try {
          await supabase.from('support_tickets').insert({
            reporter_id: user.id,
            category: 'other',
            title: '删除帖子媒体失败',
            description: '删除帖子时，媒体文件删除失败，请管理员处理。',
            related_resource_type: 'post',
            related_resource_id: postId,
            metadata: {
              media_urls: mediaUrls,
              storage_error: storageError.message,
            },
            status: 'pending',
            created_at: now,
            updated_at: now,
          });
        } catch (ticketError) {
          console.error('create support ticket error:', ticketError);
        }

        const mediaError = new Error('媒体删除失败');
        mediaError.code = 'MEDIA_DELETE_FAILED';
        throw mediaError;
      }
    }

    const { error: deleteError } = await supabase.from('posts').delete().eq('id', postId);

    if (deleteError) {
      throw new Error(`删除帖子失败: ${deleteError.message}`);
    }

    return {
      success: true,
      data: { deleted: true },
      message: '帖子已删除',
    };
  } catch (error) {
    console.error('deletePost error:', error);
    return {
      success: false,
      error: error.message,
      errorCode: error.code,
      data: null,
    };
  }
};

/**
 * 删除评论（仅作者本人）
 * @param {string} commentId - 评论ID
 * @returns {Promise<Object>} 操作结果
 */
export const deleteComment = async (commentId) => {
  try {
    if (!commentId) {
      throw new Error('评论ID不能为空');
    }

    const user = await getAuthenticatedUser();

    const { data: comment, error: commentError } = await supabase
      .from('comments')
      .select('id, author_id')
      .eq('id', commentId)
      .single();

    if (commentError || !comment) {
      throw new Error('评论不存在');
    }

    if (comment.author_id !== user.id) {
      throw new Error('无权限删除该评论');
    }

    const { error: deleteError } = await supabase.from('comments').delete().eq('id', commentId);

    if (deleteError) {
      throw new Error(`删除评论失败: ${deleteError.message}`);
    }

    return {
      success: true,
      data: { deleted: true },
      message: '评论已删除',
    };
  } catch (error) {
    console.error('deleteComment error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};
