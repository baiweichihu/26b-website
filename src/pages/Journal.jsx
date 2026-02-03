import React, { useState, useRef } from 'react';
import PDFViewer from '../components/features/journal/PDFViewer';
import MDViewer from '../components/features/journal/MDViewer';
import TableOfContents from '../components/features/journal/TableOfContents';
import JournalLayout from '../components/features/journal/JournalLayout';
import styles from './Journal.module.css';

const Journal = () => {
  // 字体大小状态
  const [fontSize, setFontSize] = useState(16);
  // 当前目录项
  const [currentSection, setCurrentSection] = useState('');
  // PDF 总页数
  const [totalPages, setTotalPages] = useState(0);
  // PDF 当前页
  const [currentPage, setCurrentPage] = useState(1);
  // 目录数据
  const [toc, setToc] = useState([]);
  // MD 内容容器 ref
  const mdContentRef = useRef(null);
  // 获取文件的引用
  const baseUrl = import.meta.env.BASE_URL || '/';
  const pdfFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.pdf`, `${baseUrl}journals/journal2.pdf`],
    [baseUrl]
  );
  const mdFiles = React.useMemo(
    () => [`${baseUrl}journals/journal1.md`, `${baseUrl}journals/journal2.md`],
    [baseUrl]
  );
  // 字体调整函数
  const increaseFontSize = () => setFontSize((prev) => Math.min(prev + 1, 24));
  const decreaseFontSize = () => setFontSize((prev) => Math.max(prev - 1, 12));
  const resetFontSize = () => setFontSize(16);

  // 处理目录点击 - 实现滚动跳转
  const handleTocClick = (id) => {
    setCurrentSection(id);

    // 查找对应的标题元素并滚动到它
    setTimeout(() => {
      const element = document.getElementById(id);
      if (element && mdContentRef.current) {
        // 计算元素相对于容器的位置
        const elementRect = element.getBoundingClientRect();
        const containerRect = mdContentRef.current.getBoundingClientRect();
        const scrollTop = mdContentRef.current.scrollTop;
        const targetScroll = scrollTop + (elementRect.top - containerRect.top) - 20; // 20px 的偏移量

        mdContentRef.current.scrollTo({
          top: targetScroll,
          behavior: 'smooth',
        });
      }
    }, 0);
  };

  // 处理 PDF 加载完成
  const handlePDFLoaded = ({ numPages }) => {
    setTotalPages(numPages);
  };

  const clampedPage = totalPages > 0 ? Math.min(currentPage, totalPages) : currentPage;

  // 处理 PDF 翻页
  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  return (
    <div className={styles.journalContainer}>
      <header className={styles.journalHeader}>
        <h1>少26B班级日志</h1>
        <p>光阴似箭，日月如梭，我们不觉离别。故册轻启，往事盈怀，墨迹犹存少年。</p>
      </header>

      <div className={styles.controls}>
        <div className={styles.fontControls}>
          <span className={styles.controlLabel}>字体大小：</span>
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
            PDF: 第 {clampedPage} 页 / 共 {totalPages} 页
          </span>
        </div>
      </div>

      <main className={styles.mainContent}>
        {/* 目录侧边栏（左侧） */}
        <aside className={styles.sidebar}>
          <TableOfContents toc={toc} currentSection={currentSection} onTocClick={handleTocClick} />
        </aside>

        {/* 双栏主内容区 */}
        <JournalLayout>
          {/* PDF 查看器 */}
          <div className={styles.pdfSection}>
            <div className={styles.sectionHeader}>
              <h2>📄 PDF版</h2>
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
                    max={totalPages}
                    onChange={(e) => {
                      const rawValue = Number(e.target.value);
                      if (Number.isNaN(rawValue)) {
                        return;
                      }
                      const upperBound = totalPages > 0 ? totalPages : 1;
                      const clampedValue = Math.min(Math.max(rawValue, 1), upperBound);
                      handlePageChange(clampedValue);
                    }}
                  />{' '}
                  / {totalPages}
                </span>
                <button
                  className={styles.pageButton}
                  onClick={() => handlePageChange(Math.min(currentPage + 1, totalPages))}
                  disabled={currentPage >= totalPages}
                >
                  下一页
                </button>
              </div>
            </div>
            <PDFViewer files={pdfFiles} currentPage={clampedPage} onLoadSuccess={handlePDFLoaded} />
          </div>

          {/* Markdown 查看器 */}
          <div className={styles.mdSection}>
            <div className={styles.sectionHeader}>
              <h2>📝 MarkDown版</h2>
              <div className={styles.mdStats}>
                <span>字符数: --</span>
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
  );
};

export default Journal;
