import React, { useMemo, useRef } from 'react';
import { Link } from 'react-router-dom';
import styles from './PostCommentList.module.css';

const formatDate = (value) => {
  if (!value) return '';
  try {
    return new Date(value).toLocaleDateString('zh-CN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

const truncateText = (text = '', maxLength = 24) => {
  if (!text) return '';
  const cleanText = String(text).trim();
  if (cleanText.length <= maxLength) return cleanText;
  return `${cleanText.slice(0, maxLength)}…`;
};

const PostCommentList = ({
  comments,
  currentUserId,
  onToggleLike,
  onDeleteComment,
  onReplySelect,
  actionLoading,
}) => {
  const highlightTimerRef = useRef(null);
  const commentMap = useMemo(() => {
    const map = new Map();
    (comments || []).forEach((comment) => {
      map.set(comment.id, comment);
    });
    return map;
  }, [comments]);

  const handleJumpToComment = (commentId) => {
    if (typeof document === 'undefined' || typeof window === 'undefined') return;
    const target = document.getElementById(`comment-${commentId}`);
    if (!target) return;

    target.scrollIntoView({ behavior: 'smooth', block: 'center' });
    target.classList.add(styles.commentHighlight);

    if (highlightTimerRef.current) {
      window.clearTimeout(highlightTimerRef.current);
    }

    highlightTimerRef.current = window.setTimeout(() => {
      target.classList.remove(styles.commentHighlight);
    }, 1600);
  };

  if (!comments || comments.length === 0) {
    return null;
  }

  return (
    <div className={styles.commentList}>
      {comments.map((comment, index) => {
        const authorName = comment.author?.nickname || '匿名用户';
        const isOwner = currentUserId && comment.author_id === currentUserId;
        const parentComment = comment.parent_id ? commentMap.get(comment.parent_id) : null;
        const replyTargetName = parentComment?.author?.nickname;
        const replySnippet = parentComment?.content ? truncateText(parentComment.content, 20) : '';
        const displayIndex = String(index + 1).padStart(2, '0');

        return (
          <div
            className={styles.commentCard}
            key={comment.id}
            id={`comment-${comment.id}`}
            data-animate="comment"
          >
            <div className={styles.commentHeader}>
              <div className={styles.authorBlock}>
                {comment.author?.avatar_url ? (
                  <img src={comment.author.avatar_url} alt={authorName} className={styles.avatar} />
                ) : (
                  <span className={styles.avatarFallback}>{authorName.charAt(0)}</span>
                )}
                <div>
                  <div className={styles.authorName}>
                    <span>{authorName}</span>
                    <span className={styles.commentIndex}>#{displayIndex}</span>
                  </div>
                  <div className={styles.commentMeta}>{formatDate(comment.created_at)}</div>
                </div>
              </div>
              <div className={styles.commentActions}>
                <button
                  type="button"
                  className={`${styles.iconButton} ${styles.likeButton} ${
                    comment.liked ? styles.likeButtonActive : ''
                  }`}
                  onClick={() => onToggleLike?.(comment.id)}
                  disabled={actionLoading}
                  aria-label="点赞评论"
                  aria-pressed={Boolean(comment.liked)}
                >
                  <i className="fas fa-heart" aria-hidden="true"></i>
                  <span>{comment.like_count || 0}</span>
                </button>
                <button
                  type="button"
                  className={styles.iconButton}
                  onClick={() => onReplySelect?.(comment.id)}
                  disabled={actionLoading}
                  aria-label="回复评论"
                >
                  <i className="fas fa-reply" aria-hidden="true"></i>
                  回复
                </button>
                {isOwner ? (
                  <button
                    type="button"
                    className={`${styles.iconButton} ${styles.dangerButton}`}
                    onClick={() => onDeleteComment?.(comment.id)}
                    disabled={actionLoading}
                    aria-label="删除评论"
                  >
                    <i className="fas fa-trash" aria-hidden="true"></i>
                  </button>
                ) : (
                  <Link
                    to={`/tickets/new/comment/${comment.id}`}
                    className={`${styles.iconButton} ${styles.reportButton}`}
                    title="举报评论"
                  >
                    <i className="fas fa-flag" aria-hidden="true"></i>
                  </Link>
                )}
              </div>
            </div>
            {comment.parent_id && parentComment && (
              <button
                type="button"
                className={styles.replyPreview}
                onClick={() => handleJumpToComment(parentComment.id)}
                title="跳转到原评论"
              >
                <span className={styles.replyLabel}>回复 {replyTargetName || '匿名用户'}</span>
                <span className={styles.replySnippet}>“{replySnippet}”</span>
                <i className={`fas fa-arrow-right ${styles.replyIcon}`} aria-hidden="true"></i>
              </button>
            )}
            {comment.parent_id && !parentComment && (
              <div className={styles.replyHint}>回复的评论已删除</div>
            )}
            <p className={styles.commentBody}>{comment.content}</p>
          </div>
        );
      })}
    </div>
  );
};

export default PostCommentList;
