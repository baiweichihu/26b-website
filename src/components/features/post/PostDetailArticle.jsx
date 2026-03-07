import React from 'react';
import PostMetrics from './PostMetrics';
import postStyles from './PostCard.module.css';
import detailStyles from '../../../pages/post/PostDetail.module.css';

const PostDetailArticle = ({
  post,
  authorName,
  formattedDate,
  isVideoUrl,
  onOpenMedia,
  viewCount,
  likeCount,
  commentCount,
  isLiked,
  onToggleLike,
  likeLoading,
  actionLoading,
  onDeletePost,
  onReportPost,
}) => {
  return (
    <article
      className={`${postStyles.postCard} ${postStyles.postCardDetail} ${detailStyles.detailCard}`}
      data-animate="content"
    >
      <div className={postStyles.postHeader}>
        <div className={postStyles.authorBlock}>
          <div className={postStyles.avatarCircle}>
            {post.author?.avatar_url ? (
              <img src={post.author.avatar_url} alt={authorName} />
            ) : (
              <span>{authorName.charAt(0)}</span>
            )}
          </div>
          <div className={postStyles.authorInfo}>
            <span className={postStyles.postAuthorName}>{authorName}</span>
            {post.is_anonymous && <span className={postStyles.anonymousTag}>匿名发布</span>}
          </div>
        </div>
        <span className={postStyles.postDate}>{formattedDate}</span>
      </div>

      <p className={detailStyles.contentText}>{post.content}</p>

      {post.media_urls && post.media_urls.length > 0 && (
        <div className={postStyles.postMedia}>
          <div className={`${postStyles.mediaGrid} ${postStyles.mediaGridDetail}`}>
            {post.media_urls.map((url, idx) =>
              isVideoUrl(url) ? (
                <video
                  key={idx}
                  src={url}
                  className={`${postStyles.mediaThumb} ${postStyles.mediaThumbDetail}`}
                  onClick={() => onOpenMedia(url)}
                  muted
                  preload="metadata"
                />
              ) : (
                <img
                  key={idx}
                  src={url}
                  alt={`帖子图片 ${idx + 1}`}
                  className={`${postStyles.mediaThumb} ${postStyles.mediaThumbDetail}`}
                  onClick={() => onOpenMedia(url)}
                />
              )
            )}
          </div>
        </div>
      )}

      <div className={detailStyles.detailFooter}>
        <PostMetrics
          viewCount={viewCount}
          likeCount={likeCount}
          commentCount={commentCount}
          isLiked={isLiked}
          onToggleLike={onToggleLike}
          likeLoading={likeLoading}
          size="large"
          stopPropagation={false}
        />
        <div className={detailStyles.actionGroup}>
          {post.is_owner ? (
            <button
              type="button"
              onClick={onDeletePost}
              className={`${detailStyles.actionButton} ${detailStyles.dangerButton}`}
              disabled={actionLoading}
            >
              删除
            </button>
          ) : (
            <button
              type="button"
              className={`${detailStyles.actionButton} ${detailStyles.reportButton}`}
              onClick={onReportPost}
            >
              举报
            </button>
          )}
        </div>
      </div>
    </article>
  );
};

export default PostDetailArticle;
