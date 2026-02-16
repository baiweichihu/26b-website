import React from 'react';
import styles from './PostMetrics.module.css';

const formatCount = (value) => {
  const safeValue = Number(value || 0);
  if (Number.isNaN(safeValue)) return '0';
  return safeValue.toLocaleString('zh-CN');
};

const PostMetrics = ({
  viewCount = 0,
  likeCount = 0,
  commentCount = 0,
  isLiked = false,
  likeLoading = false,
  onToggleLike,
  size = 'compact',
  stopPropagation = true,
}) => {
  const isLarge = size === 'large';
  const metricsClass = `${styles.metrics} ${isLarge ? styles.metricsLarge : styles.metricsCompact}`;

  const handleLikeClick = (event) => {
    if (stopPropagation) {
      event.stopPropagation();
    }
    onToggleLike?.();
  };

  return (
    <div className={metricsClass}>
      <div className={styles.metricChip}>
        <i className={`fas fa-eye ${styles.metricIcon}`} aria-hidden="true"></i>
        <span>{formatCount(viewCount)}</span>
      </div>
      {onToggleLike ? (
        <button
          type="button"
          className={`${styles.metricChip} ${styles.metricButton} ${
            isLiked ? styles.metricButtonActive : ''
          }`}
          onClick={handleLikeClick}
          disabled={likeLoading}
          aria-pressed={isLiked}
          aria-label={isLiked ? '取消点赞' : '点赞'}
        >
          <i className={`fas fa-heart ${styles.metricIcon}`} aria-hidden="true"></i>
          <span>{formatCount(likeCount)}</span>
        </button>
      ) : (
        <div className={styles.metricChip}>
          <i className={`fas fa-heart ${styles.metricIcon}`} aria-hidden="true"></i>
          <span>{formatCount(likeCount)}</span>
        </div>
      )}
      <div className={styles.metricChip}>
        <i className={`fas fa-comment-dots ${styles.metricIcon}`} aria-hidden="true"></i>
        <span>{formatCount(commentCount)}</span>
      </div>
    </div>
  );
};

export default PostMetrics;
