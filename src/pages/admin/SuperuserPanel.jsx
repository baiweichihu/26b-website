import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getUsersByIdentity,
  getAllAdmins,
  removeAdmin,
  updateAdminPermissions,
  banUser,
  unbanUser,
  appointAdmin,
} from '../../services/adminService';
import styles from './AdminSimplePage.module.css';
import superuserStyles from './SuperuserPanel.module.css';

const PERMISSION_LABELS = {
  can_manage_journal: '班日志查档审批',
  can_manage_user_permissions: '用户权限管理',
  can_manage_content: '内容管理',
  can_ban_users: '禁言用户',
  can_manage_album: '相册管理',
};

const permissionFields = [
  'can_manage_journal',
  'can_manage_user_permissions',
  'can_manage_content',
  'can_ban_users',
  'can_manage_album',
];

function SuperuserPanel() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [allUsers, setAllUsers] = useState([]); // All users including admins
  const [roleFilter, setRoleFilter] = useState('all'); // all, user, admin, superuser
  const [identityFilter, setIdentityFilter] = useState('all'); // all, classmate, alumni, guest
  const [statusFilter, setStatusFilter] = useState('all'); // all, active, banned
  const [processingId, setProcessingId] = useState(null);
  const [editingUserId, setEditingUserId] = useState(null);
  const [permissionsEdit, setPermissionsEdit] = useState({});
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

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

        if (profile.role !== 'superuser') {
          navigate('/');
          return;
        }

        setUserId(user.id);
      } catch (error) {
        console.error('检查权限失败:', error);
        navigate('/');
      }
    };

    checkAuth();
  }, [navigate]);

  useEffect(() => {
    if (!userId) return;

    const loadData = async () => {
      setLoading(true);
      setErrorMessage('');

      try {
        // Load ALL users first
        let query = supabase
          .from('profiles')
          .select('*');

        // Apply role filter
        if (roleFilter !== 'all') {
          query = query.eq('role', roleFilter);
        }

        // Apply identity filter
        if (identityFilter !== 'all') {
          query = query.eq('identity_type', identityFilter);
        }

        // Apply status filter
        if (statusFilter === 'active') {
          query = query.eq('is_banned', false);
        } else if (statusFilter === 'banned') {
          query = query.eq('is_banned', true);
        }

        const { data: users, error } = await query.order('created_at', {
          ascending: false,
        });

        if (error) {
          setErrorMessage('加载用户失败');
          console.error(error);
        } else {
          // For each user, fetch their admin permissions if they are admin/superuser
          const usersWithPermissions = await Promise.all(
            (users || []).map(async (user) => {
              if (user.role === 'admin') {
                // Fetch admin permissions from database
                const { data: perms, error: permError } = await supabase
                  .from('admin_permissions')
                  .select('can_manage_journal, can_manage_user_permissions, can_manage_content, can_ban_users, can_manage_album')
                  .eq('admin_id', user.id)
                  .maybeSingle();

                if (!permError && perms) {
                  return { ...user, ...perms };
                }
                // If no permissions found, return user with all false
                return {
                  ...user,
                  can_manage_journal: false,
                  can_manage_user_permissions: false,
                  can_manage_content: false,
                  can_ban_users: false,
                  can_manage_album: false,
                };
              } else if (user.role === 'superuser') {
                // Superuser has all permissions by default
                return {
                  ...user,
                  can_manage_journal: true,
                  can_manage_user_permissions: true,
                  can_manage_content: true,
                  can_ban_users: true,
                  can_manage_album: true,
                };
              }
              return user;
            })
          );
          setAllUsers(usersWithPermissions);
        }
      } catch (err) {
        setErrorMessage('加载数据失败');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, [userId, roleFilter, identityFilter, statusFilter]);

  const handleBanUser = async (userId) => {
    setProcessingId(userId);
    setErrorMessage('');

    try {
      const { error } = await banUser(userId);

      if (error) {
        setErrorMessage(`禁言失败: ${error.message || error}`);
      } else {
        setSuccessMessage('用户已禁言');
        setTimeout(() => setSuccessMessage(''), 3000);
        // Update local state
        setAllUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, is_banned: true } : u))
        );
      }
    } catch (err) {
      setErrorMessage(`操作失败: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleUnbanUser = async (userId) => {
    setProcessingId(userId);
    setErrorMessage('');

    try {
      const { error } = await unbanUser(userId);

      if (error) {
        setErrorMessage(`解禁失败: ${error.message || error}`);
      } else {
        setSuccessMessage('用户已解禁');
        setTimeout(() => setSuccessMessage(''), 3000);
        // Update local state
        setAllUsers(prev =>
          prev.map(u => (u.id === userId ? { ...u, is_banned: false } : u))
        );
      }
    } catch (err) {
      setErrorMessage(`操作失败: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handlePermissionChange = (userId, permField) => {
    setPermissionsEdit(prev => ({
      ...prev,
      [userId]: {
        ...(prev[userId] || {}),
        [permField]: !(prev[userId]?.[permField] ?? allUsers.find(u => u.id === userId)?.[permField] ?? false),
      },
    }));
  };

  const handleSavePermissions = async (targetUserId) => {
    setProcessingId(targetUserId);
    setErrorMessage('');

    try {
      // Find the user's admin_id from allUsers
      const user = allUsers.find(u => u.id === targetUserId);
      if (!user) {
        setErrorMessage('用户不存在');
        setProcessingId(null);
        return;
      }

      const { error } = await updateAdminPermissions(
        targetUserId,
        permissionsEdit[targetUserId] || {},
        userId
      );

      if (error) {
        setErrorMessage(`保存失败: ${error.message || error}`);
      } else {
        setSuccessMessage('权限已更新');
        setEditingUserId(null);
        setPermissionsEdit({});
        setTimeout(() => setSuccessMessage(''), 3000);

        // Update local state
        setAllUsers(prev =>
          prev.map(u =>
            u.id === targetUserId
              ? { ...u, ...(permissionsEdit[targetUserId] || {}) }
              : u
          )
        );
      }
    } catch (err) {
      setErrorMessage(`操作失败: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleRemoveAdmin = async (targetUserId) => {
    if (!window.confirm('确定要撤销此管理员吗？')) return;

    setProcessingId(targetUserId);
    setErrorMessage('');

    try {
      const { error } = await removeAdmin(targetUserId, userId);

      if (error) {
        setErrorMessage(`撤销失败: ${error.message || error}`);
      } else {
        setSuccessMessage('管理员已撤销');
        setTimeout(() => setSuccessMessage(''), 3000);

        // Update local state - change role back to 'user'
        setAllUsers(prev =>
          prev.map(u =>
            u.id === targetUserId
              ? {
                  ...u,
                  role: 'user',
                  can_manage_journal: false,
                  can_manage_user_permissions: false,
                  can_manage_content: false,
                  can_ban_users: false,
                  can_manage_album: false,
                }
              : u
          )
        );
      }
    } catch (err) {
      setErrorMessage(`操作失败: ${err.message}`);
    } finally {
      setProcessingId(null);
    }
  };

  const handleAppointAdmin = async (targetUserId) => {
    if (!window.confirm('确定要将此用户任命为管理员吗？')) return;

    setProcessingId(targetUserId);
    setErrorMessage('');

    try {
      // Appoint with no permissions initially (all false)
      const initialPermissions = {
        can_manage_journal: false,
        can_manage_user_permissions: false,
        can_manage_content: false,
        can_ban_users: false,
        can_manage_album: false,
      };

      const { error } = await appointAdmin(targetUserId, initialPermissions, userId);

      if (error) {
        setErrorMessage(`任命失败: ${error.message || error}`);
      } else {
        setSuccessMessage('已任命为管理员');
        setTimeout(() => setSuccessMessage(''), 3000);

        // Update local state
        setAllUsers(prev =>
          prev.map(u =>
            u.id === targetUserId
              ? {
                  ...u,
                  role: 'admin',
                  can_manage_journal: false,
                  can_manage_user_permissions: false,
                  can_manage_content: false,
                  can_ban_users: false,
                  can_manage_album: false,
                }
              : u
          )
        );
      }
    } catch (err) {
      setErrorMessage(`操作失败: ${err.message}`);
    } finally {
      setProcessingId(null);
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
          <h1>所有用户管理</h1>
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
        <h1>所有用户管理</h1>
      </div>

      <div className={styles.contentBox}>
        {errorMessage && (
          <div className={superuserStyles.errorMessage}>{errorMessage}</div>
        )}
        {successMessage && (
          <div className={superuserStyles.successMessage}>{successMessage}</div>
        )}

        {/* 角色筛选 */}
        <div className={superuserStyles.filterBar}>
          <label>角色：</label>
          {['all', 'user', 'admin', 'superuser'].map(role => (
            <button
              key={role}
              className={`${superuserStyles.filterBtn} ${
                roleFilter === role ? superuserStyles.active : ''
              }`}
              onClick={() => setRoleFilter(role)}
            >
              {role === 'all'
                ? '全部'
                : role === 'user'
                ? '普通用户'
                : role === 'admin'
                ? '管理员'
                : '超级管理员'}
            </button>
          ))}
        </div>

        {/* 身份筛选 */}
        <div className={superuserStyles.filterBar}>
          <label>身份：</label>
          {['all', 'classmate', 'alumni', 'guest'].map(identity => (
            <button
              key={identity}
              className={`${superuserStyles.filterBtn} ${
                identityFilter === identity ? superuserStyles.active : ''
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

        {/* 状态筛选 */}
        <div className={superuserStyles.filterBar}>
          <label>状态：</label>
          {['all', 'active', 'banned'].map(status => (
            <button
              key={status}
              className={`${superuserStyles.filterBtn} ${
                statusFilter === status ? superuserStyles.active : ''
              }`}
              onClick={() => setStatusFilter(status)}
            >
              {status === 'all'
                ? '全部'
                : status === 'active'
                ? '活跃'
                : '禁言中'}
            </button>
          ))}
        </div>

        {allUsers.length === 0 ? (
          <div className={superuserStyles.emptyState}>暂无用户</div>
        ) : (
          <div className={superuserStyles.usersTable}>
            <div className={superuserStyles.tableHeader}>
              <div>昵称</div>
              <div>邮箱</div>
              <div>角色</div>
              <div>身份</div>
              <div>状态</div>
              <div>操作</div>
            </div>
            {allUsers.map(u => (
              <div key={u.id} className={superuserStyles.tableRow}>
                <div className={superuserStyles.userInfo}>
                  <p className={superuserStyles.nickname}>{u.nickname}</p>
                </div>
                <div>
                  <p className={superuserStyles.email}>{u.email}</p>
                </div>
                <div>
                  <span
                    className={`${superuserStyles.identity} ${
                      u.role === 'superuser'
                        ? superuserStyles.superuser
                        : u.role === 'admin'
                        ? superuserStyles.admin
                        : ''
                    }`}
                  >
                    {u.role === 'superuser'
                      ? '超级管理员'
                      : u.role === 'admin'
                      ? '管理员'
                      : '普通用户'}
                  </span>
                </div>
                <div>
                  <span
                    className={`${superuserStyles.identityBadge} ${
                      u.identity_type === 'classmate'
                        ? superuserStyles.classmate
                        : u.identity_type === 'alumni'
                        ? superuserStyles.alumni
                        : superuserStyles.guest
                    }`}
                  >
                    {u.identity_type === 'classmate'
                      ? '本班同学'
                      : u.identity_type === 'alumni'
                      ? '校友'
                      : '游客'}
                  </span>
                </div>
                <div>
                  {u.is_banned ? (
                    <span className={`${superuserStyles.statusBadge} ${superuserStyles.banned}`}>
                      禁言中
                    </span>
                  ) : (
                    <span className={`${superuserStyles.statusBadge} ${superuserStyles.active}`}>
                      活跃
                    </span>
                  )}
                </div>
                <div className={superuserStyles.actionButtons}>
                  {/* Ban/Unban buttons - only show for non-superusers */}
                  {u.role !== 'superuser' && (
                    <>
                      {u.is_banned ? (
                        <button
                          className={superuserStyles.unbanBtn}
                          onClick={() => handleUnbanUser(u.id)}
                          disabled={processingId === u.id}
                        >
                          {processingId === u.id ? '处理...' : '解禁'}
                        </button>
                      ) : (
                        <button
                          className={superuserStyles.banBtn}
                          onClick={() => handleBanUser(u.id)}
                          disabled={processingId === u.id}
                        >
                          {processingId === u.id ? '处理...' : '禁言'}
                        </button>
                      )}
                    </>
                  )}

                  {/* Admin management buttons */}
                  {u.role === 'user' && (
                    <button
                      className={superuserStyles.editBtn}
                      onClick={() => handleAppointAdmin(u.id)}
                      disabled={processingId === u.id}
                    >
                      {processingId === u.id ? '处理...' : '任命管理员'}
                    </button>
                  )}

                  {u.role === 'admin' && (
                    <>
                      {editingUserId === u.id ? (
                        <>
                          <button
                            className={superuserStyles.saveBtn}
                            onClick={() => handleSavePermissions(u.id)}
                            disabled={processingId === u.id}
                          >
                            {processingId === u.id ? '保存...' : '保存'}
                          </button>
                          <button
                            className={superuserStyles.cancelBtn}
                            onClick={() => {
                              setEditingUserId(null);
                              setPermissionsEdit({});
                            }}
                            disabled={processingId === u.id}
                          >
                            取消
                          </button>
                        </>
                      ) : (
                        <>
                          <button
                            className={superuserStyles.editBtn}
                            onClick={() => setEditingUserId(u.id)}
                          >
                            编辑权限
                          </button>
                          <button
                            className={superuserStyles.removeBtn}
                            onClick={() => handleRemoveAdmin(u.id)}
                            disabled={processingId === u.id}
                          >
                            {processingId === u.id ? '处理...' : '撤销管理员'}
                          </button>
                        </>
                      )}
                    </>
                  )}
                </div>

                {/* Permission editor for admins */}
                {editingUserId === u.id && u.role === 'admin' && (
                  <div className={superuserStyles.permissionEditor}>
                    <h4>编辑权限：</h4>
                    <div className={superuserStyles.permissionsGrid}>
                      {permissionFields.map(field => (
                        <label key={field} className={superuserStyles.permCheckbox}>
                          <input
                            type="checkbox"
                            checked={
                              permissionsEdit[u.id]?.[field] ?? u[field] ?? false
                            }
                            onChange={() => handlePermissionChange(u.id, field)}
                          />
                          <span>{PERMISSION_LABELS[field]}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default SuperuserPanel;
