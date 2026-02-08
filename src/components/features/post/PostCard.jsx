import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import styles from './PostCard.module.css';

const PostCard = ({
  post,
  comments = [],
  commentDraft,
  replyTarget,
  testLoading,
  onToggleLike,
  onSimulateView,
  onCommentDraftChange,
  onReplyTargetChange,
  onAddComment,
  onToggleCommentLike,
}) => {
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

  const [isExpanded, setIsExpanded] = useState(false);
  const content = post.content || '';
  const shouldTruncate = content.length > 150;
  const displayContent = useMemo(() => {
    if (!shouldTruncate || isExpanded) {
      return content;
    }
    return `${content.slice(0, 150)}...`;
  }, [content, isExpanded, shouldTruncate]);

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
        <div className={`${styles.postContent} mb-3`}>
          <div>{displayContent}</div>
          {shouldTruncate && (
            <button
              type="button"
              onClick={() => setIsExpanded((prev) => !prev)}
              className="btn btn-link btn-sm"
              style={{ padding: 0 }}
            >
              {isExpanded ? '收起' : '展开'}
            </button>
          )}
        </div>

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
          <Link to={`/tickets/new/post/${post.id}`} className="btn btn-outline-danger btn-sm">
            举报
          </Link>
        </div>

        <div style={{ marginTop: '10px' }}>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button
              onClick={onToggleLike}
              disabled={testLoading}
              className="btn btn-outline-warning btn-sm"
            >
              {testLoading ? '测试中...' : '❤️ 点赞/取消'}
            </button>
            <button
              onClick={onSimulateView}
              disabled={testLoading}
              className="btn btn-outline-info btn-sm"
            >
              {testLoading ? '测试中...' : '👀 模拟他人浏览'}
            </button>
          </div>

          <div style={{ marginTop: '8px' }}>
            <input
              type="text"
              value={commentDraft || ''}
              onChange={(event) => onCommentDraftChange(event.target.value)}
              placeholder="发表评论"
              className="form-control form-control-sm"
            />
          </div>
          <div style={{ marginTop: '6px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <select
              value={replyTarget || ''}
              onChange={(event) => onReplyTargetChange(event.target.value)}
              className="form-select form-select-sm"
              style={{ maxWidth: '140px' }}
            >
              <option value="">不回复</option>
              {comments.map((comment, index) => (
                <option key={comment.id} value={comment.id}>
                  {String(index + 1).padStart(2, '0')}
                </option>
              ))}
            </select>
            <button
              onClick={onAddComment}
              disabled={testLoading}
              className="btn btn-outline-dark btn-sm"
            >
              {testLoading ? '测试中...' : '➕ 发布评论'}
            </button>
          </div>

          {comments.length > 0 && (
            <div style={{ marginTop: '8px', fontSize: '13px' }}>
              {comments.map((comment, index) => {
                const authorName = comment.author?.nickname || '匿名用户';
                const parentComment = comment.parent_id
                  ? comments.find((item) => item.id === comment.parent_id)
                  : null;
                const replyTargetName = parentComment?.author?.nickname;
                const displayText = replyTargetName
                  ? `“${authorName}”回复“${replyTargetName}”：${comment.content}`
                  : `“${authorName}”：${comment.content}`;
                const displayIndex = String(index + 1).padStart(2, '0');

                return (
                  <div key={comment.id} style={{ marginBottom: '4px' }}>
                    <strong>{displayIndex}.</strong> {displayText}
                    <button
                      onClick={() => onToggleCommentLike(comment.id)}
                      disabled={testLoading}
                      className="btn btn-link btn-sm"
                      style={{ padding: '0 4px' }}
                    >
                      ❤️
                    </button>
                    <span style={{ marginLeft: '4px' }}>{comment.like_count || 0}</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default PostCard;
