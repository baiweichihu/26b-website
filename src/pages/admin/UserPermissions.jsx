import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getUpgradeRequests,
  approveUpgradeRequest,
  rejectUpgradeRequest,
  getUsersByIdentity,
  banUser,
  unbanUser,
} from '../../services/adminService';
import styles from './UserPermissions.module.css';

/**
 * 用户权限管理页面
 * 管理员可以审核升级申请、禁言/解禁用户
 */
function UserPermissions() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [activeTab, setActiveTab] = useState('upgrade-requests'); // upgrade-requests, ban-users

  // 升级请求标签页
  const [upgradeRequests, setUpgradeRequests] = useState([]);
  const [requestFilter, setRequestFilter] = useState('pending'); // pending, approved, rejected
  const [loadingRequests, setLoadingRequests] = useState(false);
  const [processingRequestId, setProcessingRequestId] = useState(null);

  // 禁言管理标签页
  const [users, setUsers] = useState([]);
  const [userIdentityFilter, setUserIdentityFilter] = useState('all'); // all, classmate, alumni, guest
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [banningUserId, setBanningUserId] = useState(null);

  const [error, setError] = useState(null);

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

  // 加载升级请求
  useEffect(() => {
    if (activeTab !== 'upgrade-requests') return;

    const loadRequests = async () => {
      setLoadingRequests(true);
      setError(null);

      const { data, error } = await getUpgradeRequests(
        requestFilter === 'all' ? null : requestFilter
      );

      if (error) {
        setError(error.message || '加载升级请求失败');
      } else {
        setUpgradeRequests(data || []);
      }

      setLoadingRequests(false);
    };

    loadRequests();
  }, [activeTab, requestFilter]);

  // 加载用户列表
  useEffect(() => {
    if (activeTab !== 'ban-users') return;

    const loadUsers = async () => {
      setLoadingUsers(true);
      setError(null);

      const { data, error } = await getUsersByIdentity(
        userIdentityFilter === 'all' ? null : userIdentityFilter
      );

      if (error) {
        setError(error.message || '加载用户失败');
      } else {
        setUsers(data || []);
      }

      setLoadingUsers(false);
    };

    loadUsers();
  }, [activeTab, userIdentityFilter]);

  // 批准升级请求
  const handleApproveUpgrade = async (requestId) => {
    setProcessingRequestId(requestId);
    setError(null);

    const { data, error } = await approveUpgradeRequest(requestId, userId);

    if (error) {
      setError(error.message || '批准升级失败');
    } else {
      // 从列表中移除
      setUpgradeRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );
      alert('升级申请已批准');
    }

    setProcessingRequestId(null);
  };

  // 驳回升级请求
  const handleRejectUpgrade = async (requestId) => {
    setProcessingRequestId(requestId);
    setError(null);

    const { data, error } = await rejectUpgradeRequest(requestId, userId);

    if (error) {
      setError(error.message || '驳回升级失败');
    } else {
      setUpgradeRequests((prev) =>
        prev.filter((req) => req.id !== requestId)
      );
      alert('升级申请已驳回');
    }

    setProcessingRequestId(null);
  };

  // 禁言用户
  const handleBanUser = async (bannedUserId) => {
    // 防止禁言自己
    if (bannedUserId === userId) {
      alert('不能禁言自己');
      return;
    }

    if (!window.confirm('确认禁言此用户吗？')) return;

    setBanningUserId(bannedUserId);
    setError(null);

    const { error } = await banUser(bannedUserId);

    if (error) {
      setError(error.message || '禁言用户失败');
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === bannedUserId ? { ...u, is_banned: true } : u
        )
      );
      alert('用户已禁言');
    }

    setBanningUserId(null);
  };

  // 解禁用户
  const handleUnbanUser = async (bannedUserId) => {
    if (!window.confirm('确认解禁此用户吗？')) return;

    setBanningUserId(bannedUserId);
    setError(null);

    const { error } = await unbanUser(bannedUserId);

    if (error) {
      setError(error.message || '解禁用户失败');
    } else {
      setUsers((prev) =>
        prev.map((u) =>
          u.id === bannedUserId ? { ...u, is_banned: false } : u
        )
      );
      alert('用户已解禁');
    }

    setBanningUserId(null);
  };

  const getIdentityLabel = (type) => {
    const labels = {
      classmate: '本班同学',
      alumni: '校友',
      guest: '游客',
    };
    return labels[type] || type;
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
        <h1>用户权限管理</h1>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      <div className={styles.tabBar}>
        <button
          className={`${styles.tabBtn} ${
            activeTab === 'upgrade-requests' ? styles.active : ''
          }`}
          onClick={() => setActiveTab('upgrade-requests')}
        >
          升级申请
        </button>
        <button
          className={`${styles.tabBtn} ${
            activeTab === 'ban-users' ? styles.active : ''
          }`}
          onClick={() => setActiveTab('ban-users')}
        >
          禁言管理
        </button>
      </div>

      {/* 升级申请标签页 */}
      {activeTab === 'upgrade-requests' && (
        <div className={styles.tabContent}>
          <div className={styles.filterBar}>
            <label>状态过滤：</label>
            {['all', 'pending', 'approved', 'rejected'].map((status) => (
              <button
                key={status}
                className={`${styles.filterBtn} ${
                  requestFilter === status ? styles.active : ''
                }`}
                onClick={() => setRequestFilter(status)}
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

          {loadingRequests ? (
            <div className={styles.loading}>加载中...</div>
          ) : upgradeRequests.length === 0 ? (
            <div className={styles.empty}>暂无升级申请</div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div className={styles.col1}>申请者信息</div>
                <div className={styles.col2}>证据</div>
                <div className={styles.col3}>申请时间</div>
                <div className={styles.col4}>操作</div>
              </div>
              {upgradeRequests.map((request) => (
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
                    <p className={styles.evidence}>{request.evidence}</p>
                  </div>
                  <div className={styles.col3}>
                    {new Date(request.created_at).toLocaleString('zh-CN')}
                  </div>
                  <div className={styles.col4}>
                    {request.status === 'pending' ? (
                      <>
                        <button
                          className={styles.approveBtn}
                          onClick={() => handleApproveUpgrade(request.id)}
                          disabled={processingRequestId === request.id}
                        >
                          批准
                        </button>
                        <button
                          className={styles.rejectBtn}
                          onClick={() => handleRejectUpgrade(request.id)}
                          disabled={processingRequestId === request.id}
                        >
                          驳回
                        </button>
                      </>
                    ) : (
                      <span
                        className={`${styles.statusBadge} ${
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
      )}

      {/* 禁言管理标签页 */}
      {activeTab === 'ban-users' && (
        <div className={styles.tabContent}>
          <div className={styles.filterBar}>
            <label>身份过滤：</label>
            {['all', 'classmate', 'alumni', 'guest'].map((identity) => (
              <button
                key={identity}
                className={`${styles.filterBtn} ${
                  userIdentityFilter === identity ? styles.active : ''
                }`}
                onClick={() => setUserIdentityFilter(identity)}
              >
                {identity === 'all' ? '全部' : getIdentityLabel(identity)}
              </button>
            ))}
          </div>

          {loadingUsers ? (
            <div className={styles.loading}>加载中...</div>
          ) : users.length === 0 ? (
            <div className={styles.empty}>暂无用户</div>
          ) : (
            <div className={styles.table}>
              <div className={styles.tableHeader}>
                <div className={styles.col1}>用户信息</div>
                <div className={styles.col2}>身份</div>
                <div className={styles.col3}>禁言状态</div>
                <div className={styles.col4}>操作</div>
              </div>
              {users.map((user) => (
                <div key={user.id} className={styles.tableRow}>
                  <div className={styles.col1}>
                    <div className={styles.userInfo}>
                      {user.avatar_url && (
                        <img src={user.avatar_url} alt="avatar" />
                      )}
                      <div>
                        <p>{user.nickname || '未知用户'}</p>
                        <small>{user.email}</small>
                      </div>
                    </div>
                  </div>
                  <div className={styles.col2}>
                    <span className={styles.badge}>
                      {getIdentityLabel(user.identity_type)}
                    </span>
                  </div>
                  <div className={styles.col3}>
                    <span
                      className={`${styles.status} ${
                        user.is_banned ? styles.banned : styles.normal
                      }`}
                    >
                      {user.is_banned ? '已禁言' : '正常'}
                    </span>
                  </div>
                  <div className={styles.col4}>
                    {user.is_banned ? (
                      <button
                        className={styles.unbanBtn}
                        onClick={() => handleUnbanUser(user.id)}
                        disabled={banningUserId === user.id || user.id === userId}
                      >
                        解禁
                      </button>
                    ) : (
                      <button
                        className={styles.banBtn}
                        onClick={() => handleBanUser(user.id)}
                        disabled={banningUserId === user.id || user.id === userId}
                        title={user.id === userId ? '不能禁言自己' : ''}
                      >
                        禁言
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default UserPermissions;
