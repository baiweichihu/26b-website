import React from 'react';
import styles from './AlbumEmptyState.module.css';

const AlbumEmptyState = ({ isSearching, hasFolder, onNavigateBack }) => {
  if (isSearching) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <i className="fas fa-search"></i>
        </div>
        <h3 className={styles.emptyTitle}>未找到相关图片</h3>
        <p className={styles.emptyMessage}>
          尝试调整搜索关键词或浏览其他文件夹
        </p>
        <button 
          className="btn btn-outline-primary"
          onClick={() => onNavigateBack()}
        >
          返回浏览
        </button>
      </div>
    );
  }

  if (hasFolder) {
    return (
      <div className={styles.emptyState}>
        <div className={styles.emptyIcon}>
          <i className="fas fa-image"></i>
        </div>
        <h3 className={styles.emptyTitle}>文件夹为空</h3>
        <p className={styles.emptyMessage}>
          这个文件夹还没有任何图片，上传第一张图片开始分享吧
        </p>
      </div>
    );
  }

  return (
    <div className={styles.emptyState}>
      <div className={styles.emptyIcon}>
        <i className="fas fa-images"></i>
      </div>
      <h3 className={styles.emptyTitle}>还没有相册</h3>
      <p className={styles.emptyMessage}>
        创建第一个文件夹开始整理和分享你的照片
      </p>
    </div>
  );
};

export default AlbumEmptyState;