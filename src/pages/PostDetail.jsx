import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../lib/supabase';
import {
  getPostById,
  getComments,
  togglePostLike,
  addComment,
  toggleCommentLike,
  deletePost,
  deleteComment,
} from '../services/postService';
import NoticeBox from '../components/widgets/NoticeBox';
import styles from './Wall.module.css';
import postStyles from '../components/features/post/PostCard.module.css';

const PostDetail = () => {
  const { postId } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [comments, setComments] = useState([]);
  const [commentDraft, setCommentDraft] = useState('');
  const [replyTarget, setReplyTarget] = useState('');
  const [currentUserId, setCurrentUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);

  const formattedDate = post?.created_at
    ? new Date(post.created_at).toLocaleDateString('zh-CN', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
    : '';

  const likeCount = post?.like_count || 0;
  const commentCount = post?.comment_count || 0;
  const viewCount = post?.view_count || 0;

  const isVideoUrl = (url = '') => {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return ['.mp4', '.webm', '.mov', '.m4v'].some((ext) => cleanUrl.endsWith(ext));
  };

  const openMedia = (url) => {
    setActiveMedia({ url, isVideo: isVideoUrl(url) });
  };

  const closeMedia = () => setActiveMedia(null);

  const loadPostDetail = async () => {
    if (!postId) return;
    setLoading(true);
    setNotice(null);

    const result = await getPostById(postId);
    if (!result.success) {
      setNotice({ type: 'error', message: result.error || '无法加载帖子详情' });
      setLoading(false);
      return;
    }

    setPost(result.data);
    setLoading(false);
  };

  const loadComments = async () => {
    if (!postId) return;
    const result = await getComments(postId);
    if (result.success) {
      setComments(result.data || []);
    } else if (!notice) {
      setNotice({ type: 'error', message: result.error || '无法加载评论' });
    }
  };

  useEffect(() => {
    const fetchCurrentUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setCurrentUserId(user?.id || null);
    };

    fetchCurrentUser();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadPostDetail();
      loadComments();
    }, 0);

    return () => clearTimeout(timer);
  }, [postId]);

  const handleToggleLike = async () => {
    if (!currentUserId) {
      setNotice({ type: 'info', message: '你还未登录，登录后可查看完整内容。' });
      return;
    }

    setActionLoading(true);
    setNotice(null);

    const result = await togglePostLike(postId);
    if (result.success) {
      await loadPostDetail();
    } else {
      setNotice({ type: 'error', message: result.error || '点赞失败' });
    }

    setActionLoading(false);
  };

  const handleAddComment = async () => {
    if (!currentUserId) {
      setNotice({ type: 'info', message: '你还未登录，登录后可查看完整内容。' });
      return;
    }

    if (!commentDraft.trim()) {
      setNotice({ type: 'error', message: '评论内容不能为空' });
      return;
    }

    const replyTargetComment = replyTarget
      ? comments.find((commentItem) => commentItem.id === replyTarget)
      : null;
    const replyToUserId = replyTargetComment?.author_id || null;

    setActionLoading(true);
    setNotice(null);

    const result = await addComment(
      postId,
      commentDraft.trim(),
      replyTarget || null,
      replyToUserId
    );
    if (result.success) {
      setCommentDraft('');
      setReplyTarget('');
      await loadComments();
      await loadPostDetail();
    } else {
      setNotice({ type: 'error', message: result.error || '发表评论失败' });
    }

    setActionLoading(false);
  };

  const handleToggleCommentLike = async (commentId) => {
    if (!currentUserId) {
      setNotice({ type: 'info', message: '你还未登录，登录后可查看完整内容。' });
      return;
    }

    setActionLoading(true);
    setNotice(null);

    const result = await toggleCommentLike(commentId);
    if (result.success) {
      await loadComments();
    } else {
      setNotice({ type: 'error', message: result.error || '点赞失败' });
    }

    setActionLoading(false);
  };

  const handleDeletePost = async () => {
    const confirmed = window.confirm('确认删除该帖子吗？');
    if (!confirmed) return;

    setActionLoading(true);
    setNotice(null);

    const result = await deletePost(postId);
    if (result.success) {
      navigate('/wall');
      return;
    }

    if (result.errorCode === 'MEDIA_DELETE_FAILED') {
      setNotice({ type: 'error', message: '帖子删除失败：媒体删除失败，请联系管理员。' });
    }

    setNotice({ type: 'error', message: result.error || '删除失败' });
    setActionLoading(false);
  };

  const handleDeleteComment = async (commentId) => {
    const confirmed = window.confirm('确认删除该评论吗？');
    if (!confirmed) return;

    setActionLoading(true);
    setNotice(null);

    const result = await deleteComment(commentId);
    if (result.success) {
      await loadComments();
      await loadPostDetail();
    } else {
      setNotice({ type: 'error', message: result.error || '删除评论失败' });
    }

    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className={`page-content scene-page ${styles.pageContent}`}>
        <section className={`scene-panel ${styles.wallPanel}`}>
          <div className={styles.stateBlock}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
            <p className={styles.stateText}>正在加载帖子...</p>
          </div>
        </section>
      </div>
    );
  }

  if (!post) {
    return (
      <div className={`page-content scene-page ${styles.pageContent}`}>
        <section className={`scene-panel ${styles.wallPanel}`}>
          <NoticeBox type="error" message={(notice && notice.message) || '帖子不存在'} />
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            返回
          </button>
        </section>
      </div>
    );
  }

  const authorName = post.author?.display_nickname || post.author?.nickname || '匿名';

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">帖子详情</p>
          <h1 className="scene-title">{post.title || '帖子'}</h1>
          <p className="scene-subtitle">{formattedDate}</p>
        </div>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        <div className={postStyles.postCard} style={{ marginBottom: '1.5rem', height: 'auto' }}>
          <div className="d-flex align-items-center mb-3">
            <div className="me-3">
              <div className={postStyles.avatarCircle}>
                {post.author?.avatar_url ? (
                  <img
                    src={post.author.avatar_url}
                    alt={authorName}
                    style={{
                      width: '100%',
                      height: '100%',
                      borderRadius: '50%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <span>{authorName.charAt(0)}</span>
                )}
              </div>
            </div>
            <div className="flex-grow-1">
              <div className="d-flex justify-content-between align-items-center">
                <span className={postStyles.postAuthorName}>{authorName}</span>
                <span className={`${postStyles.postDate} text-muted small`}>{formattedDate}</span>
              </div>
            </div>
          </div>

          <div className={postStyles.postContent} style={{ whiteSpace: 'pre-wrap' }}>
            {post.content}
          </div>

          {post.hashtags && post.hashtags.length > 0 && (
            <div className={postStyles.postTags} style={{ marginBottom: '12px' }}>
              {post.hashtags.map((tag) => (
                <span key={tag} className={postStyles.postTag}>
                  #{tag}
                </span>
              ))}
            </div>
          )}

          {post.media_urls && post.media_urls.length > 0 && (
            <div className="mb-3">
              <div className={`${postStyles.mediaGrid} ${postStyles.mediaGridDetail}`}>
                {post.media_urls.map((url, idx) =>
                  isVideoUrl(url) ? (
                    <video
                      key={idx}
                      src={url}
                      className={`${postStyles.mediaThumb} ${postStyles.mediaThumbDetail}`}
                      onClick={() => openMedia(url)}
                      muted
                      preload="metadata"
                    />
                  ) : (
                    <img
                      key={idx}
                      src={url}
                      alt={`帖子图片 ${idx + 1}`}
                      className={`${postStyles.mediaThumb} ${postStyles.mediaThumbDetail}`}
                      onClick={() => openMedia(url)}
                    />
                  )
                )}
              </div>
            </div>
          )}

          <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
            <div style={{ fontSize: '12px', color: '#666' }}>
              <span className="me-3">👁 {viewCount}</span>
              <span className="me-3">❤️ {likeCount}</span>
              <span>💬 {commentCount}</span>
            </div>
            {post.is_owner ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '12px', color: '#888' }}>
                  👁
                  {post.visibility === 'public' && ' 所有人可见'}
                  {post.visibility === 'alumni_only' && ' 仅校友可见'}
                  {post.visibility === 'classmate_only' && ' 仅本班同学可见'}
                  {post.visibility === 'private' && ' 仅自己可见'}
                </span>
                <button
                  type="button"
                  onClick={handleDeletePost}
                  className="btn btn-outline-danger btn-sm"
                  disabled={actionLoading}
                >
                  删除
                </button>
              </div>
            ) : (
              <Link to={`/tickets/new/post/${post.id}`} className="btn btn-outline-danger btn-sm">
                举报
              </Link>
            )}
          </div>

          <div style={{ marginTop: '12px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={handleToggleLike}
              disabled={actionLoading}
              className="btn btn-outline-warning btn-sm"
            >
              ❤️ 点赞/取消
            </button>
          </div>

          <div style={{ marginTop: '12px' }}>
            <input
              type="text"
              value={commentDraft}
              onChange={(event) => setCommentDraft(event.target.value.slice(0, 200))}
              placeholder="发表评论"
              className="form-control form-control-sm"
              disabled={actionLoading}
              maxLength={200}
            />
            <div className="form-text">最多 200 字</div>
          </div>
          <div style={{ marginTop: '8px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={replyTarget}
              onChange={(event) => setReplyTarget(event.target.value)}
              className="form-select form-select-sm"
              style={{ maxWidth: '140px' }}
            >
              <option value="">不回复</option>
              {comments.map((comment, index) => (
                <option key={comment.id} value={comment.id}>
                  {String(index + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
            <button
              onClick={handleAddComment}
              disabled={actionLoading}
              className="btn btn-outline-dark btn-sm"
            >
              ➕ 发布评论
            </button>
          </div>

          {comments.length > 0 && (
            <div style={{ marginTop: '12px', fontSize: '13px' }}>
              {comments.map((comment, index) => {
                const commentAuthor = comment.author?.nickname || '匿名用户';
                const parentComment = comment.parent_id
                  ? comments.find((item) => item.id === comment.parent_id)
                  : null;
                const replyTargetName = parentComment?.author?.nickname;
                const displayText = replyTargetName
                  ? `“${commentAuthor}”回复“${replyTargetName}”：${comment.content}`
                  : `“${commentAuthor}”：${comment.content}`;
                const displayIndex = String(index + 1).padStart(2, '0');

                return (
                  <div key={comment.id} style={{ marginBottom: '6px' }}>
                    <strong>{displayIndex}.</strong> {displayText}
                    <button
                      onClick={() => handleToggleCommentLike(comment.id)}
                      disabled={actionLoading}
                      className="btn btn-link btn-sm"
                      style={{ padding: '0 4px' }}
                    >
                      ❤️
                    </button>
                    <span style={{ marginLeft: '4px' }}>{comment.like_count || 0}</span>
                    {currentUserId && comment.author_id === currentUserId ? (
                      <button
                        type="button"
                        onClick={() => handleDeleteComment(comment.id)}
                        disabled={actionLoading}
                        className="btn btn-link btn-sm"
                        style={{ padding: '0 4px' }}
                      >
                        🗑️
                      </button>
                    ) : (
                      <Link
                        to={`/tickets/new/comment/${comment.id}`}
                        className="btn btn-link btn-sm"
                        style={{ padding: '0 4px', color: '#9aa0a6' }}
                        title="举报评论"
                      >
                        ⚠️
                      </Link>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
          返回
        </button>
      </section>

      {activeMedia &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className={postStyles.mediaOverlay} onClick={closeMedia} role="dialog" aria-modal>
            <div className={postStyles.mediaDialog} onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className={postStyles.mediaClose}
                onClick={closeMedia}
                aria-label="Close"
              >
                X
              </button>
              {activeMedia.isVideo ? (
                <video
                  src={activeMedia.url}
                  className={postStyles.mediaContent}
                  controls
                  autoPlay
                />
              ) : (
                <img src={activeMedia.url} alt="post media" className={postStyles.mediaContent} />
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};

export default PostDetail;
