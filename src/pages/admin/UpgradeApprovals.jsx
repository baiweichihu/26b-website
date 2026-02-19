import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getAdminPermissions,
  getUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
} from '../../services/adminService';
import styles from './AdminSimplePage.module.css';
import tableStyles from './UserPermissions.module.css';

function UpgradeApprovals() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeStatus, setActiveStatus] = useState('pending'); // pending, approved, rejected, all
  const [requests, setRequests] = useState([]);
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
        // 管理员需具备用户权限管理
        if (profile.role === 'admin') {
          const { data: perms } = await getAdminPermissions(user.id);
          if (!perms?.can_manage_user_permissions) {
            navigate('/admin/dashboard');
            return;
          }
        }
        setUserId(user.id);
        setUserRole(profile.role);
      } catch (err) {
        console.error('检查权限失败:', err);
        navigate('/');
      }
    };
    checkAuth();
  }, [navigate]);

  useEffect(() => {
    const loadRequests = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      const status = activeStatus === 'all' ? null : activeStatus;
      const { data, error } = await getUpgradeRequests(status);
      if (error) {
        setError(error.message || '加载升级申请失败');
      } else {
        setRequests(data || []);
      }
      setLoading(false);
    };
    loadRequests();
  }, [userId, activeStatus]);

  const handleApprove = async (requestId) => {
    setProcessingId(requestId);
    setError(null);
    const { error } = await approveUpgradeRequest(requestId, userId);
    if (error) {
      setError(error.message || '批准升级失败');
    } else {
      setRequests(prev => prev.filter(req => req.id !== requestId));
    }
    setProcessingId(null);
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    setError(null);
    const { error } = await rejectUpgradeRequest(requestId, userId);
    if (error) {
      setError(error.message || '驳回升级失败');
    } else {
      setRequests(prev => prev.filter(req => req.id !== requestId));
    }
    setProcessingId(null);
  };

  if (!userId) {
    return null;
  }

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
        <h1>升级校友申请</h1>
      </div>

      <div className={styles.contentBox}>
        <div className={tableStyles.filterBar}>
          <label>状态过滤：</label>
          {['all', 'pending', 'approved', 'rejected'].map((status) => (
            <button
              key={status}
              className={`${tableStyles.filterBtn} ${
                activeStatus === status ? tableStyles.active : ''
              }`}
              onClick={() => setActiveStatus(status)}
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
          <div className={styles.contentBox}>加载中...</div>
        ) : requests.length === 0 ? (
          <div className={styles.contentBox}>暂无升级申请</div>
        ) : (
          <div className={tableStyles.table}>
            <div className={tableStyles.tableHeader}>
              <div className={tableStyles.col1}>申请者信息</div>
              <div className={tableStyles.col2}>证据</div>
              <div className={tableStyles.col3}>申请时间</div>
              <div className={tableStyles.col4}>操作</div>
            </div>
            {requests.map((request) => (
              <div key={request.id} className={tableStyles.tableRow}>
                <div className={tableStyles.col1}>
                  <div className={tableStyles.userInfo}>
                    {request.requester?.avatar_url && (
                      <img src={request.requester.avatar_url} alt="avatar" />
                    )}
                    <div>
                      <p>{request.requester?.nickname || '未知用户'}</p>
                      <small>{request.requester?.email}</small>
                    </div>
                  </div>
                </div>
                <div className={tableStyles.col2}>
                  {(() => {
                    let msg = '';
                    try {
                      const ev = JSON.parse(request.evidence || '{}');
                      msg = ev.message || '';
                    } catch (e) {}
                    return <span className={tableStyles.badge}>{msg || '-'}</span>;
                  })()}
                </div>
                <div className={tableStyles.col3}>
                  {new Date(request.created_at).toLocaleString('zh-CN')}
                </div>
                <div className={tableStyles.col4}>
                  {request.status === 'pending' ? (
                    <>
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
                    </>
                  ) : (
                    <span
                      className={`${tableStyles.statusBadge} ${
                        request.status === 'approved'
                          ? tableStyles.approved
                          : tableStyles.rejected
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

export default UpgradeApprovals;
