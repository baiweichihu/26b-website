import React from 'react';
import styles from './PostCard.module.css';

const PostCard = ({ post }) => {
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

  return (
    <div className="col-12 col-md-6 col-lg-4">
      <div className={styles.postCard}>
        {/* 头部：作者信息 */}
        <div className="d-flex align-items-center mb-3">
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

        {/* 内容 */}
        <div className={`${styles.postContent} mb-3`}>{post.content}</div>

        {/* 图片列表 */}
        {post.media_urls && post.media_urls.length > 0 && (
          <div className="mb-3">
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                gap: '8px',
              }}
            >
              {post.media_urls.map((url, idx) => (
                <img
                  key={idx}
                  src={url}
                  alt={`帖子图片 ${idx + 1}`}
                  style={{
                    width: '100%',
                    height: '150px',
                    objectFit: 'cover',
                    borderRadius: '8px',
                    cursor: 'pointer',
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* 统计信息 */}
        <div className="d-flex justify-content-between align-items-center mt-3 pt-2 border-top">
          <div style={{ fontSize: '12px', color: '#666' }}>
            <span className="me-3">👁 {viewCount}</span>
            <span className="me-3">❤️ {likeCount}</span>
            <span>💬 {commentCount}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PostCard;
