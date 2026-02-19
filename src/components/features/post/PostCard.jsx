import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import PostMetrics from './PostMetrics';
import styles from './PostCard.module.css';

const visibilityConfig = {
  public: { label: '所有人可见', icon: 'fa-globe' },
  alumni_only: { label: '仅校友可见', icon: 'fa-user-graduate' },
  classmate_only: { label: '仅本班同学可见', icon: 'fa-user-friends' },
  private: { label: '仅自己可见', icon: 'fa-lock' },
};

const PostCard = ({ post, onDeletePost, onToggleLike, likeLoading, onReport }) => {
  const navigate = useNavigate();
  const date = new Date(post.created_at);
  const formattedDate = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const author = post.author || {};
  const authorName = author.nickname || '匿名';
  const avatarUrl = author.avatar_url;
  const avatarText = authorName.charAt(0);

  const [activeMedia, setActiveMedia] = useState(null);
  const content = post.content || '';
  const hasMedia = Boolean(post.media_urls && post.media_urls.length > 0);
  const isTitleLikelyTwoLines = Boolean(post.title && post.title.length > 12);
  const displayContent = useMemo(() => content, [content]);
  const visibilityMeta = visibilityConfig[post.visibility] || visibilityConfig.public;

  // 检查是否显示可见性标签：只有作者、管理员、超级管理员可见
  // 注意：post.viewer_role 是由 postService 在处理帖子时注入的当前用户角色
  const showVisibilityBadge = 
    post.is_owner || 
    post.viewer_role === 'admin' || 
    post.viewer_role === 'superuser';

  const isVideoUrl = (url = '') => {
    const cleanUrl = url.split('?')[0].split('#')[0].toLowerCase();
    return ['.mp4', '.webm', '.mov', '.m4v'].some((ext) => cleanUrl.endsWith(ext));
  };

  const openMedia = (event, url) => {
    event.stopPropagation();
    setActiveMedia({ url, isVideo: isVideoUrl(url) });
  };

  const closeMedia = () => setActiveMedia(null);

  const handleNavigate = () => {
    navigate(`/posts/${post.id}`);
  };

  const stopPropagation = (event) => event.stopPropagation();

  const handleToggleLike = () => {
    onToggleLike?.(post.id);
  };

  return (
    <article
      className={`${styles.postCard} ${styles.postCardCompact}`}
      role="button"
      tabIndex={0}
      onClick={handleNavigate}
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          handleNavigate();
        }
      }}
      data-animate="card"
    >
      <div className={styles.postHeader}>
        <div className={styles.authorBlock}>
          <div className={styles.avatarCircle}>
            {avatarUrl ? <img src={avatarUrl} alt={authorName} /> : <span>{avatarText}</span>}
          </div>
          <div className={styles.authorInfo}>
            <span className={styles.postAuthorName}>{authorName}</span>
            {post.is_anonymous && <span className={styles.anonymousTag}>匿名发布</span>}
          </div>
        </div>
        <span className={styles.postDate}>{formattedDate}</span>
      </div>

      {post.title && (
        <h3 className={`${styles.postTitle} ${styles.postTitleClamp} ${styles.postClampFade}`}>
          {post.title}
        </h3>
      )}

      <div className={styles.postBody}>
        <div
          className={`${styles.postContent} ${
            hasMedia
              ? isTitleLikelyTwoLines
                ? styles.postContentClampWithMediaTight
                : styles.postContentClampWithMedia
              : isTitleLikelyTwoLines
                ? styles.postContentClampNoMediaTight
                : styles.postContentClampNoMedia
          } ${styles.postClampFade}`}
        >
          {displayContent}
        </div>

        {hasMedia && (
          <div className={styles.postMedia} onClick={stopPropagation}>
            <div className={styles.mediaGrid}>
              {post.media_urls.map((url, idx) =>
                isVideoUrl(url) ? (
                  <video
                    key={idx}
                    src={url}
                    className={styles.mediaThumb}
                    onClick={(event) => openMedia(event, url)}
                    muted
                    preload="metadata"
                  />
                ) : (
                  <img
                    key={idx}
                    src={url}
                    alt={`帖子图片 ${idx + 1}`}
                    className={styles.mediaThumb}
                    onClick={(event) => openMedia(event, url)}
                  />
                )
              )}
            </div>
          </div>
        )}
      </div>

      <div className={styles.postFooter}>
        <PostMetrics
          viewCount={post.view_count}
          likeCount={post.like_count}
          commentCount={post.comment_count}
          isLiked={Boolean(post.liked)}
          onToggleLike={handleToggleLike}
          likeLoading={likeLoading}
        />
        <div className={styles.postActions}>
          {showVisibilityBadge && (
            <span className={styles.visibilityBadge}>
              <i className={`fas ${visibilityMeta.icon}`} aria-hidden="true"></i>
              {visibilityMeta.label}
            </span>
          )}
          {post.is_owner ? (
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                onDeletePost();
              }}
              className={styles.deleteButton}
              onMouseDown={stopPropagation}
            >
              删除
            </button>
          ) : (
            <button
              type="button"
              className={styles.reportButton}
              onClick={(event) => {
                event.stopPropagation();
                onReport?.(post);
              }}
              onMouseDown={stopPropagation}
            >
              举报
            </button>
          )}
        </div>
      </div>

      {activeMedia &&
        typeof document !== 'undefined' &&
        createPortal(
          <div className={styles.mediaOverlay} onClick={closeMedia} role="dialog" aria-modal>
            <div className={styles.mediaDialog} onClick={(event) => event.stopPropagation()}>
              <button
                type="button"
                className={styles.mediaClose}
                onClick={closeMedia}
                aria-label="Close"
              >
                ×
              </button>
              {activeMedia.isVideo ? (
                <video src={activeMedia.url} className={styles.mediaContent} controls autoPlay />
              ) : (
                <img src={activeMedia.url} alt="post media" className={styles.mediaContent} />
              )}
            </div>
          </div>,
          document.body
        )}
    </article>
  );
};

export default PostCard;
