import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getJournalAccessRequests,
  approveJournalAccess,
  rejectJournalAccess,
} from '../../services/adminService';
import styles from './JournalApproval.module.css';

function JournalApproval() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [requests, setRequests] = useState([]);
  const [filter, setFilter] = useState('pending');
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [error, setError] = useState(null);

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

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          navigate('/');
          return;
        }

        if (profile.role !== 'admin' && profile.role !== 'superuser') {
          navigate('/');
          return;
        }

        setUserId(user.id);
      } catch (err) {
        console.error('检查权限失败:', err);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadRequests = async () => {
      setLoading(true);
      setError(null);

      const { data, error } = await getJournalAccessRequests(
        filter === 'all' ? null : filter
      );

      if (error) {
        setError(error.message || '加载查档申请失败');
      } else {
        setRequests(data || []);
      }

      setLoading(false);
    };

    loadRequests();
  }, [filter]);

  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    setError(null);

    const { error } = await approveJournalAccess(requestId, userId);

    if (error) {
      setError(error.message || '批准查档申请失败');
    } else {
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'approved' } : req
        )
      );
    }

    setProcessingId(null);
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    setError(null);

    const { error } = await rejectJournalAccess(requestId, userId);

    if (error) {
      setError(error.message || '驳回查档申请失败');
    } else {
      setRequests((prev) =>
        prev.map((req) =>
          req.id === requestId ? { ...req, status: 'rejected' } : req
        )
      );
    }

    setProcessingId(null);
  };

  const formatDate = (value) => {
    if (!value) return '-';
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleDateString('zh-CN');
  };

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
        <h1>班日志审核</h1>
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
              ? '待审核'
              : status === 'approved'
              ? '已批准'
              : '已驳回'}
          </button>
        ))}
      </div>

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : requests.length === 0 ? (
        <div className={styles.empty}>暂无查档申请</div>
      ) : (
        <div className={styles.table}>
          <div className={styles.tableHeader}>
            <div className={styles.col1}>申请人</div>
            <div className={styles.col2}>查档时间范围</div>
            <div className={styles.col3}>申请理由</div>
            <div className={styles.col4}>操作</div>
          </div>
          {requests.map((request) => (
            <div key={request.id} className={styles.tableRow}>
              <div className={styles.col1}>
                <div className={styles.userInfo}>
                  {request.requester?.avatar_url && (
                    <img src={request.requester.avatar_url} alt="avatar" />
                  )}
                  <div>
                    <p>{request.requester?.nickname || '未知用户'}</p>
                    <small>{request.requester?.email}</small>
                  </div>
                </div>
              </div>
              <div className={styles.col2}>
                {formatDate(request.requested_access_start_time)} -{' '}
                {formatDate(request.requested_access_end_time)}
              </div>
              <div className={styles.col3}>{request.reason || '-'}</div>
              <div className={styles.col4}>
                {request.status === 'pending' ? (
                  <>
                    <button
                      className={styles.approveBtn}
                      onClick={() => handleApprove(request.id)}
                      disabled={processingId === request.id}
                    >
                      批准
                    </button>
                    <button
                      className={styles.rejectBtn}
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                    >
                      驳回
                    </button>
                  </>
                ) : (
                  <span
                    className={`${styles.status} ${
                      request.status === 'approved'
                        ? styles.approved
                        : styles.rejected
                    }`}
                  >
                    {request.status === 'approved' ? '已批准' : '已驳回'}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default JournalApproval;
