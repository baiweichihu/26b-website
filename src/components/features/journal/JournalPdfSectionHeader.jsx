import React from 'react';
import JournalTocDropdown from './JournalTocDropdown';

const JournalPdfSectionHeader = ({
  styles,
  isFullscreen,
  onToggleFullscreen,
  pdfTocDropdownRef,
  showPdfTocDropdown,
  setShowPdfTocDropdown,
  toc,
  currentSection,
  onTocClick,
  pdfScale,
  setPdfScale,
  clampedPage,
  totalPagesSafe,
  onPageChange,
}) => {
  return (
    <div className={styles.sectionHeader} data-fullscreen={isFullscreen}>
      {!isFullscreen && (
        <div className={styles.headerRow1}>
          <h2>PDF 版</h2>
          <button
            className={styles.fullscreenButton}
            onClick={onToggleFullscreen}
            title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看PDF'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      )}
      {isFullscreen && (
        <div className={styles.fullscreenHeader}>
          <div className={styles.fullscreenLeftSection}>
            <h2>PDF 版</h2>
            <div className={styles.tocDropdownWrapper} ref={pdfTocDropdownRef}>
              <button
                className={styles.tocButton}
                onClick={() => setShowPdfTocDropdown(!showPdfTocDropdown)}
                title="目录"
              >
                ☰
              </button>
              <JournalTocDropdown
                styles={styles}
                show={showPdfTocDropdown}
                toc={toc}
                currentSection={currentSection}
                onTocClick={onTocClick}
              />
            </div>
          </div>
          <div className={styles.fullscreenControls}>
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
                  <button
                    className={`${styles.toolbarButton} ${styles.resetButton}`}
                    title="重置缩放"
                    onClick={() => setPdfScale(1.0)}
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.dividerHorizontal}></div>
            <div className={styles.controlPanel}>
              <div className={styles.controlGroup}>
                <label className={styles.controlLabel} htmlFor="pdf-page-input-fullscreen">
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
                      id="pdf-page-input-fullscreen"
                      name="pdfPageFullscreen"
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
          </div>
          <div className={styles.fullscreenControlsCompact}>
            <button
              className={styles.toolbarButton}
              title="缩小"
              onClick={() => setPdfScale((p) => Math.max(p - 0.2, 0.5))}
            >
              −
            </button>
            <button
              className={styles.toolbarButton}
              title="放大"
              onClick={() => setPdfScale((p) => Math.min(p + 0.2, 3.0))}
            >
              +
            </button>
            <button
              className={styles.pageButton}
              onClick={() => onPageChange(Math.max(clampedPage - 1, 1))}
              disabled={clampedPage <= 1}
              aria-label="上一页"
            >
              ◀
            </button>
            <button
              className={styles.pageButton}
              onClick={() => onPageChange(Math.min(clampedPage + 1, totalPagesSafe))}
              disabled={clampedPage >= totalPagesSafe}
              aria-label="下一页"
            >
              ▶
            </button>
          </div>
          <button
            className={styles.fullscreenButton}
            onClick={onToggleFullscreen}
            title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看PDF'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      )}
    </div>
  );
};

export default JournalPdfSectionHeader;
