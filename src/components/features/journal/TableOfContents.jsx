import React from 'react';
import styles from '../../../pages/journal/Journal.module.css';

const TableOfContents = ({ toc, currentSection, onTocClick }) => {
  if (!toc || toc.length === 0) {
    return (
      <div className={styles.tocContainer}>
        <h3 className={styles.tocTitle}>📑 目录</h3>
        <div className={styles.tocEmpty}>
          <p>正在生成目录...</p>
          <p>或文档中缺少标题</p>
        </div>
      </div>
    );
  }

  // 计算缩进
  const getIndent = (level) => {
    switch (level) {
      case 1:
        return '0px';
      case 2:
        return '16px';
      case 3:
        return '32px';
      default:
        return '0px';
    }
  };

  return (
    <div className={styles.tocContainer}>
      <h3 className={styles.tocTitle}>📑 目录</h3>
      <div className={styles.tocContent}>
        <ul className={styles.tocList}>
          {toc.map((item, index) => (
            <li
              key={index}
              className={`${styles.tocItem} ${
                currentSection === item.id ? styles.tocItemActive : ''
              }`}
              style={{
                paddingLeft: getIndent(item.level),
                fontWeight: item.level === 1 ? 'bold' : 'normal',
              }}
            >
              <button
                className={styles.tocLink}
                onClick={() => onTocClick(item.id)}
                title={item.title}
              >
                {item.level === 1 && '📖 '}
                {item.level === 2 && '📝 '}
                {item.level === 3 && '📄 '}
                <span className={styles.tocText}>
                  {item.title.length > 30 ? `${item.title.substring(0, 30)}...` : item.title}
                </span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <div className={styles.tocFooter}>
        <p className={styles.tocStats}>共 {toc.length} 个章节</p>
      </div>
    </div>
  );
};

export default TableOfContents;
