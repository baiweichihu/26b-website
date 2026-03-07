import { useState } from 'react';

export const useJournalReaderControls = () => {
  const [pdfScale, setPdfScale] = useState(1.0);
  const [mdFontSize, setMdFontSize] = useState(16);
  const [totalPages, setTotalPages] = useState(0);
  const [currentPage, setCurrentPage] = useState(1);
  const [filePages, setFilePages] = useState([]);

  const handlePDFLoaded = ({ numPages }) => {
    setTotalPages(numPages);
  };

  const handlePDFFilePagesUpdated = (pages) => {
    setFilePages(pages);
  };

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const totalPagesSafe = totalPages > 0 ? totalPages : 1;
  const clampedPage = Math.min(currentPage, totalPagesSafe);

  return {
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
  };
};
