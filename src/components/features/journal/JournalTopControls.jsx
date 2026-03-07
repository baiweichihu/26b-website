import React from 'react';

const JournalTopControls = ({
  styles,
  pdfScale,
  setPdfScale,
  clampedPage,
  totalPagesSafe,
  onPageChange,
  mdFontSize,
  setMdFontSize,
  clampedMdIndex,
  totalMdSectionsSafe,
  mdDisplayIndex,
  updateMdSectionByIndex,
}) => {
  return (
    <div className={styles.controls}>
      <div className={styles.controlPanel}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>PDF缩放</label>
          <div className={styles.zoomControls}>
            <button
              className={styles.toolbarButton}
              title="缩小"
              onClick={() => setPdfScale((p) => Math.max(p - 0.2, 0.5))}
            >
              −
            </button>
            <span className={styles.zoomDisplay}>{Math.round(pdfScale * 100)}%</span>
            <button
              className={styles.toolbarButton}
              title="放大"
              onClick={() => setPdfScale((p) => Math.min(p + 0.2, 3.0))}
            >
              +
            </button>
            <button className={styles.toolbarButton} title="重置缩放" onClick={() => setPdfScale(1.0)}>
              重置
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel} htmlFor="pdf-page-input">
            PDF页码
          </label>
          <div className={styles.pageControls}>
            <button
              className={styles.pageButton}
              onClick={() => onPageChange(Math.max(clampedPage - 1, 1))}
              disabled={clampedPage <= 1}
              aria-label="上一页"
            >
              ◀
            </button>
            <span className={styles.pageInput}>
              <input
                id="pdf-page-input"
                name="pdfPage"
                type="number"
                value={clampedPage}
                min="1"
                max={totalPagesSafe}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) {
                    onPageChange(Math.min(Math.max(val, 1), totalPagesSafe));
                  }
                }}
              />{' '}
              / {totalPagesSafe}
            </span>
            <button
              className={styles.pageButton}
              onClick={() => onPageChange(Math.min(clampedPage + 1, totalPagesSafe))}
              disabled={clampedPage >= totalPagesSafe}
              aria-label="下一页"
            >
              ▶
            </button>
          </div>
        </div>
      </div>

      <div className={styles.dividerHorizontal}></div>

      <div className={styles.controlPanel}>
        <div className={styles.controlGroup}>
          <label className={styles.controlLabel}>MD字体</label>
          <div className={styles.fontControls}>
            <button
              className={styles.toolbarButton}
              title="减小字体"
              onClick={() => setMdFontSize((p) => Math.max(p - 1, 12))}
            >
              −
            </button>
            <span className={styles.fontSizeDisplay}>{mdFontSize}</span>
            <button
              className={styles.toolbarButton}
              title="增大字体"
              onClick={() => setMdFontSize((p) => Math.min(p + 1, 24))}
            >
              +
            </button>
            <button className={styles.toolbarButton} title="重置字体" onClick={() => setMdFontSize(16)}>
              重置
            </button>
          </div>
        </div>

        <div className={styles.controlGroup}>
          <label className={styles.controlLabel} htmlFor="md-section-input">
            MD章节
          </label>
          <div className={styles.sectionControls}>
            <button
              className={styles.pageButton}
              onClick={() => updateMdSectionByIndex(Math.max(clampedMdIndex - 1, 0))}
              disabled={clampedMdIndex <= 0}
              aria-label="上一章节"
            >
              ◀
            </button>
            <span className={styles.pageInput}>
              <input
                id="md-section-input"
                name="mdSection"
                type="number"
                value={mdDisplayIndex}
                min="1"
                max={totalMdSectionsSafe}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  if (!Number.isNaN(val)) {
                    updateMdSectionByIndex(Math.min(Math.max(val, 1), totalMdSectionsSafe) - 1);
                  }
                }}
              />{' '}
              / {totalMdSectionsSafe}
            </span>
            <button
              className={styles.pageButton}
              onClick={() =>
                updateMdSectionByIndex(Math.min(clampedMdIndex + 1, totalMdSectionsSafe - 1))
              }
              disabled={clampedMdIndex >= totalMdSectionsSafe - 1}
              aria-label="下一章节"
            >
              ▶
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default JournalTopControls;
