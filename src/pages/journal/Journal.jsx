import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import { supabase } from '../../lib/supabase';
import PDFViewer from '../../components/features/journal/PDFViewer';
import MDViewer from '../../components/features/journal/MDViewer';
import TableOfContents from '../../components/features/journal/TableOfContents';
import JournalLayout from '../../components/features/journal/JournalLayout';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';
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
  const [showPdfTocDropdown, setShowPdfTocDropdown] = useState(false);
  const [showMdTocDropdown, setShowMdTocDropdown] = useState(false);
  const [authStatus, setAuthStatus] = useState('loading');
  const mdContentRef = useRef(null);
  const pdfFullscreenRef = useRef(null);
  const mdFullscreenRef = useRef(null);
  const pdfTocDropdownRef = useRef(null);
  const mdTocDropdownRef = useRef(null);

  const baseUrl = import.meta.env.BASE_URL || '/';
  const pdfFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.pdf`, `${baseUrl}journals/journal2.pdf`],
    [baseUrl]
  );
  const mdFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.md`, `${baseUrl}journals/journal2.md`],
    [baseUrl]
  );

  const loadAuthStatus = useCallback(async (userOverride = null) => {
    try {
      let user = userOverride;
      if (!user) {
        const {
          data: { user: fetchedUser },
          error: authError,
        } = await supabase.auth.getUser();
        if (authError || !fetchedUser) {
          setAuthStatus('anonymous');
          return;
        }
        user = fetchedUser;
      }

      if (!user) {
        setAuthStatus('anonymous');
        return;
      }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('identity_type, role')
        .eq('id', user.id)
        .single();

      if (profileError || !profile) {
        setAuthStatus('anonymous');
        return;
      }

      if (profile.role === 'admin' || profile.role === 'superuser') {
        setAuthStatus('member');
        return;
      }

      if (profile.identity_type === 'guest') {
        setAuthStatus('guest');
        return;
      }

      setAuthStatus('member');
    } catch (error) {
      console.error('Journal auth check failed:', error);
      setAuthStatus('anonymous');
    }
  }, []);

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

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAuthStatus(session?.user ?? null);
    });

    return () => data?.subscription?.unsubscribe?.();
  }, [loadAuthStatus]);

  // 监听全屏状态变化
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      // 退出全屏时关闭目录下拉菜单
      if (!document.fullscreenElement) {
        setShowPdfTocDropdown(false);
        setShowMdTocDropdown(false);
      }
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // 点击外部关闭PDF目录下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (pdfTocDropdownRef.current && !pdfTocDropdownRef.current.contains(event.target)) {
        setShowPdfTocDropdown(false);
      }
    };

    if (showPdfTocDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showPdfTocDropdown]);

  // 点击外部关闭MD目录下拉菜单
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (mdTocDropdownRef.current && !mdTocDropdownRef.current.contains(event.target)) {
        setShowMdTocDropdown(false);
      }
    };

    if (showMdTocDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMdTocDropdown]);

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
        // 全屏模式下点击目录项后关闭下拉菜单
        if (isFullscreen) {
          setShowPdfTocDropdown(false);
          setShowMdTocDropdown(false);
        }
        return;
      }
      setCurrentSection(id);
      // 全屏模式下点击目录项后关闭下拉菜单
      if (isFullscreen) {
        setShowPdfTocDropdown(false);
        setShowMdTocDropdown(false);
      }
    },
    [mdSections, pdfMapping, filePages, updateMdSectionByIndex, isFullscreen]
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

  const isLocked = authStatus === 'anonymous' || authStatus === 'guest';
  const gateCopy = useMemo(() => {
    if (authStatus === 'guest') {
      return {
        title: '抱歉，游客不能浏览此页面',
        message: '请验证校友身份，并进行班级日志查档申请',
      };
    }
    return {
      title: '请登录',
      message: '校友登录方可浏览班级日志',
    };
  }, [authStatus]);

  return (
    <div className="page-content scene-page">
      <div className={`${styles.journalContainer} ${gateStyles.lockedContainer}`}>
        <div
          className={`${gateStyles.lockedContent} ${isLocked ? gateStyles.isLocked : ''}`}
          aria-hidden={isLocked}
        >
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
                          {showPdfTocDropdown && (
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
                                          currentSection === item.id
                                            ? styles.tocDropdownItemActive
                                            : ''
                                        }`}
                                        style={{
                                          paddingLeft:
                                            item.level === 1
                                              ? '12px'
                                              : item.level === 2
                                                ? '28px'
                                                : '44px',
                                        }}
                                      >
                                        <button
                                          className={styles.tocDropdownLink}
                                          onClick={() => handleTocClick(item.id)}
                                          title={item.title}
                                        >
                                          {item.level === 1 && '📖 '}
                                          {item.level === 2 && '📝 '}
                                          {item.level === 3 && '📄 '}
                                          <span>
                                            {item.title.length > 25
                                              ? `${item.title.substring(0, 25)}...`
                                              : item.title}
                                          </span>
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
                          )}
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
                          onClick={() => handlePageChange(Math.max(clampedPage - 1, 1))}
                          disabled={clampedPage <= 1}
                          aria-label="上一页"
                        >
                          ◀
                        </button>
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
                          {showMdTocDropdown && (
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
                                          currentSection === item.id
                                            ? styles.tocDropdownItemActive
                                            : ''
                                        }`}
                                        style={{
                                          paddingLeft:
                                            item.level === 1
                                              ? '12px'
                                              : item.level === 2
                                                ? '28px'
                                                : '44px',
                                        }}
                                      >
                                        <button
                                          className={styles.tocDropdownLink}
                                          onClick={() => handleTocClick(item.id)}
                                          title={item.title}
                                        >
                                          {item.level === 1 && '📖 '}
                                          {item.level === 2 && '📝 '}
                                          {item.level === 3 && '📄 '}
                                          <span>
                                            {item.title.length > 25
                                              ? `${item.title.substring(0, 25)}...`
                                              : item.title}
                                          </span>
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
                          )}
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
        {isLocked && (
          <AuthGateOverlay mode={authStatus} title={gateCopy.title} message={gateCopy.message} />
        )}
      </div>
    </div>
  );
};

export default Journal;
