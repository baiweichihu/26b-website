import React from 'react';
import styles from './FolderCard.module.css';

const FolderCard = ({ folder, onNavigate }) => {
  const handleClick = () => {
    onNavigate(folder.id);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className={styles.folderCard} onClick={handleClick}>
      <div className={styles.folderIconWrap}>
        <div className={styles.folderIcon}>
          <i className="fas fa-folder"></i>
        </div>
      </div>
      
      <div className={styles.folderContent}>
        <h4 className={styles.folderName} title={folder.title}>{folder.title}</h4>
        <div className={styles.folderDate}>{formatDate(folder.created_at)}</div>
      </div>
    </div>
  );
};

export default FolderCard;