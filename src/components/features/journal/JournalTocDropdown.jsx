import React from 'react';

const getLevelPadding = (level) => {
  if (level === 1) return '12px';
  if (level === 2) return '28px';
  return '44px';
};

const getLevelIcon = (level) => {
  if (level === 1) return '📖 ';
  if (level === 2) return '📝 ';
  return '📄 ';
};

const renderTocTitle = (title) => {
  if (!title) return '';
  return title.length > 25 ? `${title.substring(0, 25)}...` : title;
};

const JournalTocDropdown = ({
  styles,
  show,
  toc,
  currentSection,
  onTocClick,
}) => {
  if (!show) {
    return null;
  }

  return (
    <div className={styles.tocDropdown}>
      <div className={styles.tocDropdownHeader}>
        <h4>📑 目录</h4>
      </div>
      <div className={styles.tocDropdownContent}>
        {toc.length > 0 ? (
          <ul className={styles.tocDropdownList}>
            {toc.map((item, index) => (
              <li
                key={index}
                className={`${styles.tocDropdownItem} ${
                  currentSection === item.id ? styles.tocDropdownItemActive : ''
                }`}
                style={{
                  paddingLeft: getLevelPadding(item.level),
                }}
              >
                <button
                  className={styles.tocDropdownLink}
                  onClick={() => onTocClick(item.id)}
                  title={item.title}
                >
                  {getLevelIcon(item.level)}
                  <span>{renderTocTitle(item.title)}</span>
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <div className={styles.tocDropdownEmpty}>
            <p>正在生成目录...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default JournalTocDropdown;
