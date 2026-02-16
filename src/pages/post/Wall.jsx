import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import PostCard from '../../components/features/post/PostCard';
import PostWallHero from '../../components/features/post/PostWallHero';
import PostWallControls from '../../components/features/post/PostWallControls';
import PostWallEmptyState from '../../components/features/post/PostWallEmptyState';
import NoticeBox from '../../components/widgets/NoticeBox';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';
import { getPosts, deletePost, searchPosts, togglePostLike } from '../../services/postService';
import styles from './Wall.module.css';

const Wall = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchSortBy, setSearchSortBy] = useState('time');
  const [authStatus, setAuthStatus] = useState('loading');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [likeLoadingPostId, setLikeLoadingPostId] = useState(null);
  const panelRef = useRef(null);
  const lastAnimatedCountRef = useRef(0);

  const wallStats = useMemo(() => {
    return posts.reduce(
      (acc, post) => {
        acc.totalLikes += post.like_count || 0;
        acc.totalComments += post.comment_count || 0;
        acc.totalViews += post.view_count || 0;
        return acc;
      },
      {
        totalPosts: posts.length,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
      }
    );
  }, [posts]);

  const loadAuthStatus = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setCurrentUserId(null);
        setAuthStatus('anonymous');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('identity_type, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setCurrentUserId(null);
        setAuthStatus('anonymous');
        return;
      }

      setCurrentUserId(user.id);

      if (profile.role === 'admin' || profile.role === 'superuser') {
        setAuthStatus('member');
        return;
      }

      if (profile.identity_type === 'guest') {
        setAuthStatus('guest');
        return;
      }

      setAuthStatus('member');
    } catch (error) {
      console.error('Wall auth check failed:', error);
      setCurrentUserId(null);
      setAuthStatus('anonymous');
    }
  }, []);

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
    loadAuthStatus();
  }, [loadAuthStatus]);

  useEffect(() => {
    if (authStatus === 'member' || authStatus === 'guest') {
      refreshPosts();
      return;
    }
    if (authStatus === 'anonymous') {
      setLoading(false);
      setPosts([]);
      setError(null);
    }
  }, [authStatus, refreshPosts]);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const panel = panelRef.current;
    if (!gsap || !panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const heroItems = panel.querySelectorAll('[data-animate="hero"]');
      const toolbarItems = panel.querySelectorAll('[data-animate="toolbar"]');
      gsap.from(panel, { opacity: 0, y: 14, duration: 0.45, ease: 'power2.out' });
      gsap.from(heroItems, {
        opacity: 0,
        y: 18,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.1,
      });
      gsap.from(toolbarItems, {
        opacity: 0,
        y: 14,
        duration: 0.5,
        ease: 'power2.out',
        stagger: 0.06,
        delay: 0.15,
      });
    }, panel);

    return () => ctx.revert();
  }, []);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const panel = panelRef.current;
    if (
      !gsap ||
      !panel ||
      loading ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return undefined;
    }

    if (posts.length === 0) {
      lastAnimatedCountRef.current = 0;
      return undefined;
    }

    if (lastAnimatedCountRef.current === posts.length) {
      return undefined;
    }

    lastAnimatedCountRef.current = posts.length;
    const cards = panel.querySelectorAll('[data-animate="card"]');
    if (cards.length === 0) return undefined;

    const ctx = gsap.context(() => {
      gsap.from(cards, {
        opacity: 0,
        y: 18,
        duration: 0.6,
        ease: 'power2.out',
        stagger: 0.05,
        delay: 0.1,
      });
    }, panel);

    return () => ctx.revert();
  }, [loading, posts.length]);

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
    setSearchSortBy('time');
    await refreshPosts();
  };

  const handleToggleLike = async (postId) => {
    if (!currentUserId) {
      setNotice({ type: 'info', message: '你还未登录，登录后可点赞。' });
      return;
    }

    let previousState = null;

    setPosts((prevPosts) =>
      prevPosts.map((post) => {
        if (post.id !== postId) {
          return post;
        }

        previousState = {
          liked: Boolean(post.liked),
          like_count: post.like_count || 0,
        };

        const nextLiked = !post.liked;
        const delta = nextLiked ? 1 : -1;
        const nextLikeCount = Math.max(0, (post.like_count || 0) + delta);

        return {
          ...post,
          liked: nextLiked,
          like_count: nextLikeCount,
        };
      })
    );

    setLikeLoadingPostId(postId);
    setNotice(null);

    const result = await togglePostLike(postId);
    if (result.success) {
      const serverLiked = result.data?.liked;
      if (typeof serverLiked === 'boolean') {
        setPosts((prevPosts) =>
          prevPosts.map((post) => {
            if (post.id !== postId) {
              return post;
            }

            if (post.liked === serverLiked) {
              return post;
            }

            const delta = serverLiked ? 1 : -1;
            return {
              ...post,
              liked: serverLiked,
              like_count: Math.max(0, (post.like_count || 0) + delta),
            };
          })
        );
      }
    } else {
      if (previousState) {
        setPosts((prevPosts) =>
          prevPosts.map((post) =>
            post.id === postId
              ? {
                  ...post,
                  liked: previousState.liked,
                  like_count: previousState.like_count,
                }
              : post
          )
        );
      }
      setNotice({ type: 'error', message: result.error || '点赞失败' });
    }

    setLikeLoadingPostId(null);
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

  // const handleTestLogin = async () => {
  //   try {
  //     setActionLoading(true);
  //     setNotice(null);

  //     const { error: signInError } = await supabase.auth.signInWithPassword({
  //       email: 'test@26b.dev',
  //       password: 'shao26b',
  //     });

  //     if (signInError) {
  //       throw new Error(signInError.message || '登录失败');
  //     }

  //     setNotice({ type: 'success', message: '测试账号登录成功。' });
  //     await loadAuthStatus();
  //   } catch (err) {
  //     setNotice({ type: 'error', message: `登录失败: ${err.message}` });
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

  // const handleTestLogout = async () => {
  //   try {
  //     setActionLoading(true);
  //     setNotice(null);

  //     const { error: signOutError } = await supabase.auth.signOut();
  //     if (signOutError) {
  //       throw new Error(signOutError.message || '退出失败');
  //     }

  //     setPosts([]);
  //     setNotice({ type: 'success', message: '已退出登录。' });
  //     await loadAuthStatus();
  //   } catch (err) {
  //     setNotice({ type: 'error', message: `退出失败: ${err.message}` });
  //   } finally {
  //     setActionLoading(false);
  //   }
  // };

  const isLocked = authStatus === 'anonymous';
  const gateCopy =
    authStatus === 'guest'
      ? {
          title: '抱歉，游客不能浏览该页面',
          message: '请验证校友身份，浏览班级墙',
        }
      : {
          title: '请登录',
          message: '登录即可浏览班级墙',
        };

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section
        className={`scene-panel ${styles.wallPanel} ${gateStyles.lockedContainer}`}
        ref={panelRef}
      >
        <div
          className={`${gateStyles.lockedContent} ${isLocked ? gateStyles.isLocked : ''}`}
          aria-hidden={isLocked}
        >
          <PostWallHero
            onCreatePost={handleCreatePostClick}
            actionLoading={actionLoading}
            stats={wallStats}
          />

          {notice && (
            <div className={styles.noticeWrap} data-animate="toolbar">
              <NoticeBox type={notice.type} message={notice.message} />
            </div>
          )}

          <PostWallControls
            searchKeyword={searchKeyword}
            searchSortBy={searchSortBy}
            onKeywordChange={setSearchKeyword}
            onSortChange={setSearchSortBy}
            onSearch={handleTestSearch}
            onReset={handleResetSearch}
            actionLoading={actionLoading}
          />

          {loading && (
            <div className={styles.stateBlock} data-animate="state">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">加载中...</span>
              </div>
              <p className={styles.stateText}>正在加载帖子...</p>
            </div>
          )}

          {error && (
            <div className={styles.stateBlock} data-animate="state">
              <NoticeBox type="error" message={error} />
            </div>
          )}

          {!loading && !error && posts.length === 0 && (
            <PostWallEmptyState
              onCreatePost={handleCreatePostClick}
              actionLoading={actionLoading}
            />
          )}

          <div className={styles.postGrid}>
            {posts.map((post) => (
              <PostCard
                key={post.id}
                post={post}
                onDeletePost={() => handleDeletePost(post.id)}
                onToggleLike={handleToggleLike}
                likeLoading={likeLoadingPostId === post.id}
              />
            ))}
          </div>
        </div>
        {isLocked && (
          <AuthGateOverlay mode={authStatus} title={gateCopy.title} message={gateCopy.message} />
        )}
      </section>
    </div>
  );
};

export default Wall;
