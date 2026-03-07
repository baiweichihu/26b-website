import React, { useState, useRef, useCallback, useMemo } from 'react';
import PDFViewer from '../../components/features/journal/PDFViewer';
import MDViewer from '../../components/features/journal/MDViewer';
import TableOfContents from '../../components/features/journal/TableOfContents';
import JournalLayout from '../../components/features/journal/JournalLayout';
import JournalTopControls from '../../components/features/journal/JournalTopControls';
import JournalPdfSectionHeader from '../../components/features/journal/JournalPdfSectionHeader';
import JournalMdSectionHeader from '../../components/features/journal/JournalMdSectionHeader';
import { useJournalAuthAndMapping } from '../../components/features/journal/hooks/useJournalAuthAndMapping';
import { useFullscreenState } from '../../components/features/journal/hooks/useFullscreenState';
import { useDismissOnOutsideClick } from '../../components/features/journal/hooks/useDismissOnOutsideClick';
import { useJournalTocNavigation } from '../../components/features/journal/hooks/useJournalTocNavigation';
import { useJournalReaderControls } from '../../components/features/journal/hooks/useJournalReaderControls';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import gateStyles from '../../components/ui/AuthGateOverlay.module.css';
import styles from './Journal.module.css';

const Journal = () => {
  const [showPdfTocDropdown, setShowPdfTocDropdown] = useState(false);
  const [showMdTocDropdown, setShowMdTocDropdown] = useState(false);
  const mdContentRef = useRef(null);
  const pdfFullscreenRef = useRef(null);
  const mdFullscreenRef = useRef(null);
  const pdfTocDropdownRef = useRef(null);
  const mdTocDropdownRef = useRef(null);

  const baseUrl = import.meta.env.BASE_URL || '/';
  const { authStatus, pdfMapping } = useJournalAuthAndMapping(baseUrl);
  const closeTocDropdowns = useCallback(() => {
    setShowPdfTocDropdown(false);
    setShowMdTocDropdown(false);
  }, []);

  const { isFullscreen, enterFullscreen, exitFullscreen } = useFullscreenState({
    onExitFullscreen: closeTocDropdowns,
  });

  const {
    pdfScale,
    setPdfScale,
    mdFontSize,
    setMdFontSize,
    filePages,
    handlePDFLoaded,
    handlePDFFilePagesUpdated,
    totalPagesSafe,
    clampedPage,
    handlePageChange,
    setCurrentPage,
  } = useJournalReaderControls();

  const {
    toc,
    currentSection,
    mdSectionIndex,
    mdSectionTotal,
    updateMdSectionByIndex,
    handleTocClick,
    handleTocGenerated,
    handleSectionsGenerated,
  } = useJournalTocNavigation({
    isFullscreen,
    pdfMapping,
    filePages,
    setCurrentPage,
    closeTocDropdowns,
  });

  const totalMdSectionsSafe = mdSectionTotal > 0 ? mdSectionTotal : 1;
  const clampedMdIndex = Math.min(Math.max(mdSectionIndex, 0), totalMdSectionsSafe - 1);
  const mdDisplayIndex = totalMdSectionsSafe === 0 ? 0 : clampedMdIndex + 1;

  useDismissOnOutsideClick(pdfTocDropdownRef, showPdfTocDropdown, () => {
    setShowPdfTocDropdown(false);
  });

  useDismissOnOutsideClick(mdTocDropdownRef, showMdTocDropdown, () => {
    setShowMdTocDropdown(false);
  });

  const pdfFiles = useMemo(
    () => [`${baseUrl}journals/journal1.pdf`, `${baseUrl}journals/journal2.pdf`],
    [baseUrl]
  );
  const mdFiles = useMemo(
    () => [`${baseUrl}journals/journal1.md`, `${baseUrl}journals/journal2.md`],
    [baseUrl]
  );

  const handleEnterFullscreen = useCallback(
    (type) => {
      const element = type === 'pdf' ? pdfFullscreenRef.current : mdFullscreenRef.current;
      return enterFullscreen(element);
    },
    [enterFullscreen]
  );

  const isLocked = authStatus === 'loading' || authStatus === 'anonymous';
  const gateCopy = useMemo(() => {
    if (authStatus === 'loading') {
      return {
        title: '加载中',
        message: '正在验证您的身份和权限...',
      };
    }
    return {
      title: '请登录',
      message: '登录后方可浏览班级日志',
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

          <JournalTopControls
            styles={styles}
            pdfScale={pdfScale}
            setPdfScale={setPdfScale}
            clampedPage={clampedPage}
            totalPagesSafe={totalPagesSafe}
            onPageChange={handlePageChange}
            mdFontSize={mdFontSize}
            setMdFontSize={setMdFontSize}
            clampedMdIndex={clampedMdIndex}
            totalMdSectionsSafe={totalMdSectionsSafe}
            mdDisplayIndex={mdDisplayIndex}
            updateMdSectionByIndex={updateMdSectionByIndex}
          />

          <main className={styles.mainContent}>
            <aside className={styles.sidebar}>
              <TableOfContents
                toc={toc}
                currentSection={currentSection}
                onTocClick={handleTocClick}
              />
            </aside>

            <JournalLayout>
              {isLocked ? (
                <div className={styles.pdfSection} />
              ) : (
                <div className={styles.pdfSection} ref={pdfFullscreenRef}>
                  <JournalPdfSectionHeader
                    styles={styles}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={() =>
                      isFullscreen ? exitFullscreen() : handleEnterFullscreen('pdf')
                    }
                    pdfTocDropdownRef={pdfTocDropdownRef}
                    showPdfTocDropdown={showPdfTocDropdown}
                    setShowPdfTocDropdown={setShowPdfTocDropdown}
                    toc={toc}
                    currentSection={currentSection}
                    onTocClick={handleTocClick}
                    pdfScale={pdfScale}
                    setPdfScale={setPdfScale}
                    clampedPage={clampedPage}
                    totalPagesSafe={totalPagesSafe}
                    onPageChange={handlePageChange}
                  />
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
              )}

              {isLocked ? (
                <div className={styles.mdSection} />
              ) : (
                <div className={styles.mdSection} ref={mdFullscreenRef}>
                  <JournalMdSectionHeader
                    styles={styles}
                    isFullscreen={isFullscreen}
                    onToggleFullscreen={() =>
                      isFullscreen ? exitFullscreen() : handleEnterFullscreen('md')
                    }
                    mdTocDropdownRef={mdTocDropdownRef}
                    showMdTocDropdown={showMdTocDropdown}
                    setShowMdTocDropdown={setShowMdTocDropdown}
                    toc={toc}
                    currentSection={currentSection}
                    onTocClick={handleTocClick}
                    mdFontSize={mdFontSize}
                    setMdFontSize={setMdFontSize}
                    clampedMdIndex={clampedMdIndex}
                    totalMdSectionsSafe={totalMdSectionsSafe}
                    mdDisplayIndex={mdDisplayIndex}
                    updateMdSectionByIndex={updateMdSectionByIndex}
                  />
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
              )}
            </JournalLayout>
          </main>
        </div>
        {isLocked && (
          <AuthGateOverlay mode="anonymous" title={gateCopy.title} message={gateCopy.message} />
        )}
      </div>
    </div>
  );
};

export default Journal;
