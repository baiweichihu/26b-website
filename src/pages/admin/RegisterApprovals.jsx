import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getRegisterRequests,
  approveRegisterRequest,
  rejectRegisterRequest,
} from '../../services/adminService';
import styles from './AdminSimplePage.module.css';
import tableStyles from './UserPermissions.module.css';

function RegisterApprovals() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [activeStatus, setActiveStatus] = useState('pending');
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [processingId, setProcessingId] = useState(null);
  const [rejectReasons, setRejectReasons] = useState({});
  const [error, setError] = useState(null);

  const normalizeError = (errorLike, fallback) => {
    if (!errorLike) return fallback;
    if (typeof errorLike === 'string') return errorLike;
    return errorLike.message || fallback;
  };

  useEffect(() => {
    const checkAuth = async () => {
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

      if (profileError || !profile || profile.role !== 'superuser') {
        navigate('/');
        return;
      }

      setUserId(user.id);
    };

    void checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadRequests = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);

      const status = activeStatus === 'all' ? null : activeStatus;
      const { data, error: loadError } = await getRegisterRequests(status);
      if (loadError) {
        setError(loadError.message || '加载注册申请失败');
      } else {
        setRequests(data || []);
      }

      setLoading(false);
    };

    void loadRequests();
  }, [userId, activeStatus]);

  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    setError(null);

    const { error: approveError, warning } = await approveRegisterRequest(requestId, userId);
    if (approveError) {
      setError(normalizeError(approveError, '批准失败'));
    } else {
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      if (warning) {
        setError(warning);
      }
    }

    setProcessingId(null);
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    setError(null);

    const reason = rejectReasons[requestId] || '';
    const { error: rejectError, warning } = await rejectRegisterRequest(requestId, userId, reason);
    if (rejectError) {
      setError(normalizeError(rejectError, '驳回失败'));
    } else {
      setRequests((prev) => prev.filter((req) => req.id !== requestId));
      if (warning) {
        setError(warning);
      }
    }

    setProcessingId(null);
  };

  if (!userId) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backBtn} onClick={() => navigate('/admin/dashboard')} title="返回管理员中心">
          <i className="fas fa-arrow-left"></i> 返回
        </button>
        <h1>注册申请审批</h1>
      </div>

      <div className={styles.contentBox}>
        <div className={tableStyles.filterBar}>
          <label>状态过滤：</label>
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              className={`${tableStyles.filterBtn} ${activeStatus === status ? tableStyles.active : ''}`}
              onClick={() => setActiveStatus(status)}
            >
              {status === 'all' ? '全部' : status === 'pending' ? '待审核' : status === 'approved' ? '已批准' : '已驳回'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.contentBox}>加载中...</div>
        ) : requests.length === 0 ? (
          <div className={styles.contentBox}>暂无注册申请</div>
        ) : (
          <div className={tableStyles.table}>
            <div className={tableStyles.tableHeader}>
              <div className={tableStyles.col1}>申请信息</div>
              <div className={tableStyles.col2}>申请理由</div>
              <div className={tableStyles.col3}>申请时间</div>
              <div className={tableStyles.col4}>操作</div>
            </div>
            {requests.map((request) => (
              <div key={request.id} className={tableStyles.tableRow}>
                <div className={tableStyles.col1}>
                  <p>{request.nickname || '未填写昵称'}</p>
                  <small>{request.email}</small>
                </div>
                <div className={tableStyles.col2}>
                  <span className={tableStyles.badge}>{request.reason || '-'}</span>
                </div>
                <div className={tableStyles.col3}>{new Date(request.created_at).toLocaleString('zh-CN')}</div>
                <div className={tableStyles.col4}>
                  {request.status === 'pending' ? (
                    <>
                      <textarea
                        className="form-control"
                        rows={2}
                        placeholder="驳回理由（可选）"
                        value={rejectReasons[request.id] || ''}
                        onChange={(event) =>
                          setRejectReasons((prev) => ({
                            ...prev,
                            [request.id]: event.target.value,
                          }))
                        }
                      />
                      <div style={{ display: 'flex', gap: '0.4rem', marginTop: '0.4rem' }}>
                        <button
                          className={tableStyles.approveBtn}
                          onClick={() => handleApprove(request.id)}
                          disabled={processingId === request.id}
                        >
                          批准
                        </button>
                        <button
                          className={tableStyles.rejectBtn}
                          onClick={() => handleReject(request.id)}
                          disabled={processingId === request.id}
                        >
                          驳回
                        </button>
                      </div>
                    </>
                  ) : (
                    <span
                      className={`${tableStyles.statusBadge} ${
                        request.status === 'approved' ? tableStyles.approved : tableStyles.rejected
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
        {error && <div className={styles.errorBanner}>{error}</div>}
      </div>
    </div>
  );
}

export default RegisterApprovals;
