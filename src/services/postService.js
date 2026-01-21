import supabase from '../lib/supabase';

/**
 * 创建新帖子
 * @param {Object} postData - 帖子数据
 * @param {string} postData.content - 帖子内容（必须）
 * @param {string[]} postData.media_urls - 图片/视频链接数组（可选）
 * @param {string} postData.visibility - 可见范围: 'private'|'classmate_only'|'alumni_only'|'public'（默认：'public'）
 * @param {boolean} postData.is_anonymous - 是否匿名发布（默认：false）
 * @param {string[]} postData.hashtags - 标签数组（可选）
 * @param {string[]} postData.selectedAlbumPhotos - 从相册选择的图片ID数组（可选）
 * @returns {Promise<Object>} 创建的帖子或错误信息
 */
export const createPost = async (postData) => {
  try {
    // 1. 获取当前登录用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('用户未登录或认证失败');
    }

    // 2. 获取用户身份信息
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('identity_type, role')
      .eq('id', user.id)
      .single();

    if (profileError) {
      throw new Error('获取用户信息失败');
    }

    // 3. 检查发布权限（仅本班同学和校友可以发布）
    const canCreatePost = profile.identity_type === 'classmate' || 
                         profile.identity_type === 'alumni' ||
                         profile.role === 'admin' || 
                         profile.role === 'superuser';
    
    if (!canCreatePost) {
      throw new Error('游客不能发布帖子，请联系管理员升级为校友');
    }

    // 4. 验证必填字段
    if (!postData.content || postData.content.trim() === '') {
      throw new Error('帖子内容不能为空');
    }

    // 5. 准备插入数据
    const postPayload = {
      author_id: user.id,
      content: postData.content.trim(),
      visibility: postData.visibility || 'public',
      is_anonymous: postData.is_anonymous || false,
      created_at: new Date().toISOString(),
      view_count: 0
    };

    // 6. 处理媒体文件
    if (postData.media_urls && Array.isArray(postData.media_urls)) {
      postPayload.media_urls = postData.media_urls;
    }

    // 7. 处理从相册选择的图片（如果有）
    let finalMediaUrls = [...(postData.media_urls || [])];
    if (postData.selectedAlbumPhotos && postData.selectedAlbumPhotos.length > 0) {
      // 查询相册图片的URL
      const { data: albumPhotos, error: albumError } = await supabase
        .from('album_photos')
        .select('url')
        .in('id', postData.selectedAlbumPhotos);

      if (!albumError && albumPhotos) {
        const albumUrls = albumPhotos.map(photo => photo.url);
        finalMediaUrls = [...finalMediaUrls, ...albumUrls];
      }
    }

    if (finalMediaUrls.length > 0) {
      postPayload.media_urls = finalMediaUrls;
    }

    // 8. 插入帖子到数据库
    const { data: createdPost, error: insertError } = await supabase
      .from('posts')
      .insert(postPayload)
      .select(`
        *,
        author:profiles!posts_author_id_fkey(
          nickname,
          avatar_url,
          identity_type
        )
      `)
      .single();

    if (insertError) {
      throw new Error(`创建帖子失败: ${insertError.message}`);
    }

    // 9. 处理Hashtag（如果有）
    if (postData.hashtags && postData.hashtags.length > 0) {
      await processHashtags(createdPost.id, postData.hashtags);
    }

    // 10. 返回创建的帖子（处理匿名）
    const responsePost = { ...createdPost };
    
    if (responsePost.is_anonymous && 
        profile.role !== 'admin' && 
        profile.role !== 'superuser') {
      // 对非管理员隐藏作者信息
      delete responsePost.author_id;
      if (responsePost.author) {
        responsePost.author = {
          is_anonymous: true,
          nickname: '匿名用户',
          avatar_url: null
        };
      }
    }

    return {
      success: true,
      data: responsePost,
      message: '帖子创建成功'
    };

  } catch (error) {
    console.error('createPost error:', error);
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

/**
 * 处理帖子的Hashtag标签
 * @param {string} postId - 帖子ID
 * @param {string[]} hashtags - 标签数组
 */
const processHashtags = async (postId, hashtags) => {
  try {
    for (const tagName of hashtags) {
      // 清理标签（移除#，去空格，转小写）
      const cleanTag = tagName.replace('#', '').trim().toLowerCase();
      if (!cleanTag) continue;

      // 1. 查找或创建标签
      let tagId;
      const { data: existingTag } = await supabase
        .from('hashtags')
        .select('id, usage_count')
        .eq('name', cleanTag)
        .single();

      if (existingTag) {
        // 更新使用次数
        tagId = existingTag.id;
        await supabase
          .from('hashtags')
          .update({ 
            usage_count: existingTag.usage_count + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', tagId);
      } else {
        // 创建新标签
        const { data: newTag } = await supabase
          .from('hashtags')
          .insert({
            name: cleanTag,
            usage_count: 1,
            created_at: new Date().toISOString()
          })
          .select('id')
          .single();
        
        tagId = newTag.id;
      }

      // 2. 关联帖子与标签
      await supabase
        .from('post_tags')
        .insert({
          post_id: postId,
          tag_id: tagId,
          created_at: new Date().toISOString()
        });
    }
  } catch (error) {
    console.error('处理Hashtag失败:', error);
    // 不影响主流程
  }
};



