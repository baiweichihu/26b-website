import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getContentReportById } from '../../services/adminService';
import styles from './ReportDetail.module.css';

const ReportDetail = () => {
  const { reportId } = useParams();
  const navigate = useNavigate();
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  useEffect(() => {
    const loadUser = async () => {
      const { data: { user: u } = {} } = await supabase.auth.getUser();
      setUser(u || null);
    };
    void loadUser();
  }, []);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      const { data, error } = await getContentReportById(reportId);
      if (error) {
        console.error('加载举报失败', error);
        setLoading(false);
        return;
      }

      // 权限检查：普通用户只能查看自己的举报
      const currentUserId = user?.id;
      if (data) {
        if (currentUserId && data.reporter_id !== currentUserId) {
          // 非管理员且不是举报人，禁止查看
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', currentUserId)
            .single();
          const role = profile?.role;
          if (role !== 'admin' && role !== 'superuser') {
            navigate('/');
            return;
          }
        }

        setReport(data);
      }
      setLoading(false);
    };

    // only load when user is known (to enable permission check)
    if (user !== null) {
      void load();
    }
  }, [reportId, user, navigate]);

  const getTypeLabel = (type) => {
    return type === 'post' ? '帖子' : '评论';
  };

  if (loading) return <div className={styles.loading}>加载中...</div>;
  if (!report) return <div className={styles.empty}>未找到该举报或无权查看</div>;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate(-1)} title="返回">
          <i className="fas fa-arrow-left"></i> 返回
        </button>
      </div>

      <div className={styles.content}>
        <h1>举报详情</h1>

        <div className={styles.card}>
          <div className={styles.section}>
            <div className={styles.field}>
              <label>举报人</label>
              <p>{report.reporter?.nickname || report.reporter_id}</p>
            </div>
            <div className={styles.field}>
              <label>内容类型</label>
              <p>{getTypeLabel(report.target_type)}</p>
            </div>
            <div className={styles.field}>
              <label>举报人工ID</label>
              <p className={styles.code}>{report.id}</p>
            </div>
          </div>
        </div>

        <div className={styles.card}>
          <div className={styles.section}>
            <div className={styles.field}>
              <label>举报原因</label>
              <p>{report.reason}</p>
            </div>
            {report.suggestion && (
              <div className={styles.field}>
                <label>补充说明</label>
                <p>{report.suggestion}</p>
              </div>
            )}
            <div className={styles.field}>
              <label>举报时间</label>
              <p>{new Date(report.created_at).toLocaleString('zh-CN')}</p>
            </div>
          </div>
        </div>

        {report.target_content && (
          <div className={styles.card}>
            <div className={styles.section}>
              <div className={styles.field}>
                <label>被举报内容</label>
                <div className={styles.contentBlock}>{report.target_content}</div>
              </div>
            </div>
          </div>
        )}

        {report.status !== 'pending' && (
          <div className={styles.resultCard}>
            <div className={styles.section}>
              <h3>处理结果</h3>
              {report.admin_note && (
                <div className={styles.field}>
                  <label>管理员备注</label>
                  <p>{report.admin_note}</p>
                </div>
              )}
              <div className={styles.field}>
                <label>处理时间</label>
                <p>{new Date(report.updated_at).toLocaleString('zh-CN')}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReportDetail;
