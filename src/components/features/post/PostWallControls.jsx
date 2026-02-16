import React from 'react';
import styles from './PostWallControls.module.css';

const PostWallControls = ({
  searchKeyword,
  searchSortBy,
  onKeywordChange,
  onSortChange,
  onSearch,
  onReset,
  actionLoading,
}) => {
  return (
    <div className={styles.controls}>
      <div className={styles.controlGroup} data-animate="toolbar">
        <span className={styles.label}>关键词</span>
        <div className={styles.inputWrap}>
          <i className={`fas fa-search ${styles.inputIcon}`} aria-hidden="true"></i>
          <input
            type="text"
            value={searchKeyword}
            onChange={(event) => onKeywordChange(event.target.value)}
            placeholder="搜索标题或内容"
            className={`form-control ${styles.input}`}
          />
        </div>
      </div>
      <div className={styles.controlGroup} data-animate="toolbar">
        <span className={styles.label}>排序</span>
        <select
          value={searchSortBy}
          onChange={(event) => onSortChange(event.target.value)}
          className={`form-select ${styles.select}`}
        >
          <option value="time">按时间</option>
          <option value="likes">按点赞</option>
        </select>
      </div>
      <div className={styles.actionGroup} data-animate="toolbar">
        <button
          type="button"
          onClick={onSearch}
          disabled={actionLoading}
          className={`scene-button ghost ${styles.actionButton}`}
        >
          {actionLoading ? '处理中...' : '搜索'}
        </button>
        <button
          type="button"
          onClick={onReset}
          disabled={actionLoading}
          className={`scene-button ghost ${styles.actionButton}`}
        >
          重置
        </button>
      </div>
    </div>
  );
};

export default PostWallControls;
