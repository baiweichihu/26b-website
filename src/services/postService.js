import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';
import {
  POST_LIST_SELECT_FIELDS,
  getAuthenticatedUser,
  getUserAndProfile,
  getOptionalUserAndProfile,
  buildProcessedPost,
  buildDetailAuthor,
  canViewPost,
  validatePostInput,
  mergeAlbumMediaUrls,
  extractPostMediaStoragePath,
  fetchLikedPostIds,
  notifyInteractionSafely,
} from './postService.helpers.js';
export { createReportTicket } from './postService.reports.js';

/**
 * 创建新帖�?
 * @param {Object} postData - 帖子数据
 * @param {string} postData.title - 帖子标题（必须）
 * @param {string} postData.content - 帖子内容（必须）
 * @param {string[]} postData.media_urls - 图片/视频链接数组（可选）
 * @param {boolean} postData.is_anonymous - 是否匿名发布（默认：false�?
 * @param {string[]} postData.selectedAlbumPhotos - 从相册选择的图片ID数组（可选）
 * @returns {Promise<Object>} 创建的帖子或错误信息
 */
export const createPost = async (postData) => {
  try {
    // 1. 获取当前登录用户与身份信�?
    const { user, profile } = await getUserAndProfile('role, is_banned');

    // 禁言用户禁止发布
    if (profile.is_banned) {
      throw new Error('你已被禁言，无法发布帖子');
    }

    const { title, content, isAnonymous, mediaUrls } = validatePostInput(postData);

    // 5. 准备插入数据
    const postPayload = {
      author_id: user.id,
      title,
      content,
      is_anonymous: isAnonymous,
      created_at: new Date().toISOString(),
      view_count: 0,
    };

    // 6. 处理媒体文件（含相册选择�?
    const finalMediaUrls = await mergeAlbumMediaUrls(postData.selectedAlbumPhotos, mediaUrls);

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

    // 处理作者信�?
    let postWithAuthor = { ...createdPost };
    const { data: author } = await supabase
      .from('profiles')
      .select('nickname, avatar_url')
      .eq('id', user.id)
      .single();
    postWithAuthor.author = author;

    // 10. 返回创建的帖子（处理匿名�?
    const responsePost = { ...postWithAuthor };

    if (responsePost.is_anonymous && profile.role !== 'admin' && profile.role !== 'superuser') {
      // 对非管理员隐藏作者信�?
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
    logger.error('createPost error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

/**
 * 获取帖子列表（一次性加载全部可见帖子）
 * @returns {Promise<Object>} 帖子列表或错误信�?
 */
export const getPosts = async () => {
  try {
    // 1. 获取当前登录用户与身份信�?
    const { user, profile } = await getOptionalUserAndProfile(
      'role, nickname, avatar_url'
    );

    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }

    // 2. 读取当前用户角色
    const userRole = profile.role;
    const userIdentity = 'internal';

    // 4. 构建查询：获取帖子列�?+ 统计信息 + 作者信�?
    const query = supabase
      .from('posts')
      .select(POST_LIST_SELECT_FIELDS)
      .order('created_at', { ascending: false });

    // 5. 执行查询
    const { data: posts, error: postsError } = await query;

    if (postsError) {
      throw new Error(`获取帖子列表失败: ${postsError.message}`);
    }

    // 7. 获取用户点赞记录
    const postIds = posts.map((post) => post.id);
    const likedPostIds = await fetchLikedPostIds(user.id, postIds);

    // 8. 处理数据：格式化统计信息，处理匿名帖�?
    const processedPosts = posts.map((post) =>
      buildProcessedPost(post, userRole, user.id, likedPostIds.has(post.id))
    );

    // 8. 返回结果
    return {
      success: true,
      data: processedPosts,
      message: `成功获取 ${processedPosts.length} 条帖子`,
      user_info: {
        identity: userIdentity,
        role: userRole,
        nickname: profile.nickname,
      },
    };
  } catch (error) {
    logger.error('getPosts error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      user_info: null,
    };
  }
};

/**
 * 获取单个帖子的详细信息（包含评论列表�?
 * @param {string} postId - 帖子ID
 * @returns {Promise<Object>} 帖子详情或错误信�?
 */
export const getPostById = async (postId, options = {}) => {
  try {
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }

    const { incrementView = true } = options;

    // 1. 获取当前登录用户与身份信�?
    const { user, profile } = await getOptionalUserAndProfile('role');
    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }

    // 3. 获取帖子详情
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(
        `
        *,
        author:profiles!posts_author_id_fkey(
          nickname,
          avatar_url,
          bio
        ),
        post_likes:post_likes(count),
        comments:comments(count)
      `
      )
      .eq('id', postId)
      .single();

    if (postError) {
      if (postError.code === 'PGRST116') {
        throw new Error('帖子不存在');
      }
      throw new Error(`获取帖子失败: ${postError.message}`);
    }

    // 4. 检查访问权�?
    const userRole = profile.role;
    if (!canViewPost(post, user, profile)) {
      throw new Error('您没有权限查看此帖子');
    }

    // 5. 增加浏览量（首次进入详情时）
    if (incrementView && (!user?.id || user.id !== post.author_id)) {
      // 不增加作者自己的浏览�?
      const nextViewCount = (post.view_count || 0) + 1;
      await supabase.from('posts').update({ view_count: nextViewCount }).eq('id', postId);
      post.view_count = nextViewCount;
    }

    // 6. 获取点赞状�?
    let liked = false;
    if (user?.id) {
      try {
        const { data: existingLike, error: likeError } = await supabase
          .from('post_likes')
          .select('post_id')
          .eq('post_id', postId)
          .eq('user_id', user.id)
          .maybeSingle();
        if (likeError) {
          throw new Error(`获取点赞状态失败: ${likeError.message}`);
        }
        if (existingLike) {
          liked = true;
        }
      } catch {
        liked = false;
      }
    }

    // 7. 处理匿名帖子的作者信�?
    const processedPost = {
      ...post,
      author: buildDetailAuthor(post, userRole),
      is_owner: user?.id ? post.author_id === user.id : false,
      liked,
      viewer_role: userRole,
    };

    // 8. 格式化统计信�?
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
    logger.error('[getPostById] 错误详情:', {
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

    const { user, profile } = await getUserAndProfile('nickname');

    const { data: postTarget, error: postError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single();

    if (postError || !postTarget) {
      throw new Error('帖子不存在');
    }

    const { data: existingLike, error: likeError } = await supabase
      .from('post_likes')
      .select('post_id')
      .eq('post_id', postId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (likeError) {
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

    await notifyInteractionSafely({
      recipientId: postTarget.author_id,
      actorId: user.id,
      actorName: profile?.nickname || '有人',
      actionType: 'like',
      targetType: 'post',
      targetId: postId,
    });

    return {
      success: true,
      data: { liked: true },
      message: '点赞成功',
    };
  } catch (error) {
    logger.error('togglePostLike error:', error);
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

    const { user, profile } = await getOptionalUserAndProfile('role');
    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }

    const { data: post, error: postError } = await supabase
      .from('posts')
      .select('id, author_id')
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
          avatar_url
        ),
        comment_likes:comment_likes(count)
      `
      )
      .eq('post_id', postId)
      .order('created_at', { ascending: true });

    if (commentsError) {
      throw new Error(`获取评论失败: ${commentsError.message}`);
    }

    const commentIds = (comments || []).map((comment) => comment.id);
    let likedCommentIds = new Set();

    if (user?.id && commentIds.length > 0) {
      const { data: likedRows, error: likedError } = await supabase
        .from('comment_likes')
        .select('comment_id')
        .eq('user_id', user.id)
        .in('comment_id', commentIds);

      if (likedError) {
        throw new Error(`获取评论点赞状态失败: ${likedError.message}`);
      }

      likedCommentIds = new Set((likedRows || []).map((row) => row.comment_id));
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
      },
      like_count: comment.comment_likes?.[0]?.count || 0,
      liked: likedCommentIds.has(comment.id),
    }));

    return {
      success: true,
      data: processedComments,
      message: `成功获取 ${processedComments.length} 条评论`,
    };
  } catch (error) {
    logger.error('getComments error:', error);
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
 * @param {string|null} parentId - 父评论ID（二级评论时使用�?
 * @param {string|null} replyToUserId - 回复的用户ID
 * @returns {Promise<Object>} 创建的评�?
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

    const { user, profile } = await getUserAndProfile('nickname, is_banned');

    const { data: postTarget, error: postError } = await supabase
      .from('posts')
      .select('id, author_id')
      .eq('id', postId)
      .single();

    if (postError || !postTarget) {
      throw new Error('帖子不存在');
    }

    if (profile?.is_banned) {
      throw new Error('你已被禁言，无法发表评论');
    }

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
          avatar_url
        )
      `
      )
      .single();

    if (insertError) {
      throw new Error(`发表评论失败: ${insertError.message}`);
    }

    await notifyInteractionSafely({
      recipientId: postTarget.author_id,
      actorId: user.id,
      actorName: profile?.nickname || '有人',
      actionType: 'comment',
      targetType: 'post',
      targetId: postId,
    });

    if (replyToUserId && replyToUserId !== postTarget.author_id) {
      await notifyInteractionSafely({
        recipientId: replyToUserId,
        actorId: user.id,
        actorName: profile?.nickname || '有人',
        actionType: 'comment',
        targetType: 'comment',
        targetId: parentId || createdComment.id,
      });
    }

    return {
      success: true,
      data: {
        ...createdComment,
        author: {
          id: createdComment.author_id,
          nickname: createdComment.author?.nickname || '未知用户',
          avatar_url: createdComment.author?.avatar_url,
        },
      },
      message: '评论发表成功',
    };
  } catch (error) {
    logger.error('addComment error:', error);
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

    const { user, profile } = await getUserAndProfile('nickname');

    const { data: commentTarget, error: commentError } = await supabase
      .from('comments')
      .select('id, author_id')
      .eq('id', commentId)
      .single();

    if (commentError || !commentTarget) {
      throw new Error('评论不存在');
    }

    const { data: existingLike, error: likeError } = await supabase
      .from('comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', user.id)
      .maybeSingle();

    if (likeError) {
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

    await notifyInteractionSafely({
      recipientId: commentTarget.author_id,
      actorId: user.id,
      actorName: profile?.nickname || '有人',
      actionType: 'like',
      targetType: 'comment',
      targetId: commentId,
    });

    return {
      success: true,
      data: { liked: true },
      message: '点赞成功',
    };
  } catch (error) {
    logger.error('toggleCommentLike error:', error);
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
 * @param {string} options.keyword - 搜索关键词（内容搜索�?
 * @param {string} options.sortBy - 排序方式: 'time'|'likes'
 * @returns {Promise<Array>} 搜索结果
 */
export const searchPosts = async (options = {}) => {
  try {
    const { user, profile } = await getOptionalUserAndProfile('role');
    if (!user || !profile) {
      throw new Error('用户未登录或认证失败');
    }

    const keyword = options.keyword ? options.keyword.trim() : '';
    const sortBy = options.sortBy === 'likes' ? 'likes' : 'time';

    // 1. 搜索条件
    const orConditions = [];
    if (keyword) {
      orConditions.push(`title.ilike.%${keyword}%`);
      orConditions.push(`content.ilike.%${keyword}%`);
    }

    // 2. 构建查询
    let query = supabase
      .from('posts')
      .select(POST_LIST_SELECT_FIELDS)
      .order('created_at', { ascending: false });

    if (orConditions.length > 0) {
      query = query.or(orConditions.join(','));
    }

    const { data: posts, error: postsError } = await query;

    if (postsError) {
      throw new Error(`搜索失败: ${postsError.message}`);
    }

    const postIds = (posts || []).map((post) => post.id);
    const likedPostIds = await fetchLikedPostIds(user.id, postIds, { strict: true });

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
    logger.error('searchPosts error:', error);
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

    const mediaUrls = Array.isArray(post.media_urls) ? post.media_urls : [];
    const storagePaths = mediaUrls
      .map((url) => extractPostMediaStoragePath(url))
      .filter((path) => Boolean(path));

    if (storagePaths.length > 0) {
      const { error: storageError } = await supabase.storage
        .from('post-media')
        .remove(storagePaths);

      if (storageError) {
        try {
          await supabase.from('content_reports').insert({
            reporter_id: user.id,
            target_type: 'post',
            target_id: postId,
            reason: '删除帖子媒体失败',
            suggestion: `存储删除失败：${storageError.message}`,
            status: 'pending',
            admin_note: null,
          });
        } catch (ticketError) {
          logger.error('create content report error:', ticketError);
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
    logger.error('deletePost error:', error);
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
    logger.error('deleteComment error:', error);
    return {
      success: false,
      error: error.message,
      data: null,
    };
  }
};

