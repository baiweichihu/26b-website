import React from 'react';
import styles from './PostWallEmptyState.module.css';

const PostWallEmptyState = ({ onCreatePost, actionLoading }) => {
  return (
    <div className={styles.emptyState} data-animate="state">
      <div className={styles.emptyIcon}>
        <i className="fas fa-comment-dots" aria-hidden="true"></i>
      </div>
      <h3>暂时还没有帖子</h3>
      <p>成为第一个为 26B 班留言的人，留下新的回忆。</p>
      <button
        type="button"
        className={`scene-button primary ${styles.emptyButton}`}
        onClick={onCreatePost}
        disabled={actionLoading}
      >
        立即发布
      </button>
    </div>
  );
};

export default PostWallEmptyState;
