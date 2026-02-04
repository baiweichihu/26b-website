import React, { useState, useRef, useCallback } from 'react';
import PDFViewer from '../components/features/journal/PDFViewer';
import MDViewer from '../components/features/journal/MDViewer';
import TableOfContents from '../components/features/journal/TableOfContents';
import JournalLayout from '../components/features/journal/JournalLayout';
import styles from './Journal.module.css';

const Journal = () => {
  const [fontSize, setFontSize] = useState(16);
  const [currentSection, setCurrentSection] = useState('');
  const [mdSections, setMdSections] = useState([]);
  const [mdSectionIndex, setMdSectionIndex] = useState(0);
  const [mdSectionTotal, setMdSectionTotal] = useState(1);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [toc, setToc] = useState([]);
  const mdContentRef = useRef(null);

  const baseUrl = import.meta.env.BASE_URL || '/';
  const pdfFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.pdf`, `${baseUrl}journals/journal2.pdf`],
    [baseUrl]
  );
  const mdFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.md`, `${baseUrl}journals/journal2.md`],
    [baseUrl]
  );
  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 1, 24));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 1, 12));
  const resetFontSize = () => setFontSize(16);

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
        return;
      }
      setCurrentSection(id);
    },
    [mdSections, updateMdSectionByIndex]
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
          <div className={styles.fontControls}>
            <span className={styles.controlLabel}>字号</span>
            <button onClick={decreaseFontSize} className={styles.controlButton}>
              A-
            </button>
            <span className={styles.fontSizeDisplay}>{fontSize}px</span>
            <button onClick={increaseFontSize} className={styles.controlButton}>
              A+
            </button>
            <button onClick={resetFontSize} className={styles.controlButton}>
              重置
            </button>
          </div>

          <div className={styles.pdfInfo}>
            <span>
              页码 {clampedPage} / {totalPagesSafe}
            </span>
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
            <div className={styles.pdfSection}>
              <div className={styles.sectionHeader}>
                <h2>PDF 版</h2>
                <div className={styles.pdfControls}>
                  <button
                    className={styles.pageButton}
                    onClick={() => handlePageChange(Math.max(currentPage - 1, 1))}
                    disabled={currentPage <= 1}
                    aria-label="上一页"
                  >
                    <span className={styles.iconButton} aria-hidden="true">
                      ◀
                    </span>
                  </button>
                  <span className={styles.pageInput}>
                    <input
                      type="number"
                      value={clampedPage}
                      min="1"
                      max={totalPagesSafe}
                      onChange={(e) => {
                        const rawValue = Number(e.target.value);
                        if (Number.isNaN(rawValue)) {
                          return;
                        }
                        const nextValue = Math.min(Math.max(rawValue, 1), totalPagesSafe);
                        handlePageChange(nextValue);
                      }}
                    />{' '}
                    / {totalPagesSafe}
                  </span>
                  <button
                    className={styles.pageButton}
                    onClick={() => handlePageChange(Math.min(currentPage + 1, totalPagesSafe))}
                    disabled={currentPage >= totalPagesSafe}
                    aria-label="下一页"
                  >
                    <span className={styles.iconButton} aria-hidden="true">
                      ▶
                    </span>
                  </button>
                </div>
              </div>
              <PDFViewer
                files={pdfFiles}
                currentPage={clampedPage}
                onLoadSuccess={handlePDFLoaded}
              />
            </div>

            <div className={styles.mdSection}>
              <div className={styles.sectionHeader}>
                <h2>Markdown 版</h2>
                <div className={styles.mdControls}>
                  <button
                    className={styles.pageButton}
                    onClick={() => updateMdSectionByIndex(clampedMdIndex - 1)}
                    disabled={clampedMdIndex <= 0}
                    aria-label="上一篇"
                  >
                    <span className={styles.iconButton} aria-hidden="true">
                      ◀
                    </span>
                  </button>
                  <span className={styles.mdPageInfo}>
                    篇章 {mdDisplayIndex} / {totalMdSectionsSafe}
                  </span>
                  <button
                    className={styles.pageButton}
                    onClick={() => updateMdSectionByIndex(clampedMdIndex + 1)}
                    disabled={clampedMdIndex >= totalMdSectionsSafe - 1}
                    aria-label="下一篇"
                  >
                    <span className={styles.iconButton} aria-hidden="true">
                      ▶
                    </span>
                  </button>
                </div>
              </div>
              <MDViewer
                ref={mdContentRef}
                files={mdFiles}
                fontSize={fontSize}
                activeSectionIndex={clampedMdIndex}
                onTocGenerated={handleTocGenerated}
                onSectionsGenerated={handleSectionsGenerated}
              />
            </div>
          </JournalLayout>
        </main>
      </div>
    </div>
  );
};

export default Journal;
