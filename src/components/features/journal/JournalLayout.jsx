import React from 'react';
import styles from '../../../pages/Journal.module.css';

const JournalLayout = ({ children }) => {
  // 确保只有两个子元素（PDF 和 MD）
  const [pdfSection, mdSection] = React.Children.toArray(children);

  return (
    <div className={styles.layoutContainer}>
      <div className={styles.column}>{pdfSection}</div>
      <div className={styles.divider} />
      <div className={styles.column}>{mdSection}</div>
    </div>
  );
};

export default JournalLayout;
