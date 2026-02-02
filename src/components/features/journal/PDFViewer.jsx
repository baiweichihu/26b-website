import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import styles from '../../../pages/Journal.module.css';

// Vite 需要显式设置 worker
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url
).toString();

const PDFViewer = ({ file, currentPage, onLoadSuccess }) => {
  const [numPages, setNumPages] = useState(null);
  const [scale, setScale] = useState(1.0); // 默认100%缩放
  const [isLoading, setIsLoading] = useState(true);
  const containerRef = useRef(null);

  // PDF加载成功回调
  const handleLoadSuccess = ({ numPages }) => {
    setNumPages(numPages);
    setIsLoading(false);
    if (onLoadSuccess) {
      onLoadSuccess({ numPages });
    }
  };

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
        <Document
          file={file}
          onLoadSuccess={handleLoadSuccess}
          onLoadError={(error) => {
            console.error('PDF加载失败:', error);
            setIsLoading(false);
          }}
          loading={<div className={styles.pdfLoading}>加载中...</div>}
        >
          <div className={styles.pdfPageWrapper}>
            <Page
              pageNumber={currentPage}
              scale={scale} // 使用scale参数控制缩放
              renderTextLayer={true}
              renderAnnotationLayer={true}
              className={styles.pdfPage}
            />
          </div>
        </Document>
      </div>

      {/* 错误提示 */}
      <div className={styles.pdfError}>
        {!isLoading && !numPages && (
          <div className={styles.errorMessage}>
            <p>⚠️ PDF加载失败，请检查文件路径：{file}</p>
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
