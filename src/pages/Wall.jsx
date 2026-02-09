import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PostCard from '../components/features/post/PostCard';
import NoticeBox from '../components/widgets/NoticeBox';
import { getPosts, deletePost, searchPosts } from '../services/postService';
import styles from './Wall.module.css';

const Wall = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchHashtag, setSearchHashtag] = useState('');
  const [searchSortBy, setSearchSortBy] = useState('time');

  const refreshPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setNotice(null);

      const result = await getPosts();
      if (!result.success) {
        throw new Error(result.error || '无法加载帖子');
      }

      const nextPosts = result.data || [];
      setPosts(nextPosts);
      return true;
    } catch (err) {
      console.error('加载帖子失败:', err);
      const errorMessage = err?.message || '';
      if (errorMessage.includes('未登录') || errorMessage.includes('认证')) {
        setPosts([]);
        setNotice({ type: 'info', message: '你还未登录，登录后可查看完整内容。' });
        setError(null);
      } else {
        setError('系统异常，无法加载帖子。');
        setNotice({ type: 'error', message: `系统错误: ${errorMessage || '未知错误'}` });
      }
      return false;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  const handleDeletePost = async (postId) => {
    try {
      const confirmed = window.confirm('确认删除该帖子吗？');
      if (!confirmed) return;

      setActionLoading(true);
      setNotice(null);

      const result = await deletePost(postId);
      if (result.success) {
        setNotice({ type: 'success', message: '帖子已删除。' });
        await refreshPosts();
      } else {
        if (result.errorCode === 'MEDIA_DELETE_FAILED') {
          window.alert('帖子删除失败：媒体删除失败，请联系管理员。');
        }
        setNotice({ type: 'error', message: `删除失败: ${result.error}` });
      }
    } catch (err) {
      console.error('删除帖子失败:', err);
      setNotice({ type: 'error', message: `系统错误: ${err.message || '未知错误'}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestSearch = async () => {
    try {
      setActionLoading(true);
      setNotice(null);

      const result = await searchPosts({
        keyword: searchKeyword,
        hashtag: searchHashtag,
        sortBy: searchSortBy,
      });

      if (result.success) {
        const nextPosts = result.data || [];
        setPosts(nextPosts);
        setNotice({ type: 'success', message: `搜索完成 (${(result.data || []).length} 条)` });
      } else {
        const errorMessage = result.error || '';
        if (errorMessage.includes('未登录') || errorMessage.includes('认证')) {
          setNotice({ type: 'info', message: '你还未登录，登录后可查看完整内容。' });
        } else {
          setNotice({ type: 'error', message: `搜索失败: ${result.error}` });
        }
      }
    } catch (err) {
      console.error('测试错误:', err);
      const errorMessage = err?.message || '';
      if (errorMessage.includes('未登录') || errorMessage.includes('认证')) {
        setNotice({ type: 'info', message: '你还未登录，登录后可查看完整内容。' });
      } else {
        setNotice({ type: 'error', message: `系统错误: ${errorMessage || '未知错误'}` });
      }
    } finally {
      setActionLoading(false);
    }
  };

  const handleResetSearch = async () => {
    setSearchKeyword('');
    setSearchHashtag('');
    setSearchSortBy('time');
    await refreshPosts();
  };

  const handleCreatePostClick = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      window.alert('你还未登录，登录后可发布帖子并查看完整内容。');
      return;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('identity_type, role')
      .eq('id', user.id)
      .single();

    const canCreatePost =
      profile?.identity_type === 'classmate' ||
      profile?.identity_type === 'alumni' ||
      profile?.role === 'admin' ||
      profile?.role === 'superuser';

    if (!canCreatePost) {
      window.alert('你还未登录，登录后可发布帖子并查看完整内容。');
      return;
    }

    navigate('/posts/new');
  };

  const handleTestLogin = async () => {
    try {
      setActionLoading(true);
      setNotice(null);

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: 'test@26b.dev',
        password: 'shao26b',
      });

      if (signInError) {
        throw new Error(signInError.message || '登录失败');
      }

      setNotice({ type: 'success', message: '测试账号登录成功。' });
      await refreshPosts();
    } catch (err) {
      setNotice({ type: 'error', message: `登录失败: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestLogout = async () => {
    try {
      setActionLoading(true);
      setNotice(null);

      const { error: signOutError } = await supabase.auth.signOut();
      if (signOutError) {
        throw new Error(signOutError.message || '退出失败');
      }

      setPosts([]);
      setNotice({ type: 'success', message: '已退出登录。' });
      await refreshPosts();
    } catch (err) {
      setNotice({ type: 'error', message: `退出失败: ${err.message}` });
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">班级留言墙</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="scene-title">共享笔记与回响</h1>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                type="button"
                className="scene-button ghost"
                onClick={handleTestLogin}
                disabled={actionLoading}
              >
                测试登录
              </button>
              <button
                type="button"
                className="scene-button ghost"
                onClick={handleTestLogout}
                disabled={actionLoading}
              >
                模拟退出
              </button>
              <button
                type="button"
                className="scene-button primary"
                style={{ marginRight: '12px', padding: '1.05rem 2.1rem', fontSize: '1.2rem' }}
                onClick={handleCreatePostClick}
              >
                发布帖子 &gt;ω&lt;
              </button>
            </div>
          </div>
          <p className="scene-subtitle">留下留言、庆祝里程碑，或为班级写下一段短短的回忆。</p>

          {notice && <NoticeBox type={notice.type} message={notice.message} />}

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <input
              type="text"
              value={searchKeyword}
              onChange={(event) => setSearchKeyword(event.target.value)}
              placeholder="搜索关键词"
              className="form-control form-control-sm"
              style={{ maxWidth: '180px' }}
            />
            <input
              type="text"
              value={searchHashtag}
              onChange={(event) => setSearchHashtag(event.target.value)}
              placeholder="标签(#可选)"
              className="form-control form-control-sm"
              style={{ maxWidth: '180px' }}
            />
            <select
              value={searchSortBy}
              onChange={(event) => setSearchSortBy(event.target.value)}
              className="form-select form-select-sm"
              style={{ maxWidth: '140px' }}
            >
              <option value="time">按时间</option>
              <option value="likes">按点赞</option>
            </select>
            <button
              onClick={handleTestSearch}
              disabled={actionLoading}
              className="scene-button ghost"
            >
              {actionLoading ? '处理中...' : '🔍 搜索'}
            </button>
            <button
              onClick={handleResetSearch}
              disabled={actionLoading}
              className="scene-button ghost"
            >
              重置
            </button>
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
          <div className={styles.stateBlock}>
            <NoticeBox type="error" message={error} />
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
          {posts.map((post) => {
            return (
              <PostCard key={post.id} post={post} onDeletePost={() => handleDeletePost(post.id)} />
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Wall;
