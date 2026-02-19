import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getAdminPermissions,
  getUsersByIdentity,
  banUser,
  unbanUser,
} from '../../services/adminService';
import styles from './AdminSimplePage.module.css';
import tableStyles from './UserPermissions.module.css';

function BanUsers() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [identityFilter, setIdentityFilter] = useState('all'); // all, classmate, alumni, guest
  const [users, setUsers] = useState([]);
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
        // 管理员需具备禁言管理权限
        if (profile.role === 'admin') {
          const { data: perms } = await getAdminPermissions(user.id);
          if (!perms?.can_ban_users) {
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
    const loadUsers = async () => {
      if (!userId) return;
      setLoading(true);
      setError(null);
      const { data, error } = await getUsersByIdentity(
        identityFilter === 'all' ? null : identityFilter
      );
      if (error) {
        setError(error.message || '加载用户失败');
      } else {
        const onlyRegular = (data || []).filter((u) => u.role === 'user' && u.id !== userId);
        setUsers(onlyRegular);
      }
      setLoading(false);
    };
    loadUsers();
  }, [userId, identityFilter]);

  const handleBan = async (targetUserId) => {
    setProcessingId(targetUserId);
    setError(null);
    const { error } = await banUser(targetUserId);
    if (error) {
      setError(error.message || '禁言失败');
    } else {
      setUsers(prev => prev.map(u => (u.id === targetUserId ? { ...u, is_banned: true } : u)));
    }
    setProcessingId(null);
  };

  const handleUnban = async (targetUserId) => {
    setProcessingId(targetUserId);
    setError(null);
    const { error } = await unbanUser(targetUserId);
    if (error) {
      setError(error.message || '解禁失败');
    } else {
      setUsers(prev => prev.map(u => (u.id === targetUserId ? { ...u, is_banned: false } : u)));
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
        <h1>禁言用户</h1>
      </div>

      <div className={styles.contentBox}>
        <div className={tableStyles.filterBar}>
          <label>身份过滤：</label>
          {['all', 'classmate', 'alumni', 'guest'].map((identity) => (
            <button
              key={identity}
              className={`${tableStyles.filterBtn} ${
                identityFilter === identity ? tableStyles.active : ''
              }`}
              onClick={() => setIdentityFilter(identity)}
            >
              {identity === 'all'
                ? '全部'
                : identity === 'classmate'
                ? '本班同学'
                : identity === 'alumni'
                ? '校友'
                : '游客'}
            </button>
          ))}
        </div>

        {loading ? (
          <div className={styles.contentBox}>加载中...</div>
        ) : users.length === 0 ? (
          <div className={styles.contentBox}>暂无用户</div>
        ) : (
          <div className={tableStyles.table}>
            <div className={tableStyles.tableHeader}>
              <div className={tableStyles.col1}>用户信息</div>
              <div className={tableStyles.col2}>身份</div>
              <div className={tableStyles.col3}>禁言状态</div>
              <div className={tableStyles.col4}>操作</div>
            </div>
            {users.map((user) => (
              <div key={user.id} className={tableStyles.tableRow}>
                <div className={tableStyles.col1}>
                  <div className={tableStyles.userInfo}>
                    {user.avatar_url && <img src={user.avatar_url} alt="avatar" />}
                    <div>
                      <p>{user.nickname || '未知用户'}</p>
                      <small>{user.email}</small>
                    </div>
                  </div>
                </div>
                <div className={tableStyles.col2}>
                  <span className={tableStyles.badge}>
                    {user.identity_type === 'classmate'
                      ? '本班同学'
                      : user.identity_type === 'alumni'
                      ? '校友'
                      : '游客'}
                  </span>
                </div>
                <div className={tableStyles.col3}>
                  {user.is_banned ? (
                    <span className={`${tableStyles.statusBadge} ${tableStyles.rejected}`}>禁言中</span>
                  ) : (
                    <span className={`${tableStyles.statusBadge} ${tableStyles.approved}`}>活跃</span>
                  )}
                </div>
                <div className={tableStyles.col4}>
                  {user.is_banned ? (
                    <button
                      className={tableStyles.unbanBtn}
                      onClick={() => handleUnban(user.id)}
                      disabled={processingId === user.id}
                    >
                      {processingId === user.id ? '处理...' : '解禁'}
                    </button>
                  ) : (
                    <button
                      className={tableStyles.banBtn}
                      onClick={() => handleBan(user.id)}
                      disabled={processingId === user.id}
                    >
                      {processingId === user.id ? '处理...' : '禁言'}
                    </button>
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

export default BanUsers;
