import React from 'react';
import JournalTocDropdown from './JournalTocDropdown';

const JournalMdSectionHeader = ({
  styles,
  isFullscreen,
  onToggleFullscreen,
  mdTocDropdownRef,
  showMdTocDropdown,
  setShowMdTocDropdown,
  toc,
  currentSection,
  onTocClick,
  mdFontSize,
  setMdFontSize,
  clampedMdIndex,
  totalMdSectionsSafe,
  mdDisplayIndex,
  updateMdSectionByIndex,
}) => {
  return (
    <div className={styles.sectionHeader} data-fullscreen={isFullscreen}>
      {!isFullscreen && (
        <div className={styles.headerRow1}>
          <h2>Markdown 版</h2>
          <button
            className={styles.fullscreenButton}
            onClick={onToggleFullscreen}
            title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看Markdown'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      )}
      {isFullscreen && (
        <div className={styles.fullscreenHeader}>
          <div className={styles.fullscreenLeftSection}>
            <h2 className={styles.mdTitle}>
              <span className={styles.mdTitleFull}>Markdown 版</span>
              <span className={styles.mdTitleShort}>MD 版</span>
            </h2>
            <div className={styles.tocDropdownWrapper} ref={mdTocDropdownRef}>
              <button
                className={styles.tocButton}
                onClick={() => setShowMdTocDropdown(!showMdTocDropdown)}
                title="目录"
              >
                ☰
              </button>
              <JournalTocDropdown
                styles={styles}
                show={showMdTocDropdown}
                toc={toc}
                currentSection={currentSection}
                onTocClick={onTocClick}
              />
            </div>
          </div>
          <div className={styles.fullscreenControls}>
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
                  <button
                    className={`${styles.toolbarButton} ${styles.resetButton}`}
                    title="重置字体"
                    onClick={() => setMdFontSize(16)}
                  >
                    重置
                  </button>
                </div>
              </div>
            </div>
            <div className={styles.dividerHorizontal}></div>
            <div className={styles.controlPanel}>
              <div className={styles.controlGroup}>
                <label className={styles.controlLabel} htmlFor="md-section-input-fullscreen">
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
                      id="md-section-input-fullscreen"
                      name="mdSectionFullscreen"
                      type="number"
                      value={mdDisplayIndex}
                      min="1"
                      max={totalMdSectionsSafe}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isNaN(val)) {
                          updateMdSectionByIndex(
                            Math.min(Math.max(val, 1), totalMdSectionsSafe) - 1
                          );
                        }
                      }}
                    />{' '}
                    / {totalMdSectionsSafe}
                  </span>
                  <button
                    className={styles.pageButton}
                    onClick={() =>
                      updateMdSectionByIndex(
                        Math.min(clampedMdIndex + 1, totalMdSectionsSafe - 1)
                      )
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
          <div className={styles.fullscreenControlsCompact}>
            <button
              className={styles.toolbarButton}
              title="减小字体"
              onClick={() => setMdFontSize((p) => Math.max(p - 1, 12))}
            >
              −
            </button>
            <button
              className={styles.toolbarButton}
              title="增大字体"
              onClick={() => setMdFontSize((p) => Math.min(p + 1, 24))}
            >
              +
            </button>
            <button
              className={styles.pageButton}
              onClick={() => updateMdSectionByIndex(Math.max(clampedMdIndex - 1, 0))}
              disabled={clampedMdIndex <= 0}
              aria-label="上一章节"
            >
              ◀
            </button>
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
          <button
            className={styles.fullscreenButton}
            onClick={onToggleFullscreen}
            title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看Markdown'}
          >
            {isFullscreen ? '✕' : '⛶'}
          </button>
        </div>
      )}
    </div>
  );
};

export default JournalMdSectionHeader;
