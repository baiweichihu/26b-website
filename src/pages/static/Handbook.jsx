import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../../lib/supabase';
import PDFViewer from '../../components/features/journal/PDFViewer';
import TableOfContents from '../../components/features/journal/TableOfContents';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';
import styles from '../journal/Journal.module.css';
import handbookStyles from './Handbook.module.css';

const HANDBOOK_FILE_NAMES = [
  '成长手册（2019-2020）.pdf',
  '成长手册（2020-2021）.pdf',
  '成长手册（2021-2022）.pdf',
  '成长手册（2022-2023）.pdf',
];

const Handbook = () => {
  const [authStatus, setAuthStatus] = useState('loading');
  const [selectedFileId, setSelectedFileId] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [pdfScale, setPdfScale] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showPdfTocDropdown, setShowPdfTocDropdown] = useState(false);
  const pdfFullscreenRef = useRef(null);
  const pdfTocDropdownRef = useRef(null);

  const baseUrl = import.meta.env.BASE_URL || '/';

  const handbookFiles = useMemo(() => {
    return HANDBOOK_FILE_NAMES.map((name) => ({
      id: name,
      title: name.replace(/\.pdf$/i, ''),
      url: `${baseUrl}handbook/${encodeURIComponent(name)}`,
    }));
  }, [baseUrl]);

  const selectedFile =
    handbookFiles.find((item) => item.id === selectedFileId) || handbookFiles[0] || null;

  useEffect(() => {
    if (!selectedFileId && handbookFiles.length > 0) {
      setSelectedFileId(handbookFiles[0].id);
    }
  }, [selectedFileId, handbookFiles]);

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

      if (profile.identity_type === 'classmate') {
        setAuthStatus('member');
        return;
      }

      if (profile.identity_type === 'alumni') {
        const now = new Date().toISOString();
        const { data: accessRequest, error: requestError } = await supabase
          .from('journal_access_requests')
          .select('status, requested_access_start_time, requested_access_end_time')
          .eq('requester_id', user.id)
          .eq('status', 'approved')
          .lte('requested_access_start_time', now)
          .gte('requested_access_end_time', now)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (!requestError && accessRequest) {
          setAuthStatus('member');
        } else {
          setAuthStatus('guest');
        }
        return;
      }

      setAuthStatus('member');
    } catch (error) {
      console.error('Handbook auth check failed:', error);
      setAuthStatus('anonymous');
    }
  }, []);

  useEffect(() => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      void loadAuthStatus(session?.user ?? null);
    });

    void loadAuthStatus();
    return () => data?.subscription?.unsubscribe?.();
  }, [loadAuthStatus]);

  useEffect(() => {
    setCurrentPage(1);
    setTotalPages(0);
  }, [selectedFile?.id]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
      if (!document.fullscreenElement) {
        setShowPdfTocDropdown(false);
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const enterFullscreen = async () => {
    if (!pdfFullscreenRef.current) return;

    try {
      await pdfFullscreenRef.current.requestFullscreen();
    } catch (err) {
      console.error('无法进入全屏模式:', err);
    }
  };

  const exitFullscreen = async () => {
    if (!document.fullscreenElement) return;

    try {
      await document.exitFullscreen();
    } catch (err) {
      console.error('无法退出全屏模式:', err);
    }
  };

  const toc = useMemo(() => {
    return handbookFiles.map((item) => ({
      id: item.id,
      title: item.title,
      level: 1,
    }));
  }, [handbookFiles]);

  const isLocked = authStatus === 'loading' || authStatus === 'anonymous' || authStatus === 'guest';
  const gateCopy = useMemo(() => {
    if (authStatus === 'loading') {
      return {
        title: '加载中',
        message: '正在验证您的身份和权限...',
      };
    }

    if (authStatus === 'guest') {
      return {
        title: '需要申请查档权限',
        message: '校友需要向管理员申请成长手册查档时间，批准后方可在约定时间内浏览',
        isApplyRequired: true,
      };
    }

    return {
      title: '请登录',
      message: '校友登录方可浏览成长手册',
    };
  }, [authStatus]);

  const totalPagesSafe = totalPages > 0 ? totalPages : 1;
  const clampedPage = Math.min(currentPage, totalPagesSafe);

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

  return (
    <div className="page-content scene-page">
      <div className={`${styles.journalContainer} ${gateStyles.lockedContainer}`}>
        <div
          className={`${gateStyles.lockedContent} ${isLocked ? gateStyles.isLocked : ''}`}
          aria-hidden={isLocked}
        >
          <header className={styles.journalHeader}>
            <p className={styles.kicker}>成长手册</p>
            <h1>26B 成长手册</h1>
            <p>记录每一年值得珍藏的成长片段</p>
          </header>

          <div className={styles.controls}>
            <div className={`${styles.controlPanel} ${handbookStyles.controlPanelInline}`}>
              <div className={`${styles.controlGroup} ${handbookStyles.controlGroupInline}`}>
                <label className={styles.controlLabel}>PDF缩放</label>
                <div className={`${styles.zoomControls} ${handbookStyles.controlNoWrap}`}>
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
                  <button className={styles.toolbarButton} title="重置缩放" onClick={() => setPdfScale(1)}>
                    重置
                  </button>
                </div>
              </div>

              <div className={`${styles.controlGroup} ${handbookStyles.controlGroupInline}`}>
                <label className={styles.controlLabel} htmlFor="handbook-page-input">
                  PDF页码
                </label>
                <div className={`${styles.pageControls} ${handbookStyles.controlNoWrap}`}>
                  <button
                    className={styles.pageButton}
                    onClick={() => setCurrentPage(Math.max(clampedPage - 1, 1))}
                    disabled={clampedPage <= 1}
                    aria-label="上一页"
                  >
                    ◀
                  </button>
                  <span className={styles.pageInput}>
                    <input
                      id="handbook-page-input"
                      name="handbookPage"
                      type="number"
                      value={clampedPage}
                      min="1"
                      max={totalPagesSafe}
                      onChange={(e) => {
                        const val = Number(e.target.value);
                        if (!Number.isNaN(val)) {
                          setCurrentPage(Math.min(Math.max(val, 1), totalPagesSafe));
                        }
                      }}
                    />{' '}
                    / {totalPagesSafe}
                  </span>
                  <button
                    className={styles.pageButton}
                    onClick={() => setCurrentPage(Math.min(clampedPage + 1, totalPagesSafe))}
                    disabled={clampedPage >= totalPagesSafe}
                    aria-label="下一页"
                  >
                    ▶
                  </button>
                </div>
              </div>
            </div>
          </div>

          <main className={`${styles.mainContent} ${handbookStyles.mainContentOverride}`}>
            <aside className={styles.sidebar}>
              <TableOfContents
                toc={toc}
                currentSection={selectedFile?.id || ''}
                onTocClick={(id) => setSelectedFileId(id)}
              />
            </aside>

            <div className={`${styles.pdfSection} ${handbookStyles.handbookPdfSection}`} ref={pdfFullscreenRef}>
              <div className={styles.sectionHeader} data-fullscreen={isFullscreen}>
                {!isFullscreen && (
                  <div className={styles.headerRow1}>
                    <h2>{selectedFile?.title || '成长手册'}</h2>
                    <button
                      className={styles.fullscreenButton}
                      onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}
                      title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看PDF'}
                    >
                      {isFullscreen ? '✕' : '⛶'}
                    </button>
                  </div>
                )}

                {isFullscreen && (
                  <div className={styles.fullscreenHeader}>
                    <div className={styles.fullscreenLeftSection}>
                      <h2>{selectedFile?.title || '成长手册'}</h2>
                      <div className={styles.tocDropdownWrapper} ref={pdfTocDropdownRef}>
                        <button
                          className={styles.tocButton}
                          onClick={() => setShowPdfTocDropdown((prev) => !prev)}
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
                              <ul className={styles.tocDropdownList}>
                                {toc.map((item, index) => (
                                  <li
                                    key={index}
                                    className={`${styles.tocDropdownItem} ${
                                      selectedFile?.id === item.id ? styles.tocDropdownItemActive : ''
                                    }`}
                                  >
                                    <button
                                      className={styles.tocDropdownLink}
                                      onClick={() => {
                                        setSelectedFileId(item.id);
                                        setShowPdfTocDropdown(false);
                                      }}
                                      title={item.title}
                                    >
                                      📖 <span>{item.title}</span>
                                    </button>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className={styles.fullscreenControls}>
                      <div className={`${styles.controlGroup} ${handbookStyles.controlGroupInline}`}>
                        <label className={styles.controlLabel}>PDF缩放</label>
                        <div className={`${styles.zoomControls} ${handbookStyles.controlNoWrap}`}>
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
                          <button className={styles.toolbarButton} title="重置缩放" onClick={() => setPdfScale(1)}>
                            重置
                          </button>
                        </div>
                      </div>

                      <div className={`${styles.controlGroup} ${handbookStyles.controlGroupInline}`}>
                        <label className={styles.controlLabel}>PDF页码</label>
                        <div className={`${styles.pageControls} ${handbookStyles.controlNoWrap}`}>
                          <button
                            className={styles.pageButton}
                            onClick={() => setCurrentPage(Math.max(clampedPage - 1, 1))}
                            disabled={clampedPage <= 1}
                            aria-label="上一页"
                          >
                            ◀
                          </button>
                          <span className={styles.pageInput}>
                            <input
                              name="handbookPageFullscreen"
                              type="number"
                              value={clampedPage}
                              min="1"
                              max={totalPagesSafe}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                if (!Number.isNaN(val)) {
                                  setCurrentPage(Math.min(Math.max(val, 1), totalPagesSafe));
                                }
                              }}
                            />{' '}
                            / {totalPagesSafe}
                          </span>
                          <button
                            className={styles.pageButton}
                            onClick={() => setCurrentPage(Math.min(clampedPage + 1, totalPagesSafe))}
                            disabled={clampedPage >= totalPagesSafe}
                            aria-label="下一页"
                          >
                            ▶
                          </button>
                        </div>
                      </div>

                      <button
                        className={styles.fullscreenButton}
                        onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())}
                        title={isFullscreen ? '退出全屏 (ESC)' : '全屏查看PDF'}
                      >
                        {isFullscreen ? '✕' : '⛶'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
              {!isLocked && selectedFile ? (
                <div className={handbookStyles.a4Stage}>
                  <PDFViewer
                    file={selectedFile.url}
                    currentPage={clampedPage}
                    onLoadSuccess={({ numPages }) => setTotalPages(numPages)}
                    scale={pdfScale}
                    containerClassName={handbookStyles.handbookViewer}
                    contentClassName={handbookStyles.handbookPdfContent}
                  />
                </div>
              ) : isLocked ? (
                <div className={styles.pdfLoading}>暂无权限加载成长手册内容</div>
              ) : (
                <div className={styles.pdfLoading}>暂无可用的成长手册文件</div>
              )}
            </div>
          </main>
        </div>

        {isLocked && (
          <AuthGateOverlay
            mode={authStatus === 'guest' ? 'guest' : 'anonymous'}
            title={gateCopy.title}
            message={gateCopy.message}
            isApplyRequired={gateCopy.isApplyRequired}
          />
        )}
      </div>
    </div>
  );
};

export default Handbook;
