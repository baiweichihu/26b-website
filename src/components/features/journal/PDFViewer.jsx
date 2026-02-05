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

const PDFViewer = ({ file, files, currentPage, onLoadSuccess, onFilePages, scale = 1.0 }) => {
  const [filePages, setFilePages] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [hasLoadedOnce, setHasLoadedOnce] = useState(false);
  const [loadError, setLoadError] = useState(false);
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
      setHasLoadedOnce(true);
      setLoadError(false);
    };

  React.useEffect(() => {
    setFilePages([]);
    if (fileList.length > 0) {
      setIsLoading(true);
    } else {
      setIsLoading(false);
    }
    setLoadError(false);
  }, [fileList]);

  React.useEffect(() => {
    // 检查是否所有 PDF 都已加载完成
    if (fileList.length > 0 && filePages.filter(Boolean).length === fileList.length) {
      setIsLoading(false);
    } else if (fileList.length > 0 && filePages.length > 0) {
      // 如果有 filePages 但还没全部加载完，保持 loading 状态
      // 这里不做任何操作，保持当前的 isLoading 状态
    }
  }, [fileList.length, filePages]);

  // 添加页面可见性监听，确保页面恢复时重新检查加载状态
  React.useEffect(() => {
    const handleVisibilityChange = () => {
      if (
        !document.hidden &&
        fileList.length > 0 &&
        filePages.filter(Boolean).length === fileList.length
      ) {
        // 页面可见且所有PDF已加载，确保设置为非加载状态
        setIsLoading(false);
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [fileList.length, filePages]);

  React.useEffect(() => {
    if (onLoadSuccess && totalPages > 0) {
      onLoadSuccess({ numPages: totalPages });
    }
  }, [onLoadSuccess, totalPages]);

  React.useEffect(() => {
    if (onFilePages && filePages.length > 0) {
      onFilePages(filePages);
    }
  }, [onFilePages, filePages]);

  const handlePageRenderSuccess = React.useCallback(() => {
    setIsLoading(false);
    setHasLoadedOnce(true);
    setLoadError(false);
  }, []);

  const handlePageRenderError = React.useCallback((error) => {
    console.error('PDF页面渲染失败:', error);
    setIsLoading(false);
    setLoadError(true);
  }, []);

  return (
    <div className={styles.pdfViewerContainer} ref={containerRef}>
      {isLoading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner}></div>
          <p>正在加载PDF...</p>
        </div>
      )}

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
              if (!document.hidden) {
                setLoadError(true);
              }
            }}
            loading={<div className={styles.pdfLoading}>加载中...</div>}
          >
            {index === activePageInfo.fileIndex && (
              <div className={styles.pdfPageWrapper}>
                <Page
                  pageNumber={activePageInfo.pageInFile}
                  scale={scale}
                  renderTextLayer={true}
                  renderAnnotationLayer={true}
                  className={styles.pdfPage}
                  onRenderSuccess={handlePageRenderSuccess}
                  onRenderError={handlePageRenderError}
                />
              </div>
            )}
          </Document>
        ))}
      </div>

      {/* 错误提示 */}
      <div className={styles.pdfError}>
        {!isLoading && loadError && !hasLoadedOnce && !totalPages && (
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
