import React from 'react';

const PeopleProfileSocialSection = ({
  styles,
  socialRows,
  onAdd,
  onRemove,
  onChange,
  platformOptions,
}) => {
  return (
    <div className={styles.socialSection}>
      <div className={styles.socialHeader}>
        <span>社交媒体</span>
        <button type="button" className="scene-button primary" onClick={onAdd}>
          + 添加
        </button>
      </div>
      {socialRows.length === 0 && <p className={styles.socialEmpty}>暂无社交媒体，点击 + 添加</p>}
      {socialRows.map((row, index) => (
        <div key={`social-${index}`} className={styles.socialRow}>
          <select
            className="form-select"
            value={row.platform}
            onChange={(event) => onChange(index, 'platform', event.target.value)}
          >
            {platformOptions.map((option) => (
              <option key={option.value || 'none'} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>

          {row.platform === 'other' && (
            <input
              className="form-control"
              value={row.customPlatform}
              onChange={(event) => onChange(index, 'customPlatform', event.target.value)}
              placeholder="自定义平台名"
            />
          )}

          <input
            className="form-control"
            value={row.account}
            onChange={(event) => onChange(index, 'account', event.target.value)}
            placeholder="账号"
          />

          <button type="button" className="scene-button ghost" onClick={() => onRemove(index)}>
            - 删除
          </button>
        </div>
      ))}
    </div>
  );
};

export default PeopleProfileSocialSection;
