import React from 'react';
import PostCommentComposer from './PostCommentComposer';
import PostCommentList from './PostCommentList';
import detailStyles from '../../../pages/post/PostDetail.module.css';

const PostDetailComments = ({
  commentCount,
  comments,
  currentUserId,
  onToggleCommentLike,
  onDeleteComment,
  onReplySelect,
  onReportComment,
  actionLoading,
  composerRef,
  commentDraft,
  onDraftChange,
  onAddComment,
  replyTargetName,
  onClearReply,
}) => {
  return (
    <>
      <div className={detailStyles.sectionHeader} data-animate="content">
        <h2 className={detailStyles.sectionTitle}>评论</h2>
        <span className={detailStyles.sectionHint}>{commentCount} 条评论</span>
      </div>

      {comments.length === 0 && (
        <div className={detailStyles.sectionHint} data-animate="content">
          还没有评论，快来抢沙发。
        </div>
      )}

      <PostCommentList
        comments={comments}
        currentUserId={currentUserId}
        onToggleLike={onToggleCommentLike}
        onDeleteComment={onDeleteComment}
        onReplySelect={onReplySelect}
        onReport={onReportComment}
        actionLoading={actionLoading}
      />

      <PostCommentComposer
        ref={composerRef}
        commentDraft={commentDraft}
        onDraftChange={onDraftChange}
        onSubmit={onAddComment}
        replyTargetName={replyTargetName}
        onClearReply={onClearReply}
        disabled={actionLoading}
        maxLength={200}
      />
    </>
  );
};

export default PostDetailComments;
