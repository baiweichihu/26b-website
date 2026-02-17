import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getContentReports,
  resolveReport,
  dismissReport,
  deletePost,
  deleteComment,
} from '../../services/adminService';
import styles from './ContentReports.module.css';

/**
 * 内容举报管理页面
 * 管理员可以查看举报、处理举报、删除违规内容
 */
function ContentReports() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [reports, setReports] = useState([]);
  const [filter, setFilter] = useState('pending'); // pending, approved, rejected
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [processingReportId, setProcessingReportId] = useState(null);
  const [selectedReport, setSelectedReport] = useState(null);
  const [adminNote, setAdminNote] = useState('');

  // 检查登录状态和权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          navigate('/login');
          return;
        }

        // 获取用户信息
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          navigate('/');
          return;
        }

        // 只有管理员和 superuser 可以访问
        if (profile.role !== 'admin' && profile.role !== 'superuser') {
          navigate('/');
          return;
        }

        setUserId(user.id);
        setUserRole(profile.role);
      } catch (error) {
        console.error('检查权限失败:', error);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  // 加载举报列表
  useEffect(() => {
    const loadReports = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await getContentReports(
        filter === 'all' ? null : filter
      );

      if (error) {
        setError(error.message || '加载举报列表失败');
      } else {
        setReports(data || []);
      }

      setLoading(false);
    };

    loadReports();
  }, [filter]);

  // 处理举报为已解决
  const handleResolveReport = async (reportId) => {
    if (!adminNote.trim()) {
      alert('请输入处理备注');
      return;
    }

    setProcessingReportId(reportId);
    setError(null);

    try {
      const { error } = await resolveReport(reportId, adminNote, userId);

      if (error) {
        setError(error.message || '处理举报失败');
      } else {
        // 从列表中移除或更新状态
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: 'approved' } : r
          )
        );
        setSelectedReport(null);
        setAdminNote('');
        alert('举报已处理');
      }
    } catch (err) {
      setError(err.message || '处理举报失败');
    }

    setProcessingReportId(null);
  };

  // 驳回举报
  const handleDismissReport = async (reportId) => {
    if (!adminNote.trim()) {
      alert('请输入驳回原因');
      return;
    }

    setProcessingReportId(reportId);
    setError(null);

    try {
      const { error } = await dismissReport(reportId, adminNote, userId);

      if (error) {
        setError(error.message || '驳回举报失败');
      } else {
        setReports((prev) =>
          prev.map((r) =>
            r.id === reportId ? { ...r, status: 'rejected' } : r
          )
        );
        setSelectedReport(null);
        setAdminNote('');
        alert('举报已驳回');
      }
    } catch (err) {
      setError(err.message || '驳回举报失败');
    }

    setProcessingReportId(null);
  };

  // 删除违规内容
  const handleDeleteContent = async (report) => {
    if (
      !window.confirm(
        `删除此${report.target_type === 'post' ? '帖子' : '评论'}后无法恢复，确认吗？`
      )
    ) {
      return;
    }

    setProcessingReportId(report.id);
    setError(null);

    try {
      let deleteError;
      if (report.target_type === 'post') {
        const { error } = await deletePost(report.target_id, userId);
        deleteError = error;
      } else if (report.target_type === 'comment') {
        const { error } = await deleteComment(report.target_id, userId);
        deleteError = error;
      }

      if (deleteError) {
        setError(deleteError.message || '删除内容失败');
      } else {
        alert('内容已删除');
        // 处理为已解决
        handleResolveReport(report.id);
      }
    } catch (err) {
      setError(err.message || '删除内容失败');
    }

    setProcessingReportId(null);
  };

  const getReasonLabel = (reason) => {
    const labels = {
      spam: '垃圾内容',
      harassment: '骚扰恐吓',
      hate_speech: '仇恨言论',
      violence: '暴力内容',
      adult_content: '成人内容',
      copyright: '侵犯版权',
      other: '其他',
    };
    return labels[reason] || reason;
  };

  const filteredReports = reports.filter(
    (r) => filter === 'all' || r.status === filter
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/admin/dashboard')}
          title="返回管理员中心"
        >
          <i className="fas fa-arrow-left"></i> 返回
        </button>
        <h1>内容管理 - 举报处理</h1>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.filterBar}>
        <label>状态过滤：</label>
        {['all', 'pending', 'approved', 'rejected'].map((status) => (
          <button
            key={status}
            className={`${styles.filterBtn} ${
              filter === status ? styles.active : ''
            }`}
            onClick={() => setFilter(status)}
          >
            {status === 'all'
              ? '全部'
              : status === 'pending'
              ? '待处理'
              : status === 'approved'
              ? '已处理'
              : '已驳回'}
          </button>
        ))}
      </div>

      <div className={styles.mainContent}>
        {/* 举报列表 */}
        <div className={styles.reportsList}>
          {loading ? (
            <div className={styles.loading}>加载中...</div>
          ) : filteredReports.length === 0 ? (
            <div className={styles.empty}>暂无举报</div>
          ) : (
            filteredReports.map((report) => (
              <div
                key={report.id}
                className={`${styles.reportCard} ${
                  selectedReport?.id === report.id ? styles.selected : ''
                }`}
                onClick={() => setSelectedReport(report)}
              >
                <div className={styles.reportCardHeader}>
                  <span
                    className={`${styles.statusBadge} ${styles[report.status]}`}
                  >
                    {report.status === 'pending'
                      ? '待处理'
                      : report.status === 'approved'
                      ? '已处理'
                      : '已驳回'}
                  </span>
                  <span className={styles.timestamp}>
                    {new Date(report.created_at).toLocaleString('zh-CN')}
                  </span>
                </div>

                <div className={styles.reportCardContent}>
                  <div className={styles.reporterInfo}>
                    <p>
                      <strong>举报人：</strong> {report.reporter?.nickname || '未知'}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>内容类型：</strong>{' '}
                      {report.target_type === 'post' ? '帖子' : '评论'}
                    </p>
                  </div>
                  <div>
                    <p>
                      <strong>举报原因：</strong> {getReasonLabel(report.reason)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* 详情面板 */}
        <div className={styles.detailPanel}>
          {selectedReport ? (
            <>
              <h2>举报详情</h2>

              <div className={styles.detailSection}>
                <h3>举报信息</h3>
                <div className={styles.detailGroup}>
                  <label>举报人：</label>
                  <div className={styles.reporterCard}>
                    {selectedReport.reporter?.avatar_url && (
                      <img src={selectedReport.reporter.avatar_url} alt="avatar" />
                    )}
                    <div>
                      <p>{selectedReport.reporter?.nickname || '未知用户'}</p>
                      <small>{selectedReport.reporter?.email}</small>
                    </div>
                  </div>
                </div>
                <div className={styles.detailGroup}>
                  <label>举报原因：</label>
                  <p>{getReasonLabel(selectedReport.reason)}</p>
                </div>
                {selectedReport.suggestion && (
                  <div className={styles.detailGroup}>
                    <label>举报人建议：</label>
                    <p>{selectedReport.suggestion}</p>
                  </div>
                )}
              </div>

              <div className={styles.detailSection}>
                <h3>被举报内容</h3>
                <div className={styles.contentPreview}>
                  <p>
                    <strong>内容类型：</strong>{' '}
                    {selectedReport.target_type === 'post' ? '帖子' : '评论'}
                  </p>
                  <p>
                    <strong>内容ID：</strong> {selectedReport.target_id}
                  </p>
                  <p>
                    <strong>举报原因：</strong> {selectedReport.reason}
                  </p>
                  {selectedReport.suggestion && (
                    <p>
                      <strong>举报者建议：</strong>
                      <br />
                      <span className={styles.suggestion}>{selectedReport.suggestion}</span>
                    </p>
                  )}
                </div>
              </div>

              {selectedReport.status !== 'pending' ? (
                <div className={styles.detailSection}>
                  <h3>处理结果</h3>
                  <div className={styles.notesBox}>
                    {selectedReport.admin_note}
                  </div>
                  <p className={styles.handledInfo}>
                    处理时间：{new Date(selectedReport.updated_at).toLocaleString('zh-CN')}
                  </p>
                </div>
              ) : (
                <div className={styles.detailSection}>
                  <h3>处理此举报</h3>
                  <textarea
                    className={styles.notesInput}
                    placeholder="请输入处理备注或驳回原因..."
                    value={adminNote}
                    onChange={(e) => setAdminNote(e.target.value)}
                  />
                  <div className={styles.actionButtons}>
                    <button
                      className={styles.deleteBtn}
                      onClick={() => handleDeleteContent(selectedReport)}
                      disabled={processingReportId === selectedReport.id}
                    >
                      删除违规内容
                    </button>
                    <button
                      className={styles.resolveBtn}
                      onClick={() => handleResolveReport(selectedReport.id)}
                      disabled={
                        processingReportId === selectedReport.id ||
                        !adminNote.trim()
                      }
                    >
                      标记为已处理
                    </button>
                    <button
                      className={styles.dismissBtn}
                      onClick={() => handleDismissReport(selectedReport.id)}
                      disabled={
                        processingReportId === selectedReport.id ||
                        !adminNote.trim()
                      }
                    >
                      驳回举报
                    </button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className={styles.emptyDetail}>
              <p>选择一条举报查看详情</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default ContentReports;
