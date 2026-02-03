import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import styles from '../../../pages/Journal.module.css';

// Vite 需要显式设置 worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PDFViewer = ({ file, files, currentPage, onLoadSuccess }) => {
  const [filePages, setFilePages] = useState([]);
  const [scale, setScale] = useState(1.0); // 默认100%缩放
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  const fileList = React.useMemo(() => {
    if (Array.isArray(files) && files.length > 0) {
      return files;
    }
    if (file) {
      return [file];
    }
    return [];
  }, [files, file]);

  const totalPages = React.useMemo(() => {
    return filePages.reduce((sum, pages) => sum + (pages || 0), 0);
  }, [filePages]);

  const activePageInfo = (() => {
    if (fileList.length === 0) {
      return { fileIndex: 0, pageInFile: 1 };
    }

    if (totalPages <= 0) {
      return { fileIndex: 0, pageInFile: 1 };
    }

    let remaining = Math.max(currentPage || 1, 1);
    for (let i = 0; i < fileList.length; i += 1) {
      const pages = filePages[i] || 0;
      if (remaining <= pages || pages === 0) {
        return { fileIndex: i, pageInFile: Math.max(remaining, 1) };
      }
      remaining -= pages;
    }

    return {
      fileIndex: Math.max(fileList.length - 1, 0),
      pageInFile: Math.max(remaining, 1),
    };
  })();

  // PDF加载成功回调
  const handleLoadSuccess =
    (index) =>
    ({ numPages }) => {
      setFilePages((prev) => {
        const next = [...prev];
        next[index] = numPages;
        return next;
      });
    };

  React.useEffect(() => {
    setFilePages([]);
    if (fileList.length > 0) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
  }, [fileList]);

  React.useEffect(() => {
    if (fileList.length > 0 && filePages.filter(Boolean).length === fileList.length) {
      setIsLoading(false);
    }
  }, [fileList.length, filePages]);

  React.useEffect(() => {
    if (onLoadSuccess && totalPages > 0) {
      onLoadSuccess({ numPages: totalPages });
    }
  }, [onLoadSuccess, totalPages]);

  // 缩放控制
  const zoomIn = () => setScale((prev) => Math.min(prev + 0.2, 3.0));
  const zoomOut = () => setScale((prev) => Math.max(prev - 0.2, 0.5));
  const zoomReset = () => setScale(1.0); // 重置到100%

  return (
    <div className={styles.pdfViewerContainer} ref={containerRef}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>正在加载PDF...</p>
        </div>
      )}

      {/* 缩放控件 */}
      <div className={styles.pdfToolbar}>
        <div className={styles.zoomControls}>
          <button onClick={zoomOut} className={styles.toolbarButton}>
            -
          </button>
          <span className={styles.zoomDisplay}>{Math.round(scale * 100)}%</span>
          <button onClick={zoomIn} className={styles.toolbarButton}>
            +
          </button>
          <button onClick={zoomReset} className={styles.toolbarButton}>
            100%
          </button>
        </div>
      </div>

      {/* PDF 渲染区域 */}
      <div className={styles.pdfContent}>
        {fileList.map((pdfFile, index) => (
          <Document
            key={pdfFile}
            file={pdfFile}
            onLoadSuccess={handleLoadSuccess(index)}
            onLoadError={(error) => {
              console.error('PDF加载失败:', error);
              setIsLoading(false);
            }}
            loading={<div className={styles.pdfLoading}>加载中...</div>}
          >
            {index === activePageInfo.fileIndex && (
              <div className={styles.pdfPageWrapper}>
                <Page
                  pageNumber={activePageInfo.pageInFile}
                  scale={scale} // 使用scale参数控制缩放
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className={styles.pdfPage}
                />
              </div>
            )}
          </Document>
        ))}
      </div>

      {/* 错误提示 */}
      <div className={styles.pdfError}>
        {!isLoading && !totalPages && (
          <div className={styles.errorMessage}>
            <p>⚠️ PDF加载失败，请检查文件路径：{fileList.join(', ')}</p>
            <p>
              确保文件已放置在 <code>public/journals/</code> 目录下
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default PDFViewer;
