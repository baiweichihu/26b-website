import React from 'react';
import styles from './PostWallHero.module.css';

const formatCount = (value) => {
  const safeValue = Number(value || 0);
  if (Number.isNaN(safeValue)) return '0';
  return safeValue.toLocaleString('zh-CN');
};

const PostWallHero = ({ onCreatePost, actionLoading, stats }) => {
  const safeStats = {
    totalPosts: stats?.totalPosts || 0,
    totalLikes: stats?.totalLikes || 0,
    totalComments: stats?.totalComments || 0,
    totalViews: stats?.totalViews || 0,
  };

  return (
    <div className={styles.hero}>
      <div className={styles.heroContent}>
        <p className="scene-kicker" data-animate="hero">
          班级留言墙
        </p>
        <h1 className="scene-title" data-animate="hero">
          共享笔记与回响
        </h1>
        <p className="scene-subtitle" data-animate="hero">
          留下留言、庆祝里程碑，或为班级写下一段短短的回忆。
        </p>
        <div className={`scene-actions ${styles.heroActions}`} data-animate="hero">
          <button
            type="button"
            className={`scene-button primary ${styles.heroButton}`}
            onClick={onCreatePost}
            disabled={actionLoading}
          >
            <i className="fas fa-pen" aria-hidden="true"></i>
            发布帖子
          </button>
        </div>
      </div>
      <div className={styles.heroStats} data-animate="hero">
        <div className={styles.statCard} data-animate="hero">
          <div className={styles.statIcon}>
            <i className="fas fa-pen" aria-hidden="true"></i>
          </div>
          <div>
            <span className={styles.statLabel}>累计帖子</span>
            <span className={styles.statValue}>{formatCount(safeStats.totalPosts)}</span>
          </div>
        </div>
        <div className={styles.statCard} data-animate="hero">
          <div className={styles.statIcon}>
            <i className="fas fa-heart" aria-hidden="true"></i>
          </div>
          <div>
            <span className={styles.statLabel}>点赞数</span>
            <span className={styles.statValue}>{formatCount(safeStats.totalLikes)}</span>
          </div>
        </div>
        <div className={styles.statCard} data-animate="hero">
          <div className={styles.statIcon}>
            <i className="fas fa-comment-dots" aria-hidden="true"></i>
          </div>
          <div>
            <span className={styles.statLabel}>评论数</span>
            <span className={styles.statValue}>{formatCount(safeStats.totalComments)}</span>
          </div>
        </div>
        <div className={styles.statCard} data-animate="hero">
          <div className={styles.statIcon}>
            <i className="fas fa-eye" aria-hidden="true"></i>
          </div>
          <div>
            <span className={styles.statLabel}>浏览数</span>
            <span className={styles.statValue}>{formatCount(safeStats.totalViews)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostWallHero;
