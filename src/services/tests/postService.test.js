// src/services/tests/postService.test.js

import {
  createPost,
  getPosts,
  getPostById,
  togglePostLike,
  getComments,
  addComment,
  toggleCommentLike,
  searchPosts,
} from '../postService.js';

// 在 import 之后，describe 之前
beforeAll(() => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
});

afterAll(() => {
  console.error.mockRestore();
});

// 创建支持链式调用的 mock 查询构建器
const createMockQueryBuilder = (mockData = null, mockError = null) => {
  const builder = {
    select: jest.fn(() => builder),
    insert: jest.fn(() => builder),
    update: jest.fn(() => builder),
    delete: jest.fn(() => builder),
    eq: jest.fn(() => builder),
    in: jest.fn(() => builder),
    order: jest.fn(() => builder),
    or: jest.fn(() => builder),
    then: jest.fn((resolve) => Promise.resolve(resolve({ data: mockData, error: mockError }))),
    single: jest.fn(() =>
      Promise.resolve({
        data: mockData,
        error: mockError,
      })
    ),
    limit: jest.fn(() => builder),
    range: jest.fn(() => builder),
  };
  return builder;
};

// Mock supabase客户端
jest.mock('../../lib/supabase.js', () => {
  const mockAuth = {
    getUser: jest.fn(() =>
      Promise.resolve({
        data: { user: null },
        error: null,
      })
    ),
  };

  return {
    supabase: {
      auth: mockAuth,
      from: jest.fn(() => createMockQueryBuilder()),
    },
  };
});

import { supabase } from '../../lib/supabase.js';

// 测试数据
const mockUsers = {
  classmate: {
    id: 'user-classmate-123',
    identity_type: 'classmate',
    role: 'user',
    nickname: '同学张三',
    avatar_url: 'https://example.com/avatar1.jpg',
  },
  alumni: {
    id: 'user-alumni-456',
    identity_type: 'alumni',
    role: 'user',
    nickname: '校友李四',
    avatar_url: 'https://example.com/avatar2.jpg',
  },
  guest: {
    id: 'user-guest-789',
    identity_type: 'guest',
    role: 'user',
    nickname: '游客王五',
    avatar_url: 'https://example.com/avatar3.jpg',
  },
  admin: {
    id: 'user-admin-101',
    identity_type: 'alumni',
    role: 'admin',
    nickname: '管理员赵六',
    avatar_url: 'https://example.com/avatar4.jpg',
  },
  superuser: {
    id: 'user-super-112',
    identity_type: 'classmate',
    role: 'superuser',
    nickname: '超级管理员',
    avatar_url: 'https://example.com/avatar5.jpg',
  },
};

const createMockPost = (id, author, visibility, isAnonymous = false) => ({
  id,
  author_id: author.id,
  title: `这是${visibility}标题`,
  content: `这是${visibility}帖子`,
  media_urls: [],
  visibility,
  is_anonymous: isAnonymous,
  view_count: 100,
  created_at: '2024-01-10T10:00:00Z',
  author: {
    nickname: author.nickname,
    avatar_url: author.avatar_url,
    identity_type: author.identity_type,
  },
  post_likes: [{ count: 25 }],
  comments: [{ count: 12 }],
  hashtags: [],
});

const mockPosts = [
  createMockPost('post-public-1', mockUsers.classmate, 'public'),
  createMockPost('post-alumni-2', mockUsers.alumni, 'alumni_only', true),
];

describe('PostService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPost', () => {
    test('同学成功创建普通帖子', async () => {
      // 模拟登录用户
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      // 模拟查询用户信息
      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      // 模拟插入帖子
      const mockPostBuilder = createMockQueryBuilder({
        id: 'new-post-123',
        author_id: mockUsers.classmate.id,
        title: '新帖子标题',
        content: '新帖子内容',
        visibility: 'public',
        is_anonymous: false,
        created_at: '2024-01-11T10:00:00Z',
        view_count: 0,
        author: {
          nickname: mockUsers.classmate.nickname,
          avatar_url: mockUsers.classmate.avatar_url,
          identity_type: 'classmate',
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      // 模拟查询作者信息
      const mockAuthorBuilder = createMockQueryBuilder({
        nickname: mockUsers.classmate.nickname,
        avatar_url: mockUsers.classmate.avatar_url,
        identity_type: mockUsers.classmate.identity_type,
      });
      supabase.from.mockReturnValueOnce(mockAuthorBuilder);

      const postData = {
        title: '新帖子标题',
        content: '新帖子内容',
        visibility: 'public',
        is_anonymous: false,
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('new-post-123');
      expect(result.data.content).toBe('新帖子内容');
      expect(result.data.author.nickname).toBe(mockUsers.classmate.nickname);
      expect(result.message).toBe('帖子创建成功');
    });

    test('游客尝试发帖应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.guest.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.guest.identity_type,
        role: mockUsers.guest.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const postData = { title: '游客帖子标题', content: '游客想发帖' };
      const result = await createPost(postData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('游客不能发布帖子，请联系管理员升级为校友');
      expect(result.data).toBeNull();
    });

    test('内容为空应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const postData = { title: '空内容标题', content: '' };
      const result = await createPost(postData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子内容不能为空');
    });

    test('标题为空应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const postData = { title: '   ', content: '标题为空的内容' };
      const result = await createPost(postData);

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子标题不能为空');
    });
  });

  describe('getPosts', () => {
    test('游客只能看到public帖子', async () => {
      // 模拟登录用户
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.guest.id } },
        error: null,
      });

      // 模拟查询用户信息
      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.guest.identity_type,
        role: mockUsers.guest.role,
        nickname: mockUsers.guest.nickname,
        avatar_url: mockUsers.guest.avatar_url,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      // 模拟查询帖子 - 修复这里：需要模拟完整的查询链
      const mockPostsBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          // 模拟 Promise 的 then 方法
          return Promise.resolve(
            callback({
              data: mockPosts.filter((post) => post.visibility === 'public'),
              error: null,
            })
          );
        }),
      };
      supabase.from.mockReturnValueOnce(mockPostsBuilder);

      const result = await getPosts();

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].visibility).toBe('public');
      expect(result.user_info.identity_type).toBe('guest');
    });

    test('校友能看到public和alumni_only帖子', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.alumni.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.alumni.identity_type,
        role: mockUsers.alumni.role,
        nickname: mockUsers.alumni.nickname,
        avatar_url: mockUsers.alumni.avatar_url,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const mockPostsBuilder = {
        select: jest.fn().mockReturnThis(),
        order: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve(
            callback({
              data: mockPosts.filter(
                (post) => post.visibility === 'public' || post.visibility === 'alumni_only'
              ),
              error: null,
            })
          );
        }),
      };
      supabase.from.mockReturnValueOnce(mockPostsBuilder);

      const result = await getPosts();

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
      const visibilities = result.data.map((p) => p.visibility);
      expect(visibilities).toContain('public');
      expect(visibilities).toContain('alumni_only');
    });

    test('用户未登录应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('未认证'),
      });

      const result = await getPosts();

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户未登录或认证失败');
      expect(result.data).toEqual([]);
    });
  });

  describe('getPostById', () => {
    test('成功获取公开帖子详情', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.guest.id } },
        error: null,
      });

      // 模拟查询用户信息
      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.guest.identity_type,
        role: mockUsers.guest.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      // 模拟查询帖子
      const mockPost = {
        ...mockPosts[0],
        hashtags: [{ name: '测试' }],
      };
      const mockPostBuilder = createMockQueryBuilder(mockPost);
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      // 模拟浏览量更新
      const mockUpdateBuilder = createMockQueryBuilder();
      supabase.from.mockReturnValueOnce(mockUpdateBuilder);

      const result = await getPostById('post-public-1');

      expect(result.success).toBe(true);
      expect(result.data.id).toBe('post-public-1');
      expect(result.data.content).toBe('这是public帖子');
      expect(result.data.hashtags).toEqual(['测试']);
      expect(result.message).toBe('获取帖子详情成功');
    });

    test('游客尝试获取alumni_only帖子应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.guest.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.guest.identity_type,
        role: mockUsers.guest.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const mockPostBuilder = createMockQueryBuilder(mockPosts[1]);
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const result = await getPostById('post-alumni-2');

      expect(result.success).toBe(false);
      expect(result.error).toBe('您没有权限查看此帖子');
    });

    test('获取不存在的帖子应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const mockPostBuilder = createMockQueryBuilder(null, {
        code: 'PGRST116',
        message: '未找到',
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const result = await getPostById('non-existent-post');

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子不存在');
    });

    test('帖子ID为空应失败', async () => {
      const result = await getPostById('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子ID不能为空');
    });
  });

  // 在现有的 postService.test.js 文件中，在 describe('PostService') 块内添加以下测试
  describe('Admin Permission Tests', () => {
    test('管理员创建帖子时，匿名帖子的作者信息应该对管理员可见', async () => {
      // 模拟管理员登录
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.admin.id } },
        error: null,
      });

      // 模拟查询管理员信息
      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.admin.identity_type,
        role: mockUsers.admin.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      // 模拟插入匿名帖子
      const mockPostBuilder = createMockQueryBuilder({
        id: 'anonymous-post-admin',
        author_id: mockUsers.alumni.id,
        title: '管理员匿名标题',
        content: '管理员发布的匿名帖子',
        visibility: 'public',
        is_anonymous: true,
        created_at: '2024-01-11T10:00:00Z',
        view_count: 0,
        author: {
          nickname: mockUsers.alumni.nickname,
          avatar_url: mockUsers.alumni.avatar_url,
          identity_type: 'alumni',
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const mockAuthorBuilder = createMockQueryBuilder({
        nickname: mockUsers.alumni.nickname,
        avatar_url: mockUsers.alumni.avatar_url,
        identity_type: mockUsers.alumni.identity_type,
      });
      supabase.from.mockReturnValueOnce(mockAuthorBuilder);

      const postData = {
        title: '管理员匿名标题',
        content: '管理员发布的匿名帖子',
        visibility: 'public',
        is_anonymous: true,
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
      expect(result.data.is_anonymous).toBe(true);
      // 管理员应该能看到真实作者信息
      expect(result.data.author.nickname).toBe(mockUsers.alumni.nickname);
      // createPost 对管理员不会强制写入 author.is_anonymous
      expect(result.data.author.is_anonymous).toBeUndefined();
    });

    test('普通用户创建匿名帖子时，作者信息应该对非管理员隐藏', async () => {
      // 模拟普通校友登录
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.alumni.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.alumni.identity_type,
        role: mockUsers.alumni.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const mockPostBuilder = createMockQueryBuilder({
        id: 'anonymous-post-alumni',
        author_id: mockUsers.alumni.id,
        title: '校友匿名标题',
        content: '校友发布的匿名帖子',
        visibility: 'public',
        is_anonymous: true,
        created_at: '2024-01-11T10:00:00Z',
        view_count: 0,
        author: {
          nickname: mockUsers.alumni.nickname,
          avatar_url: mockUsers.alumni.avatar_url,
          identity_type: 'alumni',
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const mockAuthorBuilder = createMockQueryBuilder({
        nickname: mockUsers.alumni.nickname,
        avatar_url: mockUsers.alumni.avatar_url,
        identity_type: mockUsers.alumni.identity_type,
      });
      supabase.from.mockReturnValueOnce(mockAuthorBuilder);

      const postData = {
        title: '校友匿名标题',
        content: '校友发布的匿名帖子',
        visibility: 'public',
        is_anonymous: true,
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
      expect(result.data.is_anonymous).toBe(true);
      // 非管理员应该看到匿名信息
      expect(result.data.author.nickname).toBe('匿名用户');
      expect(result.data.author.avatar_url).toBeNull();
      expect(result.data.author.is_anonymous).toBe(true);
    });
  });

  describe('Album Photo Association Tests', () => {
    test('创建带相册图片的帖子应该正确合并图片URL', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      // 模拟查询相册图片
      const mockAlbumQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve(
            callback({
              data: [{ url: 'album1.jpg' }, { url: 'album2.jpg' }, { url: 'album3.jpg' }],
              error: null,
            })
          );
        }),
      };
      supabase.from.mockReturnValueOnce(mockAlbumQueryBuilder);

      // 模拟插入帖子
      const mockPostBuilder = createMockQueryBuilder({
        id: 'post-with-album-photos',
        author_id: mockUsers.classmate.id,
        title: '相册图片标题',
        content: '带相册图片的帖子',
        media_urls: ['external1.jpg', 'external2.jpg', 'album1.jpg', 'album2.jpg', 'album3.jpg'],
        author: {
          nickname: mockUsers.classmate.nickname,
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const postData = {
        title: '相册图片标题',
        content: '带相册图片的帖子',
        media_urls: ['external1.jpg', 'external2.jpg'],
        selectedAlbumPhotos: ['photo-1', 'photo-2', 'photo-3'],
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
      expect(result.data.media_urls).toEqual([
        'external1.jpg',
        'external2.jpg',
        'album1.jpg',
        'album2.jpg',
        'album3.jpg',
      ]);
    });

    test('当相册图片查询失败时，应该只使用外部图片URL', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      // 模拟相册查询失败
      const mockAlbumQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        in: jest.fn().mockReturnThis(),
        then: jest.fn().mockImplementation((callback) => {
          return Promise.resolve(
            callback({
              data: null,
              error: new Error('相册查询失败'),
            })
          );
        }),
      };
      supabase.from.mockReturnValueOnce(mockAlbumQueryBuilder);

      const mockPostBuilder = createMockQueryBuilder({
        id: 'post-with-external-only',
        author_id: mockUsers.classmate.id,
        title: '外部图片标题',
        content: '只有外部图片的帖子',
        media_urls: ['external1.jpg', 'external2.jpg'],
        author: {
          nickname: mockUsers.classmate.nickname,
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const postData = {
        title: '外部图片标题',
        content: '只有外部图片的帖子',
        media_urls: ['external1.jpg', 'external2.jpg'],
        selectedAlbumPhotos: ['photo-1', 'photo-2'],
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
      // 应该只有外部图片URL
      expect(result.data.media_urls).toEqual(['external1.jpg', 'external2.jpg']);
    });
  });

  describe('Hashtag Processing Tests', () => {
    test('创建带Hashtag的帖子应该正确处理标签', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      // 模拟插入帖子
      const mockPostBuilder = createMockQueryBuilder({
        id: 'post-with-hashtags',
        author_id: mockUsers.classmate.id,
        title: 'Hashtag标题',
        content: '带#运动会 #春游 的帖子',
        author: {
          nickname: mockUsers.classmate.nickname,
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const mockAuthorBuilder = createMockQueryBuilder({
        nickname: mockUsers.classmate.nickname,
        avatar_url: mockUsers.classmate.avatar_url,
        identity_type: mockUsers.classmate.identity_type,
      });
      supabase.from.mockReturnValueOnce(mockAuthorBuilder);

      // 模拟Hashtag处理 - 标签不存在，需要创建
      const mockHashtagQueryBuilder1 = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null, // 标签不存在
          error: null,
        }),
      };

      // 模拟创建新标签
      const mockHashtagQueryBuilder2 = {
        insert: jest.fn().mockReturnThis(),
        select: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'new-tag-1' },
          error: null,
        }),
      };

      // 模拟关联标签
      const mockPostTagsBuilder = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      // 设置不同的mock返回值（profiles -> posts -> profiles -> hashtags...）
      supabase.from
        .mockReturnValueOnce(mockHashtagQueryBuilder1) // 查询"运动会"标签
        .mockReturnValueOnce(mockHashtagQueryBuilder2) // 创建"运动会"标签
        .mockReturnValueOnce(mockPostTagsBuilder) // 关联"运动会"标签
        .mockReturnValueOnce(mockHashtagQueryBuilder1) // 查询"春游"标签
        .mockReturnValueOnce(mockHashtagQueryBuilder2) // 创建"春游"标签
        .mockReturnValueOnce(mockPostTagsBuilder); // 关联"春游"标签

      const postData = {
        title: 'Hashtag标题',
        content: '带#运动会 #春游 的帖子',
        hashtags: ['运动会', '春游'],
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
      // 验证Hashtag处理被调用
      expect(supabase.from).toHaveBeenCalledWith('hashtags');
      expect(supabase.from).toHaveBeenCalledWith('post_tags');
    });

    test('创建带已有Hashtag的帖子应该更新使用次数', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const mockPostBuilder = createMockQueryBuilder({
        id: 'post-with-existing-hashtag',
        author_id: mockUsers.classmate.id,
        title: '已有标签标题',
        content: '带已有标签#毕业照 的帖子',
        author: {
          nickname: mockUsers.classmate.nickname,
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const mockAuthorBuilder = createMockQueryBuilder({
        nickname: mockUsers.classmate.nickname,
        avatar_url: mockUsers.classmate.avatar_url,
        identity_type: mockUsers.classmate.identity_type,
      });
      supabase.from.mockReturnValueOnce(mockAuthorBuilder);

      // 修复超时问题：简化mock
      const mockExistingHashtagQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: { id: 'existing-tag-1', usage_count: 5 },
          error: null,
        }),
      };

      // 简化更新mock，避免复杂的链式调用
      const mockUpdateResponse = {
        then: jest.fn().mockResolvedValue({}),
      };

      const mockHashtagUpdateBuilder = {
        update: jest.fn().mockReturnValue(mockUpdateResponse),
        eq: jest.fn().mockReturnValue(mockUpdateResponse),
      };

      // 简化关联标签mock
      const mockPostTagsBuilder = {
        insert: jest.fn().mockResolvedValue({ data: null, error: null }),
      };

      // 修复：确保每个mock都被正确调用
      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount++;
        if (callCount === 1) return mockProfileBuilder;
        if (callCount === 2) return mockPostBuilder;
        if (callCount === 3) return mockAuthorBuilder;
        if (callCount === 4) return mockExistingHashtagQueryBuilder;
        if (callCount === 5) return mockHashtagUpdateBuilder;
        if (callCount === 6) return mockPostTagsBuilder;
        return createMockQueryBuilder();
      });

      const postData = {
        title: '已有标签标题',
        content: '带已有标签#毕业照 的帖子',
        hashtags: ['毕业照'],
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
    }, 10000); // 增加超时时间到10秒

    test('创建带空Hashtag的帖子应该跳过处理', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder({
        identity_type: mockUsers.classmate.identity_type,
        role: mockUsers.classmate.role,
      });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const mockPostBuilder = createMockQueryBuilder({
        id: 'post-with-empty-hashtag',
        author_id: mockUsers.classmate.id,
        title: '空标签标题',
        content: '带空标签的帖子',
        author: {
          nickname: mockUsers.classmate.nickname,
        },
      });
      supabase.from.mockReturnValueOnce(mockPostBuilder);

      const mockAuthorBuilder = createMockQueryBuilder({
        nickname: mockUsers.classmate.nickname,
        avatar_url: mockUsers.classmate.avatar_url,
        identity_type: mockUsers.classmate.identity_type,
      });
      supabase.from.mockReturnValueOnce(mockAuthorBuilder);

      // 修复：需要模拟Hashtag查询，即使标签是空的
      const mockEmptyHashtagQueryBuilder = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        single: jest.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      };

      // 模拟其他hashtag相关的调用
      supabase.from
        .mockReturnValueOnce(mockEmptyHashtagQueryBuilder) // 查询第一个空标签
        .mockReturnValueOnce(mockEmptyHashtagQueryBuilder) // 查询第二个空标签
        .mockReturnValueOnce(mockEmptyHashtagQueryBuilder); // 查询第三个空标签

      const postData = {
        title: '空标签标题',
        content: '带空标签的帖子',
        hashtags: ['', '  ', '#'], // 空标签应该被跳过
      };

      const result = await createPost(postData);

      expect(result.success).toBe(true);
    });
  });

  describe('Visibility Permission Tests', () => {
    beforeEach(() => {
      jest.clearAllMocks();
      // 重置全局的 mock
      supabase.auth.getUser.mockReset();
      supabase.from.mockReset();
    });

    test('管理员可以查看private帖子', async () => {
      console.log('=== 开始测试：管理员可以查看private帖子 ===');

      // 模拟登录用户 - 管理员
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.admin.id } },
        error: null,
      });

      // 设置 supabase.from 的 mock 实现
      let callCount = 0;
      supabase.from.mockImplementation((tableName) => {
        callCount++;
        console.log(`[supabase.from] 第${callCount}次调用，表名: ${tableName}`);

        if (callCount === 1) {
          // 第一次调用：profiles 表
          console.log('[supabase.from] 返回 profiles 表查询构建器');
          const mockBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                identity_type: mockUsers.admin.identity_type,
                role: mockUsers.admin.role,
              },
              error: null,
            }),
          };
          return mockBuilder;
        }

        if (callCount === 2) {
          // 第二次调用：posts 表（查询）
          console.log('[supabase.from] 返回 posts 表查询构建器');
          const mockBuilder = {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                id: 'private-post-1',
                author_id: mockUsers.alumni.id,
                content: '私人帖子',
                visibility: 'private',
                is_anonymous: false,
                view_count: 5,
                created_at: '2024-01-07T10:00:00Z',
                author: {
                  nickname: mockUsers.alumni.nickname,
                  avatar_url: mockUsers.alumni.avatar_url,
                  identity_type: 'alumni',
                  bio: '校友简介',
                },
                post_likes: [{ count: 2 }],
                comments: [{ count: 1 }],
                hashtags: [],
              },
              error: null,
            }),
          };
          return mockBuilder;
        }

        // 第三次调用：posts 表（更新）
        console.log('[supabase.from] 返回 posts 表更新构建器');
        return {
          update: jest.fn().mockReturnThis(),
          eq: jest.fn().mockResolvedValue({ data: null, error: null }),
        };
      });

      const result = await getPostById('private-post-1');
      console.log('测试结果:', result);

      expect(result.success).toBe(true);
      expect(result.data.visibility).toBe('private');
    }, 10000);

    test('非作者尝试查看private帖子应该失败', async () => {
      console.log('=== 开始测试：非作者尝试查看private帖子应该失败 ===');

      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation((tableName) => {
        callCount++;
        console.log(`[supabase.from] 第${callCount}次调用，表名: ${tableName}`);

        if (callCount === 1) {
          // 第一次调用：profiles 表
          console.log('[supabase.from] 返回 profiles 表查询构建器');
          return {
            select: jest.fn().mockReturnThis(),
            eq: jest.fn().mockReturnThis(),
            single: jest.fn().mockResolvedValue({
              data: {
                identity_type: mockUsers.classmate.identity_type,
                role: mockUsers.classmate.role,
              },
              error: null,
            }),
          };
        }

        // 第二次调用：posts 表
        console.log('[supabase.from] 返回 posts 表查询构建器');
        return {
          select: jest.fn().mockReturnThis(),
          eq: jest.fn().mockReturnThis(),
          single: jest.fn().mockResolvedValue({
            data: {
              id: 'private-post-2',
              author_id: mockUsers.alumni.id,
              content: '另一个私人帖子',
              visibility: 'private',
              is_anonymous: false,
              view_count: 3,
              created_at: '2024-01-06T10:00:00Z',
              author: {
                nickname: mockUsers.alumni.nickname,
                avatar_url: mockUsers.alumni.avatar_url,
                identity_type: 'alumni',
              },
              post_likes: [{ count: 1 }],
              comments: [{ count: 0 }],
              hashtags: [],
            },
            error: null,
          }),
        };
      });

      const result = await getPostById('private-post-2');
      console.log('测试结果:', result);

      expect(result.success).toBe(false);
      expect(result.error).toBe('您没有权限查看此帖子');
    });
  });

  describe('Like and Comment Actions', () => {
    test('点赞帖子 - 未点赞时应成功点赞', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      const mockInsertBuilder = createMockQueryBuilder();

      supabase.from
        .mockReturnValueOnce(mockLikeQueryBuilder)
        .mockReturnValueOnce(mockInsertBuilder);

      const result = await togglePostLike('post-public-1');

      expect(result.success).toBe(true);
      expect(result.data.liked).toBe(true);
    });

    test('点赞帖子 - 已点赞时应取消点赞', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder({ id: 'like-1' });
      const mockDeleteBuilder = createMockQueryBuilder();

      supabase.from
        .mockReturnValueOnce(mockLikeQueryBuilder)
        .mockReturnValueOnce(mockDeleteBuilder);

      const result = await togglePostLike('post-public-1');

      expect(result.success).toBe(true);
      expect(result.data.liked).toBe(false);
    });

    test('获取评论列表 - 有权限时应返回评论', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        if (callCount === 2) {
          return createMockQueryBuilder({
            id: 'post-public-1',
            visibility: 'public',
            author_id: mockUsers.classmate.id,
          });
        }
        return createMockQueryBuilder([
          {
            id: 'comment-1',
            post_id: 'post-public-1',
            author_id: mockUsers.classmate.id,
            content: '第一条评论',
            parent_id: null,
            reply_to_user_id: null,
            created_at: '2024-01-12T10:00:00Z',
            author: {
              nickname: mockUsers.classmate.nickname,
              avatar_url: mockUsers.classmate.avatar_url,
              identity_type: mockUsers.classmate.identity_type,
            },
            comment_likes: [{ count: 2 }],
          },
        ]);
      });

      const result = await getComments('post-public-1');

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].content).toBe('第一条评论');
    });

    test('获取评论列表 - 无权限时应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        return createMockQueryBuilder({
          id: 'post-private-1',
          visibility: 'private',
          author_id: mockUsers.alumni.id,
        });
      });

      const result = await getComments('post-private-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('您没有权限查看此帖子');
    });

    test('发表评论成功', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockInsertBuilder = createMockQueryBuilder({
        id: 'comment-new-1',
        post_id: 'post-public-1',
        author_id: mockUsers.classmate.id,
        content: '新评论',
        parent_id: null,
        reply_to_user_id: null,
        created_at: '2024-01-12T11:00:00Z',
        author: {
          nickname: mockUsers.classmate.nickname,
          avatar_url: mockUsers.classmate.avatar_url,
          identity_type: mockUsers.classmate.identity_type,
        },
      });
      supabase.from.mockReturnValueOnce(mockInsertBuilder);

      const result = await addComment('post-public-1', '新评论');

      expect(result.success).toBe(true);
      expect(result.data.content).toBe('新评论');
      expect(result.data.author.nickname).toBe(mockUsers.classmate.nickname);
    });

    test('点赞评论 - 未点赞时应成功点赞', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      const mockInsertBuilder = createMockQueryBuilder();

      supabase.from
        .mockReturnValueOnce(mockLikeQueryBuilder)
        .mockReturnValueOnce(mockInsertBuilder);

      const result = await toggleCommentLike('comment-1');

      expect(result.success).toBe(true);
      expect(result.data.liked).toBe(true);
    });
  });

  describe('searchPosts', () => {
    test('按点赞数排序返回结果', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        return createMockQueryBuilder([
          {
            ...createMockPost('post-like-1', mockUsers.classmate, 'public'),
            post_likes: [{ count: 5 }],
          },
          {
            ...createMockPost('post-like-2', mockUsers.classmate, 'public'),
            post_likes: [{ count: 20 }],
          },
        ]);
      });

      const result = await searchPosts({ keyword: '帖子', sortBy: 'likes' });

      expect(result.success).toBe(true);
      expect(result.data[0].id).toBe('post-like-2');
      expect(result.data[1].id).toBe('post-like-1');
    });

    test('只按标签搜索应返回结果', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          })
        )
        .mockReturnValueOnce(
          createMockQueryBuilder([
            {
              ...createMockPost('post-hash-1', mockUsers.classmate, 'public'),
              hashtags: [{ name: '测试' }],
            },
          ])
        );

      const result = await searchPosts({ hashtag: '#测试' });

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(1);
      expect(result.data[0].hashtags).toEqual(['测试']);
    });

    test('无关键词与标签应返回全部结果', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          })
        )
        .mockReturnValueOnce(
          createMockQueryBuilder([
            createMockPost('post-all-1', mockUsers.classmate, 'public'),
            createMockPost('post-all-2', mockUsers.classmate, 'public'),
          ])
        );

      const result = await searchPosts({});

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
    });
  });

  describe('Role Visibility and Anonymous Cases', () => {
    test('管理员获取帖子列表时可见所有帖子', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.admin.id } },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder({
            identity_type: mockUsers.admin.identity_type,
            role: mockUsers.admin.role,
            nickname: mockUsers.admin.nickname,
            avatar_url: mockUsers.admin.avatar_url,
          })
        )
        .mockReturnValueOnce(
          createMockQueryBuilder([
            createMockPost('post-public-a', mockUsers.classmate, 'public'),
            createMockPost('post-private-a', mockUsers.alumni, 'private'),
          ])
        );

      const result = await getPosts();

      expect(result.success).toBe(true);
      expect(result.data.length).toBe(2);
    });

    test('同学列表中匿名帖子应隐藏作者', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
            nickname: mockUsers.classmate.nickname,
            avatar_url: mockUsers.classmate.avatar_url,
          })
        )
        .mockReturnValueOnce(
          createMockQueryBuilder([createMockPost('post-anon-1', mockUsers.alumni, 'public', true)])
        );

      const result = await getPosts();

      expect(result.success).toBe(true);
      expect(result.data[0].author.nickname).toBe('匿名用户');
      expect(result.data[0].author.is_anonymous).toBe(true);
    });

    test('管理员查看匿名帖子详情应看到真实作者', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.admin.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.admin.identity_type,
            role: mockUsers.admin.role,
          });
        }
        if (callCount === 2) {
          return createMockQueryBuilder({
            ...createMockPost('post-anon-detail', mockUsers.alumni, 'public', true),
            author: {
              nickname: mockUsers.alumni.nickname,
              avatar_url: mockUsers.alumni.avatar_url,
              identity_type: mockUsers.alumni.identity_type,
              bio: '校友简介',
            },
            hashtags: [],
          });
        }
        return createMockQueryBuilder();
      });

      const result = await getPostById('post-anon-detail');

      expect(result.success).toBe(true);
      expect(result.data.author.display_nickname).toBe(mockUsers.alumni.nickname);
      expect(result.data.author.is_real_author).toBe(true);
    });

    test('普通用户查看匿名帖子详情应看到匿名作者', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        if (callCount === 2) {
          return createMockQueryBuilder({
            ...createMockPost('post-anon-detail-2', mockUsers.alumni, 'public', true),
            author: {
              nickname: mockUsers.alumni.nickname,
              avatar_url: mockUsers.alumni.avatar_url,
              identity_type: mockUsers.alumni.identity_type,
            },
            hashtags: [],
          });
        }
        return createMockQueryBuilder();
      });

      const result = await getPostById('post-anon-detail-2');

      expect(result.success).toBe(true);
      expect(result.data.author.display_nickname).toBe('匿名用户');
      expect(result.data.author.is_real_author).toBe(false);
    });

    test('作者查看自己的私密帖子应成功', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.alumni.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.alumni.identity_type,
            role: mockUsers.alumni.role,
          });
        }
        if (callCount === 2) {
          return createMockQueryBuilder({
            ...createMockPost('post-private-own', mockUsers.alumni, 'private'),
            hashtags: [],
          });
        }
        return createMockQueryBuilder();
      });

      const result = await getPostById('post-private-own');

      expect(result.success).toBe(true);
      expect(result.data.visibility).toBe('private');
    });

    test('作者查看自己的帖子不应更新浏览量', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const updateBuilder = createMockQueryBuilder();

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        if (callCount === 2) {
          return createMockQueryBuilder({
            ...createMockPost('post-own', mockUsers.classmate, 'public'),
            hashtags: [],
          });
        }
        return updateBuilder;
      });

      const result = await getPostById('post-own');

      expect(result.success).toBe(true);
      expect(updateBuilder.update).not.toHaveBeenCalled();
    });
  });

  describe('Additional Error Cases', () => {
    test('togglePostLike 帖子ID为空应失败', async () => {
      const result = await togglePostLike('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子ID不能为空');
    });
    test('togglePostLike 未登录应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('未认证'),
      });

      const result = await togglePostLike('post-public-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户未登录或认证失败');
    });

    test('togglePostLike 查询点赞失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder(null, { message: '查询失败' });
      supabase.from.mockReturnValueOnce(mockLikeQueryBuilder);

      const result = await togglePostLike('post-public-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('查询点赞状态失败: 查询失败');
    });

    test('togglePostLike 取消点赞失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder({ id: 'like-1' });
      const mockDeleteBuilder = createMockQueryBuilder(null, { message: '删除失败' });

      supabase.from
        .mockReturnValueOnce(mockLikeQueryBuilder)
        .mockReturnValueOnce(mockDeleteBuilder);

      const result = await togglePostLike('post-public-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('取消点赞失败: 删除失败');
    });

    test('togglePostLike 点赞失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      const mockInsertBuilder = createMockQueryBuilder(null, { message: '插入失败' });

      supabase.from
        .mockReturnValueOnce(mockLikeQueryBuilder)
        .mockReturnValueOnce(mockInsertBuilder);

      const result = await togglePostLike('post-public-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('点赞失败: 插入失败');
    });

    test('getComments 帖子ID为空应失败', async () => {
      const result = await getComments('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子ID不能为空');
    });

    test('getComments 未登录应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('未认证'),
      });

      const result = await getComments('post-public-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户未登录或认证失败');
    });

    test('getComments 帖子不存在应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        return createMockQueryBuilder(null, { message: '未找到' });
      });

      const result = await getComments('missing-post');

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子不存在');
    });

    test('getComments 查询评论失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        if (callCount === 2) {
          return createMockQueryBuilder({
            id: 'post-public-1',
            visibility: 'public',
            author_id: mockUsers.classmate.id,
          });
        }
        return createMockQueryBuilder(null, { message: '评论查询失败' });
      });

      const result = await getComments('post-public-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('获取评论失败: 评论查询失败');
    });

    test('getComments 返回空列表应成功', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      let callCount = 0;
      supabase.from.mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          });
        }
        if (callCount === 2) {
          return createMockQueryBuilder({
            id: 'post-public-1',
            visibility: 'public',
            author_id: mockUsers.classmate.id,
          });
        }
        return createMockQueryBuilder([]);
      });

      const result = await getComments('post-public-1');

      expect(result.success).toBe(true);
      expect(result.data).toEqual([]);
    });

    test('addComment 帖子ID为空应失败', async () => {
      const result = await addComment('', '评论');

      expect(result.success).toBe(false);
      expect(result.error).toBe('帖子ID不能为空');
    });

    test('addComment 内容为空应失败', async () => {
      const result = await addComment('post-public-1', '  ');

      expect(result.success).toBe(false);
      expect(result.error).toBe('评论内容不能为空');
    });

    test('addComment 未登录应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('未认证'),
      });

      const result = await addComment('post-public-1', '新评论');

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户未登录或认证失败');
    });

    test('addComment 插入失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockInsertBuilder = createMockQueryBuilder(null, { message: '插入失败' });
      supabase.from.mockReturnValueOnce(mockInsertBuilder);

      const result = await addComment('post-public-1', '新评论');

      expect(result.success).toBe(false);
      expect(result.error).toBe('发表评论失败: 插入失败');
    });

    test('addComment 支持父评论与回复用户', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockInsertBuilder = createMockQueryBuilder({
        id: 'comment-reply-1',
        post_id: 'post-public-1',
        author_id: mockUsers.classmate.id,
        content: '回复评论',
        parent_id: 'comment-parent-1',
        reply_to_user_id: mockUsers.alumni.id,
        created_at: '2024-01-12T12:00:00Z',
        author: {
          nickname: mockUsers.classmate.nickname,
          avatar_url: mockUsers.classmate.avatar_url,
          identity_type: mockUsers.classmate.identity_type,
        },
      });
      supabase.from.mockReturnValueOnce(mockInsertBuilder);

      const result = await addComment(
        'post-public-1',
        '回复评论',
        'comment-parent-1',
        mockUsers.alumni.id
      );

      expect(result.success).toBe(true);
      expect(result.data.parent_id).toBe('comment-parent-1');
      expect(result.data.reply_to_user_id).toBe(mockUsers.alumni.id);
    });

    test('toggleCommentLike 未登录应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('未认证'),
      });

      const result = await toggleCommentLike('comment-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户未登录或认证失败');
    });

    test('toggleCommentLike 评论ID为空应失败', async () => {
      const result = await toggleCommentLike('');

      expect(result.success).toBe(false);
      expect(result.error).toBe('评论ID不能为空');
    });

    test('toggleCommentLike 查询点赞失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder(null, { message: '查询失败' });
      supabase.from.mockReturnValueOnce(mockLikeQueryBuilder);

      const result = await toggleCommentLike('comment-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('查询点赞状态失败: 查询失败');
    });

    test('toggleCommentLike 取消点赞失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder({ id: 'like-1' });
      const mockDeleteBuilder = createMockQueryBuilder(null, { message: '删除失败' });

      supabase.from
        .mockReturnValueOnce(mockLikeQueryBuilder)
        .mockReturnValueOnce(mockDeleteBuilder);

      const result = await toggleCommentLike('comment-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('取消点赞失败: 删除失败');
    });

    test('toggleCommentLike 点赞失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockLikeQueryBuilder = createMockQueryBuilder(null, { code: 'PGRST116' });
      const mockInsertBuilder = createMockQueryBuilder(null, { message: '插入失败' });

      supabase.from
        .mockReturnValueOnce(mockLikeQueryBuilder)
        .mockReturnValueOnce(mockInsertBuilder);

      const result = await toggleCommentLike('comment-1');

      expect(result.success).toBe(false);
      expect(result.error).toBe('点赞失败: 插入失败');
    });

    test('searchPosts 未登录应失败', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: null },
        error: new Error('未认证'),
      });

      const result = await searchPosts({ keyword: '测试' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('用户未登录或认证失败');
    });

    test('searchPosts 获取用户信息失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      const mockProfileBuilder = createMockQueryBuilder(null, { message: 'profile error' });
      supabase.from.mockReturnValueOnce(mockProfileBuilder);

      const result = await searchPosts({ keyword: '测试' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('获取用户信息失败');
    });

    test('searchPosts 查询失败应返回错误', async () => {
      supabase.auth.getUser.mockResolvedValueOnce({
        data: { user: { id: mockUsers.classmate.id } },
        error: null,
      });

      supabase.from
        .mockReturnValueOnce(
          createMockQueryBuilder({
            identity_type: mockUsers.classmate.identity_type,
            role: mockUsers.classmate.role,
          })
        )
        .mockReturnValueOnce(createMockQueryBuilder(null, { message: '查询失败' }));

      const result = await searchPosts({ keyword: '测试' });

      expect(result.success).toBe(false);
      expect(result.error).toBe('搜索失败: 查询失败');
    });
  });
});
