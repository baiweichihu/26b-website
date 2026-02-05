import React, { useState, useRef, useCallback, useEffect } from 'react';
import PDFViewer from '../components/features/journal/PDFViewer';
import MDViewer from '../components/features/journal/MDViewer';
import TableOfContents from '../components/features/journal/TableOfContents';
import JournalLayout from '../components/features/journal/JournalLayout';
import styles from './Journal.module.css';

const Journal = () => {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [pdfScale, setPdfScale] = useState(1.0);
  const [mdFontSize, setMdFontSize] = useState(16);
  const [currentSection, setCurrentSection] = useState('');
  const [mdSections, setMdSections] = useState([]);
  const [mdSectionIndex, setMdSectionIndex] = useState(0);
  const [mdSectionTotal, setMdSectionTotal] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [toc, setToc] = useState([]);
  const [pdfMapping, setPdfMapping] = useState({});
  const [filePages, setFilePages] = useState([]);
  const mdContentRef = useRef(null);
  const pdfFullscreenRef = useRef(null);
  const mdFullscreenRef = useRef(null);

  const baseUrl = import.meta.env.BASE_URL || '/';
  const pdfFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.pdf`, `${baseUrl}journals/journal2.pdf`],
    [baseUrl]
  );
  const mdFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.md`, `${baseUrl}journals/journal2.md`],
    [baseUrl]
  );

  // 加载 PDF 映射配置
  useEffect(() => {
    const loadMapping = async () => {
      try {
        const response = await fetch(`${baseUrl}journals/mapping.json`);
        if (response.ok) {
          const data = await response.json();
          // 转换为以 id 为 key 的对象，方便查询
          const mappingObj = {};
          if (data.sections && Array.isArray(data.sections)) {
            data.sections.forEach((item) => {
              // 这里先暂存，稍后当 mdSections 加载后再关联 id
              const key = `${item.volume}-${item.sectionIndex}`;
              mappingObj[key] = { pdfPageStart: item.pdfPageStart };
            });
          }
          setPdfMapping(mappingObj);
        }
      } catch (err) {
        console.warn('加载 PDF 映射配置失败:', err);
      }
    };
    loadMapping();
  }, [baseUrl]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 进入全屏
  const enterFullscreen = async (type) => {
    const element = type === 'pdf' ? pdfFullscreenRef.current : mdFullscreenRef.current;
    if (element) {
      try {
        await element.requestFullscreen();
      } catch (err) {
        console.error('无法进入全屏模式:', err);
      }
    }
  };

  // 退出全屏
  const exitFullscreen = async () => {
    if (document.fullscreenElement) {
      try {
        await document.exitFullscreen();
      } catch (err) {
        console.error('无法退出全屏模式:', err);
      }
    }
  };

  const updateMdSectionByIndex = useCallback(
    (nextIndex) => {
      if (!mdSections || mdSections.length === 0) {
        setMdSectionIndex(0);
        setCurrentSection('');
        return;
      }

      const safeIndex = Math.min(Math.max(nextIndex, 0), mdSections.length - 1);
      const nextId = mdSections[safeIndex]?.id || '';
      setMdSectionIndex(safeIndex);
      setCurrentSection(nextId);
    },
    [mdSections]
  );

  const handleTocClick = useCallback(
    (id) => {
      const targetIndex = mdSections.findIndex((item) => item.id === id);
      if (targetIndex >= 0) {
        updateMdSectionByIndex(targetIndex);

        // 根据 section 的 volume 和 sectionIndex 查找对应的 PDF 页码
        const targetSection = mdSections[targetIndex];
        if (
          targetSection &&
          targetSection.volume !== undefined &&
          targetSection.sectionIndex !== undefined
        ) {
          const mappingKey = `${targetSection.volume}-${targetSection.sectionIndex}`;
          const pdfInfo = pdfMapping[mappingKey];
          if (pdfInfo && pdfInfo.pdfPageStart) {
            // 计算全局页码（需要加上前面文件的总页数）
            let globalPage = pdfInfo.pdfPageStart;
            if (targetSection.volume > 1 && filePages.length > 0) {
              // 累加前面所有文件的页数
              for (let i = 0; i < targetSection.volume - 1; i++) {
                globalPage += filePages[i] || 0;
              }
            }
            setCurrentPage(globalPage);
          }
        }
        return;
      }
      setCurrentSection(id);
    },
    [mdSections, pdfMapping, filePages, updateMdSectionByIndex]
  );

  const handleTocGenerated = useCallback((nextToc) => {
    setToc(nextToc);
  }, []);

  const handleSectionsGenerated = useCallback(
    (sections) => {
      setMdSections(sections);
      const total = sections.length > 0 ? sections.length : 1;
      setMdSectionTotal(total);

      if (sections.length === 0) {
        setMdSectionIndex(0);
        setCurrentSection('');
        return;
      }

      const existingIndex = sections.findIndex((item) => item.id === currentSection);
      const nextIndex = existingIndex >= 0 ? existingIndex : 0;
      setMdSectionIndex(nextIndex);
      setCurrentSection(sections[nextIndex]?.id || '');
    },
    [currentSection]
  );

  const handlePDFLoaded = ({ numPages }) => {
    setTotalPages(numPages);
  };

  // 当 PDFViewer 加载完所有 PDF 并知道每个文件的页数时，我们需要获取这个信息
  // 这里我们需要从 PDFViewer 获取 filePages 信息
  // 暂时添加一个处理函数来接收 filePages
  const handlePDFFilePagesUpdated = (pages) => {
    setFilePages(pages);
  };

  const totalPagesSafe = totalPages > 0 ? totalPages : 1;
  const clampedPage = Math.min(currentPage, totalPagesSafe);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const totalMdSectionsSafe = mdSectionTotal > 0 ? mdSectionTotal : 1;
  const clampedMdIndex = Math.min(Math.max(mdSectionIndex, 0), totalMdSectionsSafe - 1);
  const mdDisplayIndex = totalMdSectionsSafe === 0 ? 0 : clampedMdIndex + 1;

  return (
    <div className="page-content scene-page">
      <div className={styles.journalContainer}>
        <header className={styles.journalHeader}>
          <p className={styles.kicker}>班级日志</p>
          <h1>26B 班日志</h1>
          <p>光阴似箭，日月如梭，我们不觉离别</p>
          <p>故册轻启，往事盈怀，墨迹犹存少年</p>
        </header>

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
                <button
                  className={styles.toolbarButton}
                  title="重置缩放"
                  onClick={() => setPdfScale(1.0)}
                >
                  重置
                </button>
              </div>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>PDF页码</label>
              <div className={styles.pageControls}>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(Math.max(clampedPage - 1, 1))}
                  disabled={clampedPage <= 1}
                  aria-label="上一页"
                >
                  ◀
                </button>
                <span className={styles.pageInput}>
                  <input
                    type="number"
                    value={clampedPage}
                    min="1"
                    max={totalPagesSafe}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (!Number.isNaN(val)) {
                        handlePageChange(Math.min(Math.max(val, 1), totalPagesSafe));
                      }
                    }}
                  />{' '}
                  / {totalPagesSafe}
                </span>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(Math.min(clampedPage + 1, totalPagesSafe))}
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
                <button
                  className={styles.toolbarButton}
                  title="重置字体"
                  onClick={() => setMdFontSize(16)}
                >
                  重置
                </button>
              </div>
            </div>

            <div className={styles.controlGroup}>
              <label className={styles.controlLabel}>MD章节</label>
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

        <main className={styles.mainContent}>
          <aside className={styles.sidebar}>
            <TableOfContents
              toc={toc}
              currentSection={currentSection}
              onTocClick={handleTocClick}
            />
          </aside>

          <JournalLayout>
            <div className={styles.pdfSection} ref={pdfFullscreenRef}>
              <div className={styles.sectionHeader} data-fullscreen={isFullscreen}>
                {!isFullscreen && (
                  <div className={styles.headerRow1}>
                    <h2>PDF 版</h2>
                    <button
                      className={styles.fullscreenButton}
                      onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen('pdf'))}
                      title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看PDF'}
                    >
                      {isFullscreen ? '✕' : '⛶'}
                    </button>
                  </div>
                )}
                {isFullscreen && (
                  <div className={styles.fullscreenHeader}>
                    <h2>PDF 版</h2>
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
                            <span className={styles.zoomDisplay}>
                              {Math.round(pdfScale * 100)}%
                            </span>
                            <button
                              className={styles.toolbarButton}
                              title="放大"
                              onClick={() => setPdfScale((p) => Math.min(p + 0.2, 3.0))}
                            >
                              +
                            </button>
                            <button
                              className={styles.toolbarButton}
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
                          <label className={styles.controlLabel}>PDF页码</label>
                          <div className={styles.pageControls}>
                            <button
                              className={styles.pageButton}
                              onClick={() => handlePageChange(Math.max(clampedPage - 1, 1))}
                              disabled={clampedPage <= 1}
                              aria-label="上一页"
                            >
                              ◀
                            </button>
                            <span className={styles.pageInput}>
                              <input
                                type="number"
                                value={clampedPage}
                                min="1"
                                max={totalPagesSafe}
                                onChange={(e) => {
                                  const val = Number(e.target.value);
                                  if (!Number.isNaN(val)) {
                                    handlePageChange(Math.min(Math.max(val, 1), totalPagesSafe));
                                  }
                                }}
                              />{' '}
                              / {totalPagesSafe}
                            </span>
                            <button
                              className={styles.pageButton}
                              onClick={() =>
                                handlePageChange(Math.min(clampedPage + 1, totalPagesSafe))
                              }
                              disabled={clampedPage >= totalPagesSafe}
                              aria-label="下一页"
                            >
                              ▶
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                    <button
                      className={styles.fullscreenButton}
                      onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen('pdf'))}
                      title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看PDF'}
                    >
                      {isFullscreen ? '✕' : '⛶'}
                    </button>
                  </div>
                )}
              </div>
              <PDFViewer
                files={pdfFiles}
                currentPage={clampedPage}
                totalPages={totalPagesSafe}
                onPageChange={handlePageChange}
                onLoadSuccess={handlePDFLoaded}
                onFilePages={handlePDFFilePagesUpdated}
                isFullscreen={isFullscreen}
                scale={pdfScale}
              />
            </div>

            <div className={styles.mdSection} ref={mdFullscreenRef}>
              <div className={styles.sectionHeader} data-fullscreen={isFullscreen}>
                {!isFullscreen && (
                  <div className={styles.headerRow1}>
                    <h2>Markdown 版</h2>
                    <button
                      className={styles.fullscreenButton}
                      onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen('md'))}
                      title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看Markdown'}
                    >
                      {isFullscreen ? '✕' : '⛶'}
                    </button>
                  </div>
                )}
                {isFullscreen && (
                  <div className={styles.fullscreenHeader}>
                    <h2>Markdown 版</h2>
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
                              className={styles.toolbarButton}
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
                          <label className={styles.controlLabel}>MD章节</label>
                          <div className={styles.sectionControls}>
                            <button
                              className={styles.pageButton}
                              onClick={() =>
                                updateMdSectionByIndex(Math.max(clampedMdIndex - 1, 0))
                              }
                              disabled={clampedMdIndex <= 0}
                              aria-label="上一章节"
                            >
                              ◀
                            </button>
                            <span className={styles.pageInput}>
                              <input
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
                    <button
                      className={styles.fullscreenButton}
                      onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen('md'))}
                      title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看Markdown'}
                    >
                      {isFullscreen ? '✕' : '⛶'}
                    </button>
                  </div>
                )}
              </div>
              <MDViewer
                ref={mdContentRef}
                files={mdFiles}
                activeSectionIndex={clampedMdIndex}
                totalSections={totalMdSectionsSafe}
                displayIndex={mdDisplayIndex}
                onSectionChange={updateMdSectionByIndex}
                onTocGenerated={handleTocGenerated}
                onSectionsGenerated={handleSectionsGenerated}
                fontSize={mdFontSize}
              />
            </div>
          </JournalLayout>
        </main>
      </div>
    </div>
  );
};

export default Journal;
