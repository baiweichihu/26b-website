import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { createPortal } from 'react-dom';
import { supabase } from '../../lib/supabase';
import {
  getPostById,
  getComments,
  togglePostLike,
  addComment,
  toggleCommentLike,
  deletePost,
  deleteComment,
} from '../../services/postService';
import NoticeBox from '../../components/widgets/NoticeBox';
import PostMetrics from '../../components/features/post/PostMetrics';
import PostCommentComposer from '../../components/features/post/PostCommentComposer';
import PostCommentList from '../../components/features/post/PostCommentList';
import styles from './Wall.module.css';
import postStyles from '../../components/features/post/PostCard.module.css';
import detailStyles from './PostDetail.module.css';

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
  const [likeLoading, setLikeLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [activeMedia, setActiveMedia] = useState(null);
  const hasCountedViewRef = useRef(false);
  const panelRef = useRef(null);
  const composerRef = useRef(null);

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
  const isLiked = Boolean(post?.liked);

  const isVideoUrl = (url = '') => {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return ['.mp4', '.webm', '.mov', '.m4v'].some((ext) => cleanUrl.endsWith(ext));
  };

  const openMedia = (url) => {
    setActiveMedia({ url, isVideo: isVideoUrl(url) });
  };

  const closeMedia = () => setActiveMedia(null);

  const loadPostDetail = async (options = {}) => {
    if (!postId) return;
    setLoading(true);
    setNotice(null);

    const { incrementView } = options;
    const shouldIncrementView =
      typeof incrementView === 'boolean' ? incrementView : !hasCountedViewRef.current;

    const result = await getPostById(postId, { incrementView: shouldIncrementView });
    if (!result.success) {
      setNotice({ type: 'error', message: result.error || '无法加载帖子详情' });
      setLoading(false);
      return;
    }

    setPost(result.data);
    if (shouldIncrementView) {
      hasCountedViewRef.current = true;
    }
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
    hasCountedViewRef.current = false;
    const timer = setTimeout(() => {
      loadPostDetail({ incrementView: true });
      loadComments();
    }, 0);

    return () => clearTimeout(timer);
  }, [postId]);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const panel = panelRef.current;
    if (!gsap || !panel || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      const headerItems = panel.querySelectorAll('[data-animate="detail"]');
      const contentItems = panel.querySelectorAll('[data-animate="content"]');
      const commentItems = panel.querySelectorAll('[data-animate="comment"]');

      gsap.from(panel, { opacity: 0, y: 14, duration: 0.45, ease: 'power2.out' });
      gsap.from(headerItems, {
        opacity: 0,
        y: 16,
        duration: 0.55,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.05,
      });
      gsap.from(contentItems, {
        opacity: 0,
        y: 16,
        duration: 0.55,
        ease: 'power2.out',
        stagger: 0.08,
        delay: 0.15,
      });
      if (commentItems.length > 0) {
        gsap.from(commentItems, {
          opacity: 0,
          y: 12,
          duration: 0.5,
          ease: 'power2.out',
          stagger: 0.05,
          delay: 0.2,
        });
      }
    }, panel);

    return () => ctx.revert();
  }, [postId, loading, comments.length]);

  const handleToggleLike = async () => {
    if (!currentUserId) {
      setNotice({ type: 'info', message: '你还未登录，登录后可查看完整内容。' });
      return;
    }

    if (!post) {
      return;
    }

    const nextLiked = !post.liked;
    const delta = nextLiked ? 1 : -1;
    const nextLikeCount = Math.max(0, (post.like_count || 0) + delta);

    setPost((prevPost) =>
      prevPost
        ? {
            ...prevPost,
            liked: nextLiked,
            like_count: nextLikeCount,
          }
        : prevPost
    );

    setLikeLoading(true);
    setNotice(null);

    const result = await togglePostLike(postId);
    if (result.success) {
      const serverLiked = result.data?.liked;
      if (typeof serverLiked === 'boolean' && serverLiked !== nextLiked) {
        const serverDelta = serverLiked ? 1 : -1;
        setPost((prevPost) =>
          prevPost
            ? {
                ...prevPost,
                liked: serverLiked,
                like_count: Math.max(0, (prevPost.like_count || 0) + serverDelta),
              }
            : prevPost
        );
      }
    } else {
      setPost((prevPost) =>
        prevPost
          ? {
              ...prevPost,
              liked: !nextLiked,
              like_count: Math.max(0, (prevPost.like_count || 0) - delta),
            }
          : prevPost
      );
      setNotice({ type: 'error', message: result.error || '点赞失败' });
    }

    setLikeLoading(false);
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
      await loadPostDetail({ incrementView: false });
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

    let previousState = null;

    setComments((prevComments) =>
      prevComments.map((comment) => {
        if (comment.id !== commentId) {
          return comment;
        }

        previousState = {
          liked: Boolean(comment.liked),
          like_count: comment.like_count || 0,
        };

        const nextLiked = !comment.liked;
        const delta = nextLiked ? 1 : -1;

        return {
          ...comment,
          liked: nextLiked,
          like_count: Math.max(0, (comment.like_count || 0) + delta),
        };
      })
    );

    setActionLoading(true);
    setNotice(null);

    const result = await toggleCommentLike(commentId);
    if (result.success) {
      const serverLiked = result.data?.liked;
      if (typeof serverLiked === 'boolean') {
        setComments((prevComments) =>
          prevComments.map((comment) => {
            if (comment.id !== commentId) {
              return comment;
            }

            if (comment.liked === serverLiked) {
              return comment;
            }

            const delta = serverLiked ? 1 : -1;
            return {
              ...comment,
              liked: serverLiked,
              like_count: Math.max(0, (comment.like_count || 0) + delta),
            };
          })
        );
      }
    } else {
      if (previousState) {
        setComments((prevComments) =>
          prevComments.map((comment) =>
            comment.id === commentId
              ? {
                  ...comment,
                  liked: previousState.liked,
                  like_count: previousState.like_count,
                }
              : comment
          )
        );
      }
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
      await loadPostDetail({ incrementView: false });
    } else {
      setNotice({ type: 'error', message: result.error || '删除评论失败' });
    }

    setActionLoading(false);
  };

  const handleReplySelect = (commentId) => {
    setReplyTarget(commentId);
    if (composerRef.current) {
      composerRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  };

  const authorName = post?.author?.display_nickname || post?.author?.nickname || '匿名';
  const replyTargetName = useMemo(() => {
    if (!replyTarget) return '';
    const target = comments.find((comment) => comment.id === replyTarget);
    return target?.author?.nickname || '匿名用户';
  }, [replyTarget, comments]);

  const visibilityConfig = {
    public: { label: '所有人可见', icon: 'fa-globe' },
    alumni_only: { label: '仅校友可见', icon: 'fa-user-graduate' },
    classmate_only: { label: '仅本班同学可见', icon: 'fa-user-friends' },
    private: { label: '仅自己可见', icon: 'fa-lock' },
  };
  const visibilityMeta = visibilityConfig[post?.visibility] || visibilityConfig.public;

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
          <button className="scene-button ghost" onClick={() => navigate(-1)}>
            返回
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section
        className={`scene-panel ${styles.wallPanel} ${detailStyles.detailPanel}`}
        ref={panelRef}
      >
        <header className={detailStyles.detailHeader}>
          <div>
            <p className="scene-kicker" data-animate="detail">
              帖子详情
            </p>
            <h1 className="scene-title" data-animate="detail">
              {post.title || '帖子'}
            </h1>
            <div className={detailStyles.headerMeta} data-animate="detail">
              <span>{formattedDate}</span>
              <span className={detailStyles.metaBadge}>
                <i className={`fas ${visibilityMeta.icon}`} aria-hidden="true"></i>
                {visibilityMeta.label}
              </span>
            </div>
          </div>
          <button
            type="button"
            className={`scene-button ghost ${detailStyles.backButton}`}
            onClick={() => navigate(-1)}
            data-animate="detail"
          >
            <i className="fas fa-arrow-left" aria-hidden="true"></i>
            返回
          </button>
        </header>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        <article
          className={`${postStyles.postCard} ${postStyles.postCardDetail} ${detailStyles.detailCard}`}
          data-animate="content"
        >
          <div className={postStyles.postHeader}>
            <div className={postStyles.authorBlock}>
              <div className={postStyles.avatarCircle}>
                {post.author?.avatar_url ? (
                  <img src={post.author.avatar_url} alt={authorName} />
                ) : (
                  <span>{authorName.charAt(0)}</span>
                )}
              </div>
              <div className={postStyles.authorInfo}>
                <span className={postStyles.postAuthorName}>{authorName}</span>
                {post.is_anonymous && <span className={postStyles.anonymousTag}>匿名发布</span>}
              </div>
            </div>
            <span className={postStyles.postDate}>{formattedDate}</span>
          </div>

          <p className={detailStyles.contentText}>{post.content}</p>

          {post.media_urls && post.media_urls.length > 0 && (
            <div className={postStyles.postMedia}>
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

          <div className={detailStyles.detailFooter}>
            <PostMetrics
              viewCount={viewCount}
              likeCount={likeCount}
              commentCount={commentCount}
              isLiked={isLiked}
              onToggleLike={handleToggleLike}
              likeLoading={likeLoading}
              size="large"
              stopPropagation={false}
            />
            <div className={detailStyles.actionGroup}>
              {post.is_owner ? (
                <button
                  type="button"
                  onClick={handleDeletePost}
                  className={`${detailStyles.actionButton} ${detailStyles.dangerButton}`}
                  disabled={actionLoading}
                >
                  删除
                </button>
              ) : (
                <Link
                  to={`/tickets/new/post/${post.id}`}
                  className={`${detailStyles.actionButton} ${detailStyles.reportButton}`}
                >
                  举报
                </Link>
              )}
            </div>
          </div>
        </article>

        <div className={detailStyles.sectionHeader} data-animate="content">
          <h2 className={detailStyles.sectionTitle}>评论</h2>
          <span className={detailStyles.sectionHint}>{commentCount} 条评论</span>
        </div>

        {comments.length === 0 && (
          <div className={detailStyles.sectionHint} data-animate="content">
            还没有评论，快来抢沙发。
          </div>
        )}

        <PostCommentList
          comments={comments}
          currentUserId={currentUserId}
          onToggleLike={handleToggleCommentLike}
          onDeleteComment={handleDeleteComment}
          onReplySelect={handleReplySelect}
          actionLoading={actionLoading}
        />

        <PostCommentComposer
          ref={composerRef}
          commentDraft={commentDraft}
          onDraftChange={setCommentDraft}
          onSubmit={handleAddComment}
          replyTargetName={replyTargetName}
          onClearReply={() => setReplyTarget('')}
          disabled={actionLoading}
          maxLength={200}
        />
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
                ×
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
