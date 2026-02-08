import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import PostCard from '../components/features/post/PostCard';
import {
  getPosts,
  togglePostLike,
  getComments,
  addComment,
  toggleCommentLike,
  deletePost,
  deleteComment,
  searchPosts,
} from '../services/postService';
import styles from './Wall.module.css';

const Wall = () => {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionMessage, setActionMessage] = useState(null);
  const [commentDrafts, setCommentDrafts] = useState({});
  const [commentsByPost, setCommentsByPost] = useState({});
  const [replyTargetByPost, setReplyTargetByPost] = useState({});
  const [searchKeyword, setSearchKeyword] = useState('');
  const [searchHashtag, setSearchHashtag] = useState('');
  const [searchSortBy, setSearchSortBy] = useState('time');
  const [currentUserId, setCurrentUserId] = useState(null);

  const loadCommentsForPosts = useCallback(async (postList) => {
    const resultMap = {};

    await Promise.all(
      (postList || []).map(async (post) => {
        const result = await getComments(post.id);
        if (result.success) {
          resultMap[post.id] = result.data || [];
        }
      })
    );

    setCommentsByPost(resultMap);
  }, []);

  const refreshPosts = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await getPosts();
      if (!result.success) {
        throw new Error(result.error || '无法加载帖子');
      }

      const nextPosts = result.data || [];
      setPosts(nextPosts);
      await loadCommentsForPosts(nextPosts);
      return true;
    } catch (err) {
      console.error('加载帖子失败:', err);
      setError('无法加载帖子，请稍后再试。');
      return false;
    } finally {
      setLoading(false);
    }
  }, [loadCommentsForPosts]);

  useEffect(() => {
    refreshPosts();
  }, [refreshPosts]);

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    fetchCurrentUser();
  }, []);

  const handleTestTogglePostLike = async (postId) => {
    try {
      setActionLoading(true);
      setActionMessage(null);

      const result = await togglePostLike(postId);
      if (result.success) {
        setActionMessage(`✅ 帖子${result.data.liked ? '点赞' : '取消点赞'}成功`);
        await refreshPosts();
      } else {
        setActionMessage(`❌ 操作失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestGetComments = async (postId) => {
    try {
      setActionLoading(true);
      setActionMessage(null);

      const result = await getComments(postId);
      if (result.success) {
        setCommentsByPost((prev) => ({
          ...prev,
          [postId]: result.data || [],
        }));
        setActionMessage(`✅ 获取评论成功 (${(result.data || []).length} 条)`);
      } else {
        setActionMessage(`❌ 获取评论失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestAddComment = async (postId, postComments = []) => {
    try {
      setActionLoading(true);
      setActionMessage(null);

      const draft = commentDrafts[postId] || '';
      if (!draft.trim()) {
        setActionMessage('❌ 评论内容不能为空');
        return;
      }

      const replyTargetId = replyTargetByPost[postId] || '';
      const replyTargetComment = replyTargetId
        ? postComments.find((comment) => comment.id === replyTargetId)
        : null;
      const replyToUserId = replyTargetComment?.author_id || null;

      const result = await addComment(postId, draft.trim(), replyTargetId || null, replyToUserId);
      if (result.success) {
        setCommentDrafts((prev) => ({
          ...prev,
          [postId]: '',
        }));
        setReplyTargetByPost((prev) => ({
          ...prev,
          [postId]: '',
        }));
        setActionMessage('✅ 评论发布成功');
        await handleTestGetComments(postId);
        await refreshPosts();
      } else {
        setActionMessage(`❌ 评论失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestToggleCommentLike = async (postId, commentId) => {
    try {
      setActionLoading(true);
      setActionMessage(null);

      if (!commentId) {
        setActionMessage('❌ 当前没有可点赞的评论');
        return;
      }

      const result = await toggleCommentLike(commentId);
      if (result.success) {
        setActionMessage(`✅ 评论${result.data.liked ? '点赞' : '取消点赞'}成功`);
        await handleTestGetComments(postId);
      } else {
        setActionMessage(`❌ 操作失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeletePost = async (postId) => {
    try {
      const confirmed = window.confirm('确认删除该帖子吗？');
      if (!confirmed) return;

      setActionLoading(true);
      setActionMessage(null);

      const result = await deletePost(postId);
      if (result.success) {
        setActionMessage('✅ 帖子已删除');
        await refreshPosts();
      } else {
        if (result.errorCode === 'MEDIA_DELETE_FAILED') {
          window.alert('帖子删除失败：媒体删除失败，请联系管理员。');
        }
        setActionMessage(`❌ 删除失败: ${result.error}`);
      }
    } catch (err) {
      console.error('删除帖子失败:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteComment = async (postId, commentId) => {
    try {
      const confirmed = window.confirm('确认删除该评论吗？');
      if (!confirmed) return;

      setActionLoading(true);
      setActionMessage(null);

      const result = await deleteComment(commentId);
      if (result.success) {
        setActionMessage('✅ 评论已删除');
        await handleTestGetComments(postId);
        await refreshPosts();
      } else {
        setActionMessage(`❌ 删除失败: ${result.error}`);
      }
    } catch (err) {
      console.error('删除评论失败:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleSimulateOtherView = async (post) => {
    try {
      setActionLoading(true);
      setActionMessage(null);

      const nextViewCount = (post.view_count || 0) + 1;
      const { error: updateError } = await supabase
        .from('posts')
        .update({ view_count: nextViewCount })
        .eq('id', post.id);

      if (updateError) {
        throw new Error(updateError.message);
      }

      setActionMessage('✅ 已模拟他人浏览（强制增加浏览量）');
      await refreshPosts();
    } catch (err) {
      console.error('测试错误:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  const handleTestSearch = async () => {
    try {
      setActionLoading(true);
      setActionMessage(null);

      const result = await searchPosts({
        keyword: searchKeyword,
        hashtag: searchHashtag,
        sortBy: searchSortBy,
      });

      if (result.success) {
        const nextPosts = result.data || [];
        setPosts(nextPosts);
        await loadCommentsForPosts(nextPosts);
        setActionMessage(`✅ 搜索完成 (${(result.data || []).length} 条)`);
      } else {
        setActionMessage(`❌ 搜索失败: ${result.error}`);
      }
    } catch (err) {
      console.error('测试错误:', err);
      setActionMessage(`❌ 异常错误: ${err.message}`);
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
      window.alert('游客不能发布帖子，请联系管理员升级为校友');
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
      window.alert('游客不能发布帖子，请联系管理员升级为校友');
      return;
    }

    navigate('/posts/new');
  };

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">班级留言墙</p>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <h1 className="scene-title">共享笔记与回响</h1>
            <button
              type="button"
              className="btn btn-primary"
              style={{ padding: '0.75rem 1.5rem', fontSize: '1.5rem', marginRight: '12px' }}
              onClick={handleCreatePostClick}
            >
              发布帖子
            </button>
          </div>
          <p className="scene-subtitle">留下留言、庆祝里程碑，或为班级写下一段短短的回忆。</p>

          {actionMessage && (
            <div style={{ marginTop: '12px', fontSize: '14px' }}>{actionMessage}</div>
          )}

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
              className="btn btn-outline-primary btn-sm"
            >
              {actionLoading ? '处理中...' : '🔍 搜索'}
            </button>
            <button
              onClick={handleResetSearch}
              disabled={actionLoading}
              className="btn btn-outline-secondary btn-sm"
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
          {posts.map((post) => {
            const postComments = commentsByPost[post.id] || [];
            const draftValue = commentDrafts[post.id] || '';
            const replyValue = replyTargetByPost[post.id] || '';

            return (
              <PostCard
                key={post.id}
                post={post}
                comments={postComments}
                commentDraft={draftValue}
                replyTarget={replyValue}
                testLoading={actionLoading}
                currentUserId={currentUserId}
                onToggleLike={() => handleTestTogglePostLike(post.id)}
                onSimulateView={() => handleSimulateOtherView(post)}
                onCommentDraftChange={(value) =>
                  setCommentDrafts((prev) => ({
                    ...prev,
                    [post.id]: value,
                  }))
                }
                onReplyTargetChange={(value) =>
                  setReplyTargetByPost((prev) => ({
                    ...prev,
                    [post.id]: value,
                  }))
                }
                onAddComment={() => handleTestAddComment(post.id, postComments)}
                onToggleCommentLike={(commentId) => handleTestToggleCommentLike(post.id, commentId)}
                onDeletePost={() => handleDeletePost(post.id)}
                onDeleteComment={(commentId) => handleDeleteComment(post.id, commentId)}
              />
            );
          })}
        </div>
      </section>
    </div>
  );
};

export default Wall;
