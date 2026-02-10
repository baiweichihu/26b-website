import React from 'react';
import styles from './NoticeBox.module.css';

const NoticeBox = ({ type = 'info', message }) => {
  if (!message) return null;

  const typeClass = styles[type] || styles.info;

  return (
    <div className={`${styles.noticeBox} ${typeClass}`} role="status">
      <span className={styles.noticeText}>{message}</span>
    </div>
  );
};

export default NoticeBox;
