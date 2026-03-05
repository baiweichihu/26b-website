export const ARCHIVE_CATEGORIES = [
  { value: 'journal', label: '班级日志' },
  { value: 'handbook', label: '成长手册' },
  { value: 'album', label: '班级相册' },
  { value: 'introduction', label: '人物志' },
  { value: 'activities', label: '大事记' },
];

export const hasValidArchiveAccess = (requests = [], category) => {
  const nowMs = Date.now();

  return (requests || []).some((request) => {
    if (request?.status !== 'approved') return false;

    const start = request?.request_access_start_time;
    const end = request?.request_access_end_time;
    const startMs = start ? new Date(start).getTime() : NaN;
    const endMs = end ? new Date(end).getTime() : NaN;

    if (Number.isNaN(startMs) || Number.isNaN(endMs)) return false;
    if (startMs > nowMs || endMs < nowMs) return false;

    return request?.archive_category === category;
  });
};
