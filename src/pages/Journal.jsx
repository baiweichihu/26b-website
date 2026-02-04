import React, { useState, useRef } from 'react';
import PDFViewer from '../components/features/journal/PDFViewer';
import MDViewer from '../components/features/journal/MDViewer';
import TableOfContents from '../components/features/journal/TableOfContents';
import JournalLayout from '../components/features/journal/JournalLayout';
import styles from './Journal.module.css';

const Journal = () => {
  const [fontSize, setFontSize] = useState(16);
  const [currentSection, setCurrentSection] = useState('');
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

  const handleTocClick = (id) => {
    setCurrentSection(id);

    setTimeout(() => {
      const element = document.getElementById(id);
      if (element && mdContentRef.current) {
        const elementRect = element.getBoundingClientRect();
        const containerRect = mdContentRef.current.getBoundingClientRect();
        const scrollTop = mdContentRef.current.scrollTop;
        const targetScroll = scrollTop + (elementRect.top - containerRect.top) - 20;

        mdContentRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }
    }, 0);
  };

  const handlePDFLoaded = ({ numPages }) => {
    setTotalPages(numPages);
  };

  const totalPagesSafe = totalPages > 0 ? totalPages : 1;
  const clampedPage = Math.min(currentPage, totalPagesSafe);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

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
                  >
                    上一页
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
                  >
                    下一页
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
                <div className={styles.mdStats}>
                  <span>字符数：--</span>
                </div>
              </div>
              <MDViewer
                ref={mdContentRef}
                files={mdFiles}
                fontSize={fontSize}
                onTocGenerated={setToc}
              />
            </div>
          </JournalLayout>
        </main>
      </div>
    </div>
  );
};

export default Journal;
