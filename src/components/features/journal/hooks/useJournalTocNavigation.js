import { useCallback, useState } from 'react';
import { resolveGlobalPdfPage } from '../journalNavigation';

export const useJournalTocNavigation = ({
  isFullscreen,
  pdfMapping,
  filePages,
  setCurrentPage,
  closeTocDropdowns,
}) => {
  const [toc, setToc] = useState([]);
  const [mdSections, setMdSections] = useState([]);
  const [currentSection, setCurrentSection] = useState('');
  const [mdSectionIndex, setMdSectionIndex] = useState(0);
  const [mdSectionTotal, setMdSectionTotal] = useState(1);

  const updateMdSectionByIndex = useCallback((nextIndex) => {
    setMdSections((prevSections) => {
      if (!prevSections || prevSections.length === 0) {
        setMdSectionIndex(0);
        setCurrentSection('');
        return prevSections;
      }

      const safeIndex = Math.min(Math.max(nextIndex, 0), prevSections.length - 1);
      const nextId = prevSections[safeIndex]?.id || '';
      setMdSectionIndex(safeIndex);
      setCurrentSection(nextId);
      return prevSections;
    });
  }, []);

  const handleTocClick = useCallback(
    (id) => {
      const targetIndex = mdSections.findIndex((item) => item.id === id);
      if (targetIndex >= 0) {
        updateMdSectionByIndex(targetIndex);

        const targetSection = mdSections[targetIndex];
        const globalPage = resolveGlobalPdfPage(targetSection, pdfMapping, filePages);
        if (globalPage) {
          setCurrentPage(globalPage);
        }

        if (isFullscreen) {
          closeTocDropdowns();
        }
        return;
      }

      setCurrentSection(id);
      if (isFullscreen) {
        closeTocDropdowns();
      }
    },
    [
      mdSections,
      updateMdSectionByIndex,
      pdfMapping,
      filePages,
      setCurrentPage,
      isFullscreen,
      closeTocDropdowns,
    ]
  );

  const handleTocGenerated = useCallback((nextToc) => {
    setToc(nextToc);
  }, []);

  const handleSectionsGenerated = useCallback((sections) => {
    setMdSections(sections);
    const total = sections.length > 0 ? sections.length : 1;
    setMdSectionTotal(total);

    if (sections.length === 0) {
      setMdSectionIndex(0);
      setCurrentSection('');
      return;
    }

    setCurrentSection((prevCurrentSection) => {
      const existingIndex = sections.findIndex((item) => item.id === prevCurrentSection);
      const nextIndex = existingIndex >= 0 ? existingIndex : 0;
      setMdSectionIndex(nextIndex);
      return sections[nextIndex]?.id || '';
    });
  }, []);

  return {
    toc,
    currentSection,
    mdSectionIndex,
    mdSectionTotal,
    updateMdSectionByIndex,
    handleTocClick,
    handleTocGenerated,
    handleSectionsGenerated,
  };
};
