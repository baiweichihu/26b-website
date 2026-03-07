export const resolveGlobalPdfPage = (section, pdfMapping, filePages) => {
  if (!section || section.volume === undefined || section.sectionIndex === undefined) {
    return null;
  }

  const mappingKey = `${section.volume}-${section.sectionIndex}`;
  const pdfInfo = pdfMapping[mappingKey];
  if (!pdfInfo?.pdfPageStart) {
    return null;
  }

  let globalPage = pdfInfo.pdfPageStart;
  if (section.volume > 1 && Array.isArray(filePages) && filePages.length > 0) {
    for (let i = 0; i < section.volume - 1; i++) {
      globalPage += filePages[i] || 0;
    }
  }

  return globalPage;
};
