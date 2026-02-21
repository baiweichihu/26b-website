import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getPermissionChangeRequests,
  approvePermissionChangeRequest,
  rejectPermissionChangeRequest,
} from '../../services/adminService';
import styles from './AdminSimplePage.module.css';
import permApprovalStyles from './PermissionApprovals.module.css';

const PERMISSION_LABELS = {
  can_manage_journal: '班日志查档审批',
  can_manage_user_permissions: '用户权限管理',
  can_manage_content: '内容管理',
  can_ban_users: '禁言用户',
  can_manage_album: '相册管理',
};

function PermissionApprovals() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState(null);
  const [selectedTab, setSelectedTab] = useState('pending');
  const [adminNotes, setAdminNotes] = useState({});

  useEffect(() => {
    const initPage = async () => {
      try {
        const {
          data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
          navigate('/login');
          return;
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', authUser.id)
          .single();

        if (profileError || !profile) {
          navigate('/');
          return;
        }

        if (profile.role !== 'superuser') {
          navigate('/');
          return;
        }

        setUser(authUser);

        // 获取所有权限申请
        const { data: requests, error } = await getPermissionChangeRequests();
        if (!error && requests) {
          setAllRequests(requests);
        }
      } catch (err) {
        console.error('页面初始化失败:', err);
        navigate('/');
      } finally {
        setLoading(false);
      }
    };

    initPage();
  }, [navigate]);

  const handleApprove = async (requestId, requesterId) => {
    setProcessingId(requestId);
    try {
      const { error } = await approvePermissionChangeRequest(requestId, user.id, adminNotes[requestId] || '');
      if (error) {
        alert(`批准失败: ${error.message || error}`);
      } else {
        // 更新本地数据
        setAllRequests(prev =>
          prev.map(req =>
            req.id === requestId ? { ...req, status: 'approved', admin_note: adminNotes[requestId] } : req
          )
        );
      }
    } catch (err) {
      alert(`批准失败: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleReject = async (requestId) => {
    setProcessingId(requestId);
    try {
      const { error } = await rejectPermissionChangeRequest(requestId, user.id, adminNotes[requestId] || '');
      if (error) {
        alert(`驳回失败: ${error.message || error}`);
      } else {
        // 更新本地数据
        setAllRequests(prev =>
          prev.map(req =>
            req.id === requestId ? { ...req, status: 'rejected', admin_note: adminNotes[requestId] } : req
          )
        );
      }
    } catch (err) {
      alert(`驳回失败: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = allRequests.filter(req => req.status === selectedTab);

  if (loading) {
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
          <h1>管理员权限审批</h1>
        </div>
        <div className={styles.contentBox}>加载中...</div>
      </div>
    );
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
        <h1>管理员权限审批</h1>
      </div>

      <div className={styles.contentBox}>
        <div className={permApprovalStyles.filterBar}>
          <label>状态过滤：</label>
          <button
            className={`${permApprovalStyles.filterBtn} ${selectedTab === 'pending' ? permApprovalStyles.active : ''}`}
            onClick={() => setSelectedTab('pending')}
          >
            待审批 ({allRequests.filter(r => r.status === 'pending').length})
          </button>
          <button
            className={`${permApprovalStyles.filterBtn} ${selectedTab === 'approved' ? permApprovalStyles.active : ''}`}
            onClick={() => setSelectedTab('approved')}
          >
            已批准 ({allRequests.filter(r => r.status === 'approved').length})
          </button>
          <button
            className={`${permApprovalStyles.filterBtn} ${selectedTab === 'rejected' ? permApprovalStyles.active : ''}`}
            onClick={() => setSelectedTab('rejected')}
          >
            已驳回 ({allRequests.filter(r => r.status === 'rejected').length})
          </button>
        </div>

        <div className={permApprovalStyles.requestsList}>
          {filteredRequests.length === 0 ? (
            <div className={permApprovalStyles.emptyState}>
              {selectedTab === 'pending' ? '暂无待审批的申请' : '暂无历史记录'}
            </div>
          ) : (
            filteredRequests.map(request => (
              <div key={request.id} className={`${permApprovalStyles.requestCard} ${permApprovalStyles[request.status]}`}>
                <div className={permApprovalStyles.requestHeader}>
                  <div className={permApprovalStyles.requesterInfo}>
                    <h3>{request.requester?.nickname || '未知'}</h3>
                    <p className={permApprovalStyles.email}>{request.requester?.email}</p>
                  </div>
                  <span className={`${permApprovalStyles.statusBadge} ${permApprovalStyles[request.status]}`}>
                    {request.status === 'pending' && '待审批'}
                    {request.status === 'approved' && '已批准'}
                    {request.status === 'rejected' && '已驳回'}
                  </span>
                </div>

                <div className={permApprovalStyles.requestContent}>
                  <div className={permApprovalStyles.section}>
                    <h4>申请的权限：</h4>
                    <div className={permApprovalStyles.permissionsList}>
                      {Object.entries(request.requested_permissions)
                        .filter(([_, value]) => value === true)
                        .map(([key]) => (
                          <span key={key} className={permApprovalStyles.permissionTag}>
                            {PERMISSION_LABELS[key]}
                          </span>
                        ))}
                    </div>
                  </div>

                  <div className={permApprovalStyles.section}>
                    <h4>申请理由：</h4>
                    <p className={permApprovalStyles.reason}>{request.reason}</p>
                  </div>

                  {request.admin_note && (
                    <div className={permApprovalStyles.section}>
                      <h4>审批意见：</h4>
                      <p className={permApprovalStyles.adminNote}>{request.admin_note}</p>
                    </div>
                  )}

                  {request.status === 'pending' && (
                    <div className={permApprovalStyles.section}>
                      <label htmlFor={`note-${request.id}`}>审批意见（可选）：</label>
                      <textarea
                        id={`note-${request.id}`}
                        value={adminNotes[request.id] || ''}
                        onChange={(e) =>
                          setAdminNotes(prev => ({
                            ...prev,
                            [request.id]: e.target.value,
                          }))
                        }
                        placeholder="可在此添加审批意见..."
                        className={permApprovalStyles.noteInput}
                        rows="3"
                      />
                    </div>
                  )}
                </div>

                {request.status === 'pending' && (
                  <div className={permApprovalStyles.actionButtons}>
                    <button
                      className={permApprovalStyles.approveBtn}
                      onClick={() => handleApprove(request.id, request.requester_id)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? '处理中...' : '批准'}
                    </button>
                    <button
                      className={permApprovalStyles.rejectBtn}
                      onClick={() => handleReject(request.id)}
                      disabled={processingId === request.id}
                    >
                      {processingId === request.id ? '处理中...' : '驳回'}
                    </button>
                  </div>
                )}

                <div className={permApprovalStyles.metadata}>
                  <span>{new Date(request.created_at).toLocaleDateString('zh-CN')}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default PermissionApprovals;
