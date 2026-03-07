import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import PostCard from '../../components/features/post/PostCard';
import PostWallHero from '../../components/features/post/PostWallHero';
import PostWallControls from '../../components/features/post/PostWallControls';
import PostWallEmptyState from '../../components/features/post/PostWallEmptyState';
import NoticeBox from '../../components/widgets/NoticeBox';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import ReportGateOverlay from '../../components/ui/ReportGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';
import { getPosts, deletePost, searchPosts, togglePostLike } from '../../services/postService';
import { logger } from '../../utils/logger';
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
  const [statsMode, setStatsMode] = useState('all');
  const [likeLoadingPostId, setLikeLoadingPostId] = useState(null);
  const panelRef = useRef(null);
  const lastAnimatedCountRef = useRef(0);
  const [reportTarget, setReportTarget] = useState(null);

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

  const ownWallStats = useMemo(() => {
    const ownPosts = posts.filter((post) => post.is_owner);
    return ownPosts.reduce(
      (acc, post) => {
        acc.totalLikes += post.like_count || 0;
        acc.totalComments += post.comment_count || 0;
        acc.totalViews += post.view_count || 0;
        return acc;
      },
      {
        totalPosts: ownPosts.length,
        totalLikes: 0,
        totalComments: 0,
        totalViews: 0,
      }
    );
  }, [posts]);

  const displayedStats = statsMode === 'mine' ? ownWallStats : wallStats;

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
        .select('role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setCurrentUserId(null);
        setAuthStatus('anonymous');
        return;
      }

      setCurrentUserId(user.id);

      setAuthStatus('member');
    } catch (error) {
      logger.error('Wall auth check failed:', error);
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
      logger.error('加载帖子失败:', err);
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
    if (authStatus === 'member') {
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
      
      if (heroItems.length > 0) {
        gsap.from(heroItems, {
          opacity: 0,
          y: 18,
          duration: 0.6,
          ease: 'power2.out',
          stagger: 0.08,
          delay: 0.1,
        });
      }

      if (toolbarItems.length > 0) {
        gsap.from(toolbarItems, {
          opacity: 0,
          y: 14,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.06,
          delay: 0.15,
        });
      }
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
      logger.error('删除帖子失败:', err);
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
      logger.error('测试错误:', err);
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
      .select('role, is_banned')
      .eq('id', user.id)
      .single();

    if (profile?.is_banned) {
      window.alert('你已被禁言');
      return;
    }

    const canCreatePost = Boolean(profile);

    if (!canCreatePost) {
      window.alert('你还未登录，登录后可发布帖子并查看完整内容。');
      return;
    }

    navigate('/posts/new');
  };

  const handleReportPost = (post) => {
    if (!post) return;
    setReportTarget({
      type: 'post',
      id: post.id,
      summary: post.title || post.content || '',
    });
  };

  const handleCloseReport = () => setReportTarget(null);

  const handleToggleStatsMode = () => {
    setStatsMode((prevMode) => (prevMode === 'all' ? 'mine' : 'all'));
  };

  const isLocked = authStatus === 'anonymous';
  const gateCopy = {
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
            stats={displayedStats}
            statsMode={statsMode}
            onToggleStatsMode={handleToggleStatsMode}
            canToggleOwnStats={Boolean(currentUserId)}
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
                onReport={handleReportPost}
              />
            ))}
          </div>
        </div>
        {isLocked && (
          <AuthGateOverlay mode={authStatus} title={gateCopy.title} message={gateCopy.message} />
        )}
      </section>

      {reportTarget && (
        <ReportGateOverlay
          key={`${reportTarget.type}-${reportTarget.id}`}
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          targetSummary={reportTarget.summary}
          isAuthenticated={Boolean(currentUserId)}
          onClose={handleCloseReport}
          onSubmitted={() =>
            setNotice({ type: 'success', message: '举报已提交，我们会尽快处理。' })
          }
        />
      )}
    </div>
  );
};

export default Wall;
