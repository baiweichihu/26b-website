import React, { useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link, useNavigate } from 'react-router-dom';
import styles from './PostCard.module.css';

const PostCard = ({ post, onDeletePost }) => {
  const navigate = useNavigate();
  const date = new Date(post.created_at);
  const formattedDate = date.toLocaleDateString('zh-CN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  // 获取作者信息
  const author = post.author || {};
  const authorName = author.nickname || '匿名';
  const avatarUrl = author.avatar_url;
  const avatarText = authorName.charAt(0);

  // 获取统计信息
  const likeCount = post.like_count || 0;
  const commentCount = post.comment_count || 0;
  const viewCount = post.view_count || 0;

  const [activeMedia, setActiveMedia] = useState(null);
  const content = post.content || '';
  const hasMedia = Boolean(post.media_urls && post.media_urls.length > 0);
  const isTitleLikelyTwoLines = Boolean(post.title && post.title.length > 12);
  const displayContent = useMemo(() => {
    return content;
  }, [content]);

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

  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div
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
      >
        {/* 头部：作者信息 */}
        <div className={`d-flex align-items-center ${styles.postHeader}`}>
          <div className="me-3">
            <div className={styles.avatarCircle}>
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt={authorName}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                <span>{avatarText}</span>
              )}
            </div>
          </div>
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center">
              <span className={styles.postAuthorName}>{authorName}</span>
              <span className={`${styles.postDate} text-muted small`}>{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* 标题 */}
        {post.title && (
          <h3 className={`${styles.postTitle} ${styles.postTitleClamp} ${styles.postClampFade}`}>
            {post.title}
          </h3>
        )}

        {/* 内容缩略 */}
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

          {/* 图片/视频列表 */}
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

        {/* 统计信息 */}
        <div className={`d-flex justify-content-between align-items-center ${styles.postFooter}`}>
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
                onClick={(event) => {
                  event.stopPropagation();
                  onDeletePost();
                }}
                className="btn btn-outline-danger btn-sm"
                onMouseDown={stopPropagation}
              >
                删除
              </button>
            </div>
          ) : (
            <Link
              to={`/tickets/new/post/${post.id}`}
              className="btn btn-outline-danger btn-sm"
              onClick={stopPropagation}
            >
              举报
            </Link>
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
                X
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
    </div>
  );
};

export default PostCard;
