import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import PostCard from '../components/features/post/PostCard';
import { createPost } from '../services/postService';
import { signIn } from '../services/userService';
import styles from './Wall.module.css';

const Wall = () => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [testLoading, setTestLoading] = useState(false);
  const [testMessage, setTestMessage] = useState(null);

  useEffect(() => {
    const fetchPosts = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data, error: fetchError } = await supabase
          .from('posts')
          .select(
            `
            *,
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

        if (fetchError) throw fetchError;

        // 格式化数据
        const processedPosts = (data || []).map((post) => ({
          ...post,
          like_count: post.post_likes?.[0]?.count || 0,
          comment_count: post.comments?.[0]?.count || 0,
        }));

        setPosts(processedPosts);
      } catch (err) {
        console.error('加载帖子失败:', err);
        setError('无法加载帖子，请稍后再试。');
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, []);

  // 测试 signIn + createPost 函数
  const handleTestCreatePost = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      // 1. 先登录
      console.log('1️⃣ 开始登录...');
      const loginResult = await signIn({
        account: 'test@26b.dev',
        password: 'shao26b',
        loginType: 'password',
      });

      console.log('登录结果:', loginResult);

      if (!loginResult.success) {
        throw new Error(`登录失败: ${loginResult.error}`);
      }

      console.log('✅ 登录成功');

      // 2. 然后发帖
      console.log('2️⃣ 开始创建帖子...');
      const testPostData = {
        content: '这是一条测试帖子 - 测试登录+发帖流程 ' + new Date().toLocaleTimeString(),
        visibility: 'public',
        is_anonymous: false,
      };

      console.log('调用 createPost，参数:', testPostData);
      const postResult = await createPost(testPostData);

      console.log('createPost 返回结果:', postResult);

      if (postResult.success) {
        setTestMessage(`✅ 登录成功！帖子创建成功！ID: ${postResult.data.id}`);
        // 刷新帖子列表
        setTimeout(() => {
          const fetchPosts = async () => {
            const { data } = await supabase
              .from('posts')
              .select(
                `
                *,
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
            const processedPosts = (data || []).map((post) => ({
              ...post,
              like_count: post.post_likes?.[0]?.count || 0,
              comment_count: post.comments?.[0]?.count || 0,
            }));
            setPosts(processedPosts);
          };
          fetchPosts();
        }, 500);
      } else {
        setTestMessage(`❌ 发帖失败: ${postResult.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  // 测试带图片的发帖
  const handleTestCreatePostWithImage = async () => {
    try {
      setTestLoading(true);
      setTestMessage(null);

      // 1. 先登录
      console.log('1️⃣ 开始登录...');
      const loginResult = await signIn({
        account: 'test@26b.dev',
        password: 'shao26b',
        loginType: 'password',
      });

      console.log('登录结果:', loginResult);

      if (!loginResult.success) {
        throw new Error(`登录失败: ${loginResult.error}`);
      }

      console.log('✅ 登录成功');

      // 2. 然后发帖（带图片）
      console.log('2️⃣ 开始创建带图片的帖子...');
      const testPostData = {
        content: '这是一条带图片的测试帖子 ' + new Date().toLocaleTimeString(),
        visibility: 'public',
        is_anonymous: false,
        media_urls: ['https://picsum.photos/400/300?random=1'],
      };

      console.log('调用 createPost，参数:', testPostData);
      const postResult = await createPost(testPostData);

      console.log('createPost 返回结果:', postResult);

      if (postResult.success) {
        setTestMessage(`✅ 登录成功！带图片帖子创建成功！ID: ${postResult.data.id}`);
        // 刷新帖子列表
        setTimeout(() => {
          const fetchPosts = async () => {
            const { data } = await supabase
              .from('posts')
              .select(
                `
                *,
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
            const processedPosts = (data || []).map((post) => ({
              ...post,
              like_count: post.post_likes?.[0]?.count || 0,
              comment_count: post.comments?.[0]?.count || 0,
            }));
            setPosts(processedPosts);
          };
          fetchPosts();
        }, 500);
      } else {
        setTestMessage(`❌ 发帖失败: ${postResult.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setTestMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setTestLoading(false);
    }
  };

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">班级留言墙</p>
          <h1 className="scene-title">共享笔记与回响</h1>
          <p className="scene-subtitle">留下留言、庆祝里程碑，或为班级写下一段短短的回忆。</p>

          {/* 测试按钮 */}
          <div style={{ marginTop: '15px' }}>
            <button
              onClick={handleTestCreatePost}
              disabled={testLoading}
              className="btn btn-outline-primary btn-sm"
              style={{ marginRight: '10px' }}
            >
              {testLoading ? '测试中...' : '🧪 测试登录+发帖'}
            </button>
            <button
              onClick={handleTestCreatePostWithImage}
              disabled={testLoading}
              className="btn btn-outline-success btn-sm"
              style={{ marginRight: '10px' }}
            >
              {testLoading ? '测试中...' : '🖼️ 测试发帖(带图片)'}
            </button>
            {testMessage && (
              <span style={{ fontSize: '14px', marginLeft: '10px' }}>{testMessage}</span>
            )}
          </div>
        </div>

        {loading && (
          <div className={styles.stateBlock}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
            <p className={styles.stateText}>正在加载帖子...</p>
          </div>
        )}

        {error && (
          <div className={`alert alert-danger ${styles.stateBlock}`} role="alert">
            <i className="fas fa-exclamation-triangle me-2"></i>
            <span>{error}</span>
          </div>
        )}

        {!loading && !error && posts.length === 0 && (
          <div className={styles.stateBlock}>
            <div className={styles.emptyState}>
              <i className="fas fa-comment-slash fa-3x mb-3"></i>
              <h4>暂无帖子</h4>
              <p>成为第一个为 26B 班留言的人。</p>
            </div>
          </div>
        )}

        <div className="row g-4">
          {posts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>
    </div>
  );
};

export default Wall;
