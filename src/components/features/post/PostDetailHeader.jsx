import React from 'react';
import detailStyles from '../../../pages/post/PostDetail.module.css';

const PostDetailHeader = ({ title, formattedDate, onBack }) => {
  return (
    <header className={detailStyles.detailHeader}>
      <div>
        <p className="scene-kicker" data-animate="detail">
          帖子详情
        </p>
        <h1 className="scene-title" data-animate="detail">
          {title || '帖子'}
        </h1>
        <div className={detailStyles.headerMeta} data-animate="detail">
          <span>{formattedDate}</span>
        </div>
      </div>
      <button
        type="button"
        className={`scene-button ghost ${detailStyles.backButton}`}
        onClick={onBack}
        data-animate="detail"
      >
        <i className="fas fa-arrow-left" aria-hidden="true"></i>
        返回
      </button>
    </header>
  );
};

export default PostDetailHeader;
