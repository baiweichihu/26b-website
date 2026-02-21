import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import NoticeBox from '../../components/widgets/NoticeBox';
import { useIrisTransition } from '../../components/ui/IrisTransition';
import styles from './Journal.module.css';

/**
 * 校友查档申请页面
 * 允许校友申请班级日志查档权限
 */
const AlumniJournalAccess = () => {
  const navigate = useNavigate();
  const { triggerIris } = useIrisTransition();
  const [status, setStatus] = useState('loading');
  const [userId, setUserId] = useState(null);
  const [userIdentity, setUserIdentity] = useState(null);
  const [currentRequests, setCurrentRequests] = useState([]);
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const panelRef = useRef(null);
  const [formData, setFormData] = useState({
    days: '',
    reason: '',
  });

  // 检查用户身份和权限
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          navigate('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('identity_type, role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          navigate('/');
          return;
        }

        // 只有校友可以访问此页面
        if (profile.identity_type !== 'alumni') {
          navigate('/');
          return;
        }

        setUserId(user.id);
        setUserIdentity(profile.identity_type);
        setStatus('ready');

        // 加载当前查档申请
        await loadCurrentRequests(user.id);
      } catch (error) {
        console.error('检查权限失败:', error);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  const loadCurrentRequests = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('journal_access_requests')
        .select('id, status, requested_access_days, requested_access_start_time, requested_access_end_time, reason, created_at, handled_at')
        .eq('requester_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        setCurrentRequests(data);
      }
    } catch (err) {
      console.error('加载查档申请失败:', err);
    }
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setNotice(null);

    // 验证表单
    const daysNum = parseInt(formData.days, 10);
    if (!formData.days || isNaN(daysNum) || daysNum < 1 || daysNum > 30) {
      setNotice({ type: 'error', message: '申请查档天数必须为 1-30 之间的整数' });
      return;
    }

    setSubmitting(true);

    try {
      // 申请时，管理员还未批准，所以先不设置时间范围
      // 等管理员批准时，才会设置实际的时间范围
      const { error } = await supabase
        .from('journal_access_requests')
        .insert([
          {
            requester_id: userId,
            status: 'pending',
            requested_access_days: daysNum,
            reason: formData.reason.trim() || null,
          },
        ]);

      if (error) throw error;

      setNotice({ type: 'success', message: '申请已提交，请等待管理员审核' });
      setFormData({ days: '', reason: '' });

      // 重新加载申请列表
      await loadCurrentRequests(userId);
    } catch (err) {
      setNotice({ type: 'error', message: err.message || '提交失败，请重试' });
    } finally {
      setSubmitting(false);
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'pending':
        return { label: '待审核', color: '#f59e0b' };
      case 'approved':
        return { label: '已批准', color: '#10b981' };
      case 'rejected':
        return { label: '已驳回', color: '#ef4444' };
      default:
        return { label: '未知', color: '#6b7280' };
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (status === 'loading') {
    return (
      <div className="page-content scene-page">
        <section className={`scene-panel ${styles.journalPanel}`} ref={panelRef}>
          <div style={{ padding: '2rem', textAlign: 'center' }}>
            <p className="scene-kicker">班级日志</p>
            <h1 className="scene-title">加载中...</h1>
            <p className="scene-subtitle">正在加载查档申请信息</p>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.journalPanel}`} ref={panelRef}>
        <div style={{ padding: 'clamp(1.8rem, 4vw, 3rem)' }}>
          <div style={{ marginBottom: '1.6rem' }}>
            <p className="scene-kicker">班级日志</p>
            <h1 className="scene-title">查档申请</h1>
            <p className="scene-subtitle">申请班级日志查档时间权限</p>
          </div>

          {notice && <NoticeBox type={notice.type} message={notice.message} />}

          {/* 申请表单 */}
          <div
            style={{
              background: 'var(--panel-bg)',
              border: '1px solid var(--panel-border)',
              borderRadius: '12px',
              padding: '1.4rem',
              marginBottom: '2rem',
            }}
          >
            <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
              提交新申请
            </h2>
            <form onSubmit={handleSubmit}>
              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="journal-access-days"
                  style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}
                >
                  申请查档天数 *
                </label>
                <input
                  id="journal-access-days"
                  type="number"
                  name="days"
                  value={formData.days}
                  onChange={handleInputChange}
                  min="1"
                  max="30"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                  }}
                  required
                />
                <small style={{ color: '#999', display: 'block', marginTop: '0.3rem' }}>
                  管理员批准后，将从批准日期开始计算（最多申请30天）
                </small>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label
                  htmlFor="journal-access-reason"
                  style={{ display: 'block', fontSize: '0.9rem', fontWeight: '500', marginBottom: '0.5rem' }}
                >
                  申请说明（可选）
                </label>
                <textarea
                  id="journal-access-reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  rows="3"
                  maxLength="200"
                  style={{
                    width: '100%',
                    padding: '0.6rem 0.8rem',
                    border: '1px solid var(--panel-border)',
                    borderRadius: '6px',
                    fontSize: '0.9rem',
                    background: 'var(--input-bg)',
                    color: 'var(--text-primary)',
                    resize: 'vertical',
                    fontFamily: 'inherit',
                  }}
                />
                <small style={{ color: '#999', display: 'block', marginTop: '0.3rem' }}>
                  {formData.reason.length}/200
                </small>
              </div>

              <div style={{ display: 'flex', gap: '0.8rem' }}>
                <button
                  type="submit"
                  disabled={submitting}
                  className="scene-button primary"
                  style={{ opacity: submitting ? 0.6 : 1 }}
                >
                  {submitting ? '提交中...' : '提交申请'}
                </button>
                <button
                  type="button"
                  className="scene-button ghost"
                  onClick={() => navigate('/journal')}
                >
                  返回
                </button>
              </div>
            </form>
          </div>

          {/* 申请历史 */}
          {currentRequests.length > 0 && (
            <div
              style={{
                background: 'var(--panel-bg)',
                border: '1px solid var(--panel-border)',
                borderRadius: '12px',
                padding: '1.4rem',
              }}
            >
              <h2 style={{ fontSize: '1.1rem', fontWeight: '600', marginBottom: '1rem' }}>
                申请历史
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table
                  style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '0.9rem',
                  }}
                >
                  <thead>
                    <tr style={{ borderBottom: '2px solid var(--panel-border)' }}>
                      <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: '600' }}>
                        状态
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: '600' }}>
                        申请天数
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: '600' }}>
                        实际查档时段
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: '600' }}>
                        申请时间
                      </th>
                      <th style={{ padding: '0.8rem', textAlign: 'left', fontWeight: '600' }}>
                        处理时间
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {currentRequests.map((request) => {
                      const statusInfo = getStatusLabel(request.status);
                      const hasTimeRange = request.requested_access_start_time && request.requested_access_end_time;
                      return (
                        <tr key={request.id} style={{ borderBottom: '1px solid var(--panel-border)' }}>
                          <td style={{ padding: '0.8rem' }}>
                            <span
                              style={{
                                display: 'inline-block',
                                padding: '0.3rem 0.8rem',
                                borderRadius: '12px',
                                backgroundColor: `${statusInfo.color}22`,
                                color: statusInfo.color,
                                fontSize: '0.85rem',
                                fontWeight: '500',
                              }}
                            >
                              {statusInfo.label}
                            </span>
                          </td>
                          <td style={{ padding: '0.8rem' }}>
                            {request.requested_access_days || '-'} 天
                          </td>
                          <td style={{ padding: '0.8rem' }}>
                            {hasTimeRange ? (
                              `${formatDate(request.requested_access_start_time)} ~ ${formatDate(request.requested_access_end_time)}`
                            ) : (
                              '-'
                            )}
                          </td>
                          <td style={{ padding: '0.8rem' }}>
                            {formatDate(request.created_at)}
                          </td>
                          <td style={{ padding: '0.8rem' }}>
                            {formatDate(request.handled_at) || '-'}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {currentRequests.length === 0 && (
            <div
              style={{
                textAlign: 'center',
                padding: '2rem',
                color: '#999',
              }}
            >
              <p>暂无申请记录</p>
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default AlumniJournalAccess;
