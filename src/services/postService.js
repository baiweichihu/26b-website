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

    if (profileError || !profile) {
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



/**
 * 获取帖子列表（一次性加载全部可见帖子）
 * @returns {Promise<Object>} 帖子列表或错误信息
 */
export const getPosts = async () => {
  try {
    // 1. 获取当前登录用户
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('用户未登录或认证失败');
    }

    // 2. 获取用户身份信息
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('identity_type, role, nickname, avatar_url')
      .eq('id', user.id)
      .single();

    if (profileError || !profile) {
      throw new Error('获取用户信息失败');
    }

    // 3. 根据用户身份确定可见范围条件
    let visibilityCondition = '';
    const userRole = profile.role;
    const userIdentity = profile.identity_type;
    
    // 管理员和superuser可以看到所有帖子
    if (userRole === 'admin' || userRole === 'superuser') {
      visibilityCondition = ''; // 不需要筛选
    } else {
      // 普通用户根据身份筛选可见性
      switch (userIdentity) {
        case 'classmate':
          // 本班同学可以看到：public, alumni_only, classmate_only
          visibilityCondition = `visibility IN ('public', 'alumni_only', 'classmate_only')`;
          break;
        case 'alumni':
          // 校友可以看到：public, alumni_only
          visibilityCondition = `visibility IN ('public', 'alumni_only')`;
          break;
        case 'guest':
        default:
          // 游客只能看到：public
          visibilityCondition = `visibility = 'public'`;
          break;
      }
    }

    // 4. 构建查询：获取帖子列表 + 统计信息 + 作者信息
    let query = supabase
      .from('posts')
      .select(`
        id,
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
      `)
      .order('created_at', { ascending: false });

    // 5. 应用可见性筛选条件（如果不是管理员）
    if (visibilityCondition) {
      query = query.or(visibilityCondition);
    }

    // 6. 执行查询
    const { data: posts, error: postsError } = await query;

    if (postsError) {
      throw new Error(`获取帖子列表失败: ${postsError.message}`);
    }

    // 7. 处理数据：格式化统计信息，处理匿名帖子
    const processedPosts = posts.map(post => {
      // 基础帖子信息
      const processedPost = {
        id: post.id,
        content: post.content,
        media_urls: post.media_urls || [],
        visibility: post.visibility,
        is_anonymous: post.is_anonymous,
        view_count: post.view_count || 0,
        created_at: post.created_at,
        like_count: post.post_likes?.[0]?.count || 0,
        comment_count: post.comments?.[0]?.count || 0
      };

      // 处理作者信息
      if (post.is_anonymous) {
        // 匿名帖子：对非管理员隐藏真实作者信息
        if (userRole === 'admin' || userRole === 'superuser') {
          // 管理员可以看到真实作者
          processedPost.author = {
            id: post.author_id,
            nickname: post.author?.nickname || '未知用户',
            avatar_url: post.author?.avatar_url,
            is_anonymous: false,
            is_real_author: true // 标记这是真实作者（仅管理员可见）
          };
        } else {
          // 普通用户看到匿名信息
          processedPost.author = {
            id: null,
            nickname: '匿名用户',
            avatar_url: null, // 可以使用默认匿名头像URL
            is_anonymous: true,
            is_real_author: false
          };
        }
      } else {
        // 非匿名帖子：显示真实作者
        processedPost.author = {
          id: post.author_id,
          nickname: post.author?.nickname || '未知用户',
          avatar_url: post.author?.avatar_url,
          is_anonymous: false,
          is_real_author: true
        };
      }

      // 移除原始数据中的冗余字段
      delete processedPost.author_id;
      delete processedPost.post_likes;
      delete processedPost.comments;

      return processedPost;
    });

    // 8. 返回结果
    return {
      success: true,
      data: processedPosts,
      message: `成功获取 ${processedPosts.length} 条帖子`,
      user_info: {
        identity_type: userIdentity,
        role: userRole,
        nickname: profile.nickname
      }
    };

  } catch (error) {
    console.error('getPosts error:', error);
    return {
      success: false,
      error: error.message,
      data: [],
      user_info: null
    };
  }
};

/**
 * 获取单个帖子的详细信息（包含评论列表）
 * @param {string} postId - 帖子ID
 * @returns {Promise<Object>} 帖子详情或错误信息
 */
export const getPostById = async (postId) => {
  try {
    if (!postId) {
      throw new Error('帖子ID不能为空');
    }

    // 1. 获取当前登录用户（用于权限检查）
    console.log('[getPostById] 获取用户信息...');
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    console.log('[getPostById] 用户信息:', { user, authError });
    if (authError || !user) {
      throw new Error('用户未登录或认证失败');
    }

    // 2. 获取用户身份信息
    console.log('[getPostById] 查询 profiles 表...');
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('identity_type, role')
      .eq('id', user.id)
      .single();

    console.log('[getPostById] 用户身份信息:', { profile, profileError });

    if (profileError || !profile) {
      throw new Error('获取用户信息失败');
    }

    console.log('[getPostById] 用户角色和身份:', {
      role: profile.role,
      identity: profile.identity_type
    });

    // 3. 获取帖子详情
    console.log('[getPostById] 查询帖子...');
    const { data: post, error: postError } = await supabase
      .from('posts')
      .select(`
        *,
        author:profiles!posts_author_id_fkey(
          nickname,
          avatar_url,
          identity_type,
          bio
        ),
        post_likes:post_likes(count),
        comments:comments(count),
        hashtags:hashtags(name)
      `)
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
    const userIdentity = profile.identity_type;
    let hasPermission = false;

    // 管理员和superuser有所有权限
    if (userRole === 'admin' || userRole === 'superuser') {
      hasPermission = true;
    } else {
      // 根据帖子的可见性和用户身份检查权限
      switch (post.visibility) {
        case 'public':
          hasPermission = true; // 所有人都可以看
          break;
        case 'alumni_only':
          hasPermission = userIdentity === 'alumni' || userIdentity === 'classmate';
          break;
        case 'classmate_only':
          hasPermission = userIdentity === 'classmate';
          break;
        case 'private':
          hasPermission = post.author_id === user.id; // 仅自己可见
          break;
        default:
          hasPermission = false;
      }
    }

    if (!hasPermission) {
      throw new Error('您没有权限查看此帖子');
    }

    // 5. 增加浏览量（如果是第一次查看）
    if (user.id !== post.author_id) { // 不增加作者自己的浏览量
      await supabase
        .from('posts')
        .update({ view_count: (post.view_count || 0) + 1 })
        .eq('id', postId);
      post.view_count = (post.view_count || 0) + 1;
    }

    // 6. 处理匿名帖子的作者信息
    const processedPost = { ...post };
    
    if (post.is_anonymous) {
      if (userRole === 'admin' || userRole === 'superuser') {
        // 管理员可以看到真实作者，但标记为匿名
        processedPost.author = {
          ...post.author,
          is_anonymous: true,
          is_real_author: true,
          display_nickname: post.author?.nickname || '未知用户'
        };
      } else {
        // 普通用户看到匿名信息
        processedPost.author = {
          nickname: '匿名用户',
          avatar_url: null,
          is_anonymous: true,
          is_real_author: false,
          display_nickname: '匿名用户'
        };
      }
    } else {
      // 非匿名帖子
      processedPost.author = {
        ...post.author,
        is_anonymous: false,
        is_real_author: true,
        display_nickname: post.author?.nickname || '未知用户'
      };
    }

    // 7. 格式化统计信息
    processedPost.like_count = post.post_likes?.[0]?.count || 0;
    processedPost.comment_count = post.comments?.[0]?.count || 0;
    processedPost.hashtags = post.hashtags?.map(tag => tag.name) || [];

    // 8. 移除原始数据中的冗余字段
    delete processedPost.post_likes;
    delete processedPost.comments;
    delete processedPost.author_id;

    return {
      success: true,
      data: processedPost,
      message: '获取帖子详情成功'
    };

  } catch (error) {
    console.error('[getPostById] 错误详情:', {
      message: error.message,
      stack: error.stack
    });
    return {
      success: false,
      error: error.message,
      data: null
    };
  }
};

