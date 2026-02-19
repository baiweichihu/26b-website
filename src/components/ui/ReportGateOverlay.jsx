import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Link } from 'react-router-dom';
import NoticeBox from '../widgets/NoticeBox';
import { createReportTicket } from '../../services/postService';
import styles from './ReportGateOverlay.module.css';

const reasonOptions = [
  { value: '垃圾广告', label: '垃圾广告 / 推广' },
  { value: '不当言论', label: '不当言论 / 违规内容' },
  { value: '骚扰攻击', label: '骚扰 / 攻击 / 歧视' },
  { value: '侵权内容', label: '侵权 / 盗用内容' },
  { value: '其他', label: '其他' },
];

const truncateText = (text = '', maxLength = 28) => {
  if (!text) return '';
  const cleanText = String(text).trim();
  if (cleanText.length <= maxLength) return cleanText;
  return `${cleanText.slice(0, maxLength)}…`;
};

const ReportGateOverlay = ({
  targetType = 'post',
  targetId,
  targetSummary,
  onClose,
  onSubmitted,
  isAuthenticated = false,
}) => {
  const [reason, setReason] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const cardRef = useRef(null);

  const targetLabel = targetType === 'comment' ? '评论' : '帖子';
  const summaryText = useMemo(() => truncateText(targetSummary || ''), [targetSummary]);
  const isAnonymous = !isAuthenticated;

  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  useLayoutEffect(() => {
    const gsap = window.gsap;
    const card = cardRef.current;
    if (!gsap || !card || window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return undefined;
    }

    const ctx = gsap.context(() => {
      gsap.fromTo(
        card,
        { y: 16, opacity: 0, scale: 0.98 },
        { y: 0, opacity: 1, scale: 1, duration: 0.5, ease: 'power2.out' }
      );
    }, card);

    return () => ctx.revert();
  }, []);

  const canSubmit = Boolean(reason) && reason !== '请选择原因' && !submitting && !isAnonymous && Boolean(targetId);

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    setSubmitting(true);
    setNotice(null);

    const result = await createReportTicket({
      targetType,
      targetId,
      reason,
      suggestion,
    });

    if (result.success) {
      setNotice({ type: 'success', message: '举报已提交，我们会尽快处理。' });
      onSubmitted?.();
      setTimeout(() => {
        onClose?.();
      }, 800);
    } else {
      setNotice({ type: 'error', message: result.error || '举报失败，请稍后重试。' });
    }

    setSubmitting(false);
  };

  const overlay = (
    <div className={styles.overlay} role="presentation" onClick={onClose}>
      <div
        className={styles.card}
        ref={cardRef}
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className={styles.header}>
          <div>
            <p className={styles.kicker}>举报中心</p>
            <h2 className={styles.title}>提交举报</h2>
            <p className={styles.subtitle}>
              你正在举报这条{targetLabel}
              {summaryText ? `：${summaryText}` : '。'}
            </p>
          </div>
          <button type="button" className={styles.closeButton} onClick={onClose} aria-label="关闭">
            ×
          </button>
        </div>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        {isAnonymous && (
          <div className={styles.authHint}>
            <p>请先登录后再提交举报。</p>
            <div className={styles.authActions}>
              <Link to="/login" className="scene-button primary">
                登录
              </Link>
              <Link to="/register" className="scene-button ghost">
                注册
              </Link>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            举报原因
            <select
              className={`form-select ${styles.select}`}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              disabled={submitting || isAnonymous}
              required
            >
              <option value="">请选择原因</option>
              {reasonOptions.map((item) => (
                <option key={item.value} value={item.value}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.label}>
            建议做法 / 补充说明（可选）
            <textarea
              className={`form-control ${styles.textarea}`}
              rows={4}
              placeholder="建议删除此帖子..."
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
              disabled={submitting || isAnonymous}
            />
          </label>

          <div className={styles.actions}>
            <button
              type="button"
              className="scene-button ghost"
              onClick={onClose}
              disabled={submitting}
            >
              取消
            </button>
            <button type="submit" className="scene-button primary" disabled={!canSubmit}>
              {submitting ? '提交中...' : '提交举报'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );

  return typeof document !== 'undefined' ? createPortal(overlay, document.body) : overlay;
};

export default ReportGateOverlay;
