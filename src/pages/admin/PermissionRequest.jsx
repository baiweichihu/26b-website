import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { getAdminPermissions, submitPermissionChangeRequest, getPermissionChangeRequests } from '../../services/adminService';
import styles from './AdminSimplePage.module.css';
import permStyles from './PermissionRequest.module.css';

const PERMISSION_LABELS = {
  can_manage_journal: '班日志查档审批',
  can_manage_user_permissions: '用户权限管理',
  can_manage_content: '内容管理',
  can_ban_users: '禁言用户',
  can_manage_album: '相册管理',
};

function PermissionRequest() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [currentPermissions, setCurrentPermissions] = useState({});
  const [requestedPermissions, setRequestedPermissions] = useState({});
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [historyRequests, setHistoryRequests] = useState([]);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // 权限字段列表
  const permissionFields = [
    'can_manage_journal',
    'can_manage_user_permissions',
    'can_manage_content',
    'can_ban_users',
    'can_manage_album',
  ];

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

        if (profile.role !== 'admin' && profile.role !== 'superuser') {
          navigate('/');
          return;
        }

        setUser(authUser);
        setUserRole(profile.role);

        // 获取当前权限（superuser 时跳过）
        if (profile.role !== 'superuser') {
          const { data: permissions, error: permError } = await getAdminPermissions(authUser.id);
          if (!permError && permissions) {
            setCurrentPermissions(permissions);
          }
        }

        const { data: requests, error: historyError } = await getPermissionChangeRequests();
        if (!historyError && requests) {
          setHistoryRequests((requests || []).filter(req => req.requester_id === authUser.id));
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

  const handlePermissionChange = (permField) => {
    setRequestedPermissions(prev => ({
      ...prev,
      [permField]: !prev[permField],
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // 检查是否选择了至少一个权限
    const hasSelectedPermission = Object.values(requestedPermissions).some(v => v === true);
    if (!hasSelectedPermission) {
      setErrorMessage('请至少选择一个权限');
      return;
    }
    if (!reason.trim()) {
      setErrorMessage('请填写申请理由');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { error } = await submitPermissionChangeRequest(
        user.id,
        requestedPermissions,
        reason.trim()
      );
      if (error) {
        setErrorMessage(`提交失败: ${error.message || error}`);
      } else {
        setSuccessMessage('权限申请已提交，等待superuser审批！');
        setReason('');
        setRequestedPermissions({});
        const { data: requests } = await getPermissionChangeRequests();
        setHistoryRequests((requests || []).filter(req => req.requester_id === user.id));
      }
    } catch (err) {
      setErrorMessage(`提交失败: ${err.message}`);
    } finally {
      setSubmitting(false);
    }
  };

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
          <h1>自身权限管理</h1>
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
        <h1>自身权限管理</h1>
      </div>

      <div className={permStyles.contentWrapper}>
        {/* 当前权限显示 */}
        <div className={styles.contentBox}>
          <h2>当前权限</h2>
          {userRole === 'superuser' && (
            <div className={permStyles.superuserNote}>
              <i className="fas fa-crown"></i> 作为超级管理员，您拥有所有权限
            </div>
          )}
          <div className={permStyles.permissionGrid}>
            {permissionFields.map(field => {
              const isSuperuser = userRole === 'superuser';
              const hasPermission = isSuperuser || currentPermissions[field] || false;
              return (
                <div key={field} className={permStyles.permissionItem}>
                  <label>
                    <input type="checkbox" disabled checked={hasPermission} />
                    <span>{PERMISSION_LABELS[field]}</span>
                  </label>
                </div>
              );
            })}
          </div>
        </div>

        {/* 权限申请表单 */}
        {userRole !== 'superuser' && (() => {
          const allOwned = permissionFields.every(f => currentPermissions[f] === true);
          if (allOwned) {
            return (
              <div className={styles.contentBox}>
                <h2>申请新的权限</h2>
                <div className={permStyles.superuserNote}>
                  您已拥有所有管理员权限
                </div>
              </div>
            );
          }
          return (
          <div className={styles.contentBox}>
            <h2>申请新的权限</h2>
            <form onSubmit={handleSubmit} className={permStyles.form}>
            <div className={permStyles.formSection}>
              <label>选择要申请的权限：</label>
              <div className={permStyles.permissionGrid}>
                {permissionFields.map(field => {
                  const alreadyHas = currentPermissions[field] === true;
                  return (
                  <div key={field} className={permStyles.permissionItem}>
                    <label>
                      <input
                        type="checkbox"
                        checked={requestedPermissions[field] || false}
                        onChange={() => handlePermissionChange(field)}
                        disabled={alreadyHas}
                      />
                      <span>{PERMISSION_LABELS[field]}</span>
                    </label>
                  </div>
                )})}
              </div>
            </div>

            <div className={permStyles.formSection}>
              <label htmlFor="reason">申请理由 *</label>
              <textarea
                id="reason"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows="5"
                className={permStyles.reasonInput}
                required
              />
            </div>

            {errorMessage && <div className={permStyles.errorMessage}>{errorMessage}</div>}
            {successMessage && <div className={permStyles.successMessage}>{successMessage}</div>}

            <button
              type="submit"
              disabled={submitting}
              className={permStyles.submitBtn}
            >
              {submitting ? '提交中...' : '提交申请'}
            </button>
          </form>
          </div>
          );
        })()}

        {/* 申请历史 */}
        {user?.role !== 'superuser' && historyRequests.length > 0 && (
          <div className={styles.contentBox}>
            <h2>申请历史</h2>
            <div className={permStyles.historyList}>
              {historyRequests.map(req => (
                <div key={req.id} className={permStyles.historyItem}>
                  <div className={permStyles.historyHeader}>
                    <span className={`${permStyles.status} ${permStyles[req.status]}`}>
                      {req.status === 'pending' && '待审批'}
                      {req.status === 'approved' && '已批准'}
                      {req.status === 'rejected' && '已驳回'}
                    </span>
                    <span className={permStyles.date}>
                      {new Date(req.created_at).toLocaleDateString('zh-CN')}
                    </span>
                  </div>
                  <div className={permStyles.historyContent}>
                    <p>
                      <strong>申请的权限:</strong>{' '}
                      {Object.entries(req.requested_permissions || {})
                        .filter(([_, v]) => v)
                        .map(([k]) => PERMISSION_LABELS[k])
                        .join(', ') || '-'}
                    </p>
                    <p>
                      <strong>申请理由:</strong> {req.reason || '-'}
                    </p>
                    {req.handled_at && (
                      <p>
                        <strong>处理时间:</strong> {new Date(req.handled_at).toLocaleString('zh-CN')}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default PermissionRequest;
