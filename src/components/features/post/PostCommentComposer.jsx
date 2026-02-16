import React, { forwardRef } from 'react';
import styles from './PostCommentComposer.module.css';

const PostCommentComposer = forwardRef(
  (
    {
      commentDraft,
      onDraftChange,
      onSubmit,
      replyTargetName,
      onClearReply,
      disabled,
      maxLength = 200,
    },
    ref
  ) => {
    const isSubmitDisabled = disabled || !commentDraft.trim();

    return (
      <div className={styles.composer} ref={ref} data-animate="content">
        <div className={styles.composerHeader}>
          <div>
            <p className={styles.kicker}>发表评论</p>
            <h3 className={styles.title}>说点什么吧</h3>
          </div>
          {replyTargetName && (
            <div className={styles.replyChip}>
              <span>回复 {replyTargetName}</span>
              <button
                type="button"
                className={styles.replyClear}
                onClick={onClearReply}
                aria-label="取消回复"
              >
                <i className="fas fa-times" aria-hidden="true"></i>
              </button>
            </div>
          )}
        </div>
        <textarea
          className={`form-control ${styles.textarea}`}
          value={commentDraft}
          onChange={(event) => onDraftChange(event.target.value.slice(0, maxLength))}
          placeholder="写下你的想法..."
          rows={3}
          maxLength={maxLength}
          disabled={disabled}
        />
        <div className={styles.composerFooter}>
          <span className={styles.charHint}>
            {commentDraft.length}/{maxLength}
          </span>
          <button
            type="button"
            className={`scene-button primary ${styles.submitButton}`}
            onClick={onSubmit}
            disabled={isSubmitDisabled}
          >
            <i className="fas fa-paper-plane" aria-hidden="true"></i>
            发布评论
          </button>
        </div>
      </div>
    );
  }
);

PostCommentComposer.displayName = 'PostCommentComposer';

export default PostCommentComposer;
