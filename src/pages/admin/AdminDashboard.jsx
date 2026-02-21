import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getAdminPermissions,
  getUpgradeRequests,
  getContentReports,
  getJournalAccessRequests,
  getPermissionChangeRequests,
} from '../../services/adminService';
import styles from './AdminDashboard.module.css';

/**
 * 管理员中心仪表板
 * 显示管理员权限、待审核项目统计、快速操作菜单
 */
function AdminDashboard() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [permissions, setPermissions] = useState(null);
  const [stats, setStats] = useState({
    pendingUpgrades: 0,
    pendingReports: 0,
    pendingJournalRequests: 0,
    pendingPermissionRequests: 0,
  });
  const [loading, setLoading] = useState(true);
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

  const loadData = useCallback(
    async (showLoading = true) => {
      if (!userId || !userRole) return;

      if (showLoading) {
        setLoading(true);
      }
      setError(null);

      try {
        // 获取权限信息
        const { data: permData, error: permError } = await getAdminPermissions(userId);
        if (permError) {
          console.error('获取权限信息失败:', permError);
        } else {
          setPermissions(permData);
        }

        // 获取待审核项目统计
        const statsData = {
          pendingUpgrades: 0,
          pendingReports: 0,
          pendingJournalRequests: 0,
          pendingPermissionRequests: 0,
        };

        // 获取待审核升级请求数
        if (!permData || permData.can_manage_user_permissions) {
          const { data: upgradesData } = await getUpgradeRequests('pending');
          statsData.pendingUpgrades = upgradesData?.length || 0;
        }

        // 获取待处理举报数
        if (!permData || permData.can_manage_content) {
          const { data: reportsData } = await getContentReports('pending');
          statsData.pendingReports = reportsData?.length || 0;
        }

        // 获取班日志查档申请数
        if (!permData || permData.can_manage_journal) {
          const { data: journalData } = await getJournalAccessRequests('pending');
          statsData.pendingJournalRequests = journalData?.length || 0;
        }

        // 仅 superuser 可以看权限变更申请
        if (userRole === 'superuser') {
          const { data: permReqData } = await getPermissionChangeRequests('pending');
          statsData.pendingPermissionRequests = permReqData?.length || 0;
        }

        setStats(statsData);
      } catch (err) {
        setError(err.message || '加载数据失败');
        console.error('加载管理员数据失败:', err);
      }

      if (showLoading) {
        setLoading(false);
      }
    },
    [userId, userRole]
  );

  // 当 userId 和 userRole 加载完成后，获取数据
  useEffect(() => {
    if (!userId || !userRole) return;
    loadData(true);
  }, [userId, userRole, loadData]);

  // 使用 Supabase Realtime 监听统计数据变化
  useEffect(() => {
    if (!userId || !userRole) return;

    const channel = supabase
      .channel(`admin-dashboard:${userId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'upgrade_requests' },
        () => loadData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'content_reports' },
        () => loadData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'journal_access_requests' },
        () => loadData(false)
      )
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'admin_requests' },
        () => loadData(false)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [userId, userRole, loadData]);

  const handleNavigate = (path) => {
    navigate(path);
  };

  const baseMenuItems = [
    {
      title: '普通用户权限管理',
      description: '审核游客升级校友申请、禁言用户',
      icon: '👤',
      path: '/admin/user-permissions',
      count: stats.pendingUpgrades,
      permission: permissions?.can_manage_user_permissions,
      requiredRole: 'admin', // admin 和 superuser 都可以
    },
    {
      title: '内容管理',
      description: '审核举报、删除违规内容',
      icon: '📋',
      path: '/admin/content-reports',
      count: stats.pendingReports,
      permission: permissions?.can_manage_content,
      requiredRole: 'admin',
    },
    {
      title: '班日志审核',
      description: '审核校友查档申请',
      icon: '📖',
      path: '/admin/journal-approval',
      count: stats.pendingJournalRequests,
      permission: permissions?.can_manage_journal,
      requiredRole: 'admin',
    },
    {
      title: '自身权限管理',
      description: '申请权限变更、查看权限',
      icon: '🔐',
      path: '/admin/permission-request',
      permission: true, // 所有管理员可以申请权限
      requiredRole: 'admin',
    },
  ];

  const superuserMenuItems = [
    {
      title: '管理员权限审批',
      description: '审核管理员权限变更申请',
      icon: '✅',
      path: '/admin/permission-approvals',
      count: stats.pendingPermissionRequests,
      permission: true,
      requiredRole: 'superuser',
    },
    {
      title: '发布系统公告',
      description: '向用户发布系统公告通知',
      icon: '📢',
      path: '/admin/announcement',
      permission: true,
      requiredRole: 'superuser',
    },
    {
      title: '所有用户管理',
      description: '管理所有账户、任免管理员',
      icon: '📋',
      path: '/admin/superuser-panel',
      permission: true,
      requiredRole: 'superuser',
    },
  ];

  // 过滤有权限访问的菜单项
  const accessibleMenuItems = baseMenuItems.filter((item) => {
    if (item.requiredRole === 'superuser') {
      return userRole === 'superuser';
    }
    // admin 和 superuser 都可以看 admin 的菜单项
    if (item.requiredRole === 'admin') {
      return userRole === 'admin' || userRole === 'superuser';
    }
    return item.permission !== false;
  });

  const accessibleSuperuserItems = superuserMenuItems.filter((item) => {
    return userRole === 'superuser';
  });

  return (
    <div className={styles.dashboardContainer}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/')}
          title="返回首页"
        >
          <i className="fas fa-arrow-left"></i> 返回首页
        </button>
        <div>
          <h1>管理员中心</h1>
          <p>
            {userRole === 'superuser'
              ? '欢迎，Superuser'
              : '欢迎，管理员'}
          </p>
        </div>
      </div>

      {error && <div className={styles.errorBanner}>{error}</div>}

      {loading ? (
        <div className={styles.loading}>加载中...</div>
      ) : (
        <>
          {/* 权限信息卡片 */}
          {permissions && (
            <div className={styles.permissionsCard}>
              <h2>您的权限</h2>
              <div className={styles.permissionsList}>
                {permissions.can_manage_user_permissions && (
                  <span className={styles.permissionBadge}>用户权限管理</span>
                )}
                {permissions.can_manage_content && (
                  <span className={styles.permissionBadge}>内容管理</span>
                )}
                {permissions.can_manage_journal && (
                  <span className={styles.permissionBadge}>班日志审核</span>
                )}
                {permissions.can_ban_users && (
                  <span className={styles.permissionBadge}>禁言管理</span>
                )}
              </div>
            </div>
          )}

          {/* 待审核项目统计 */}
          <div className={styles.statsGrid}>
            {stats.pendingUpgrades > 0 && (
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.pendingUpgrades}</div>
                <div className={styles.statLabel}>升级申请</div>
              </div>
            )}
            {stats.pendingReports > 0 && (
              <div className={styles.statCard}>
                <div className={styles.statNumber}>{stats.pendingReports}</div>
                <div className={styles.statLabel}>待处理举报</div>
              </div>
            )}
            {stats.pendingJournalRequests > 0 && (
              <div className={styles.statCard}>
                <div className={styles.statNumber}>
                  {stats.pendingJournalRequests}
                </div>
                <div className={styles.statLabel}>日志查档申请</div>
              </div>
            )}
            {stats.pendingPermissionRequests > 0 && (
              <div className={styles.statCard}>
                <div className={styles.statNumber}>
                  {stats.pendingPermissionRequests}
                </div>
                <div className={styles.statLabel}>权限变更申请</div>
              </div>
            )}
          </div>

          {/* 快速操作菜单 */}
          <div className={styles.menuSection}>
            <h2>快速操作</h2>
            <div className={styles.menuGrid}>
              {accessibleMenuItems.map((item) => (
                <div
                  key={item.path}
                  className={styles.menuCard}
                  onClick={() => handleNavigate(item.path)}
                >
                  <div className={styles.cardIcon}>{item.icon}</div>
                  <div className={styles.cardContent}>
                    <h3>{item.title}</h3>
                    <p>{item.description}</p>
                  </div>
                  {item.count > 0 && (
                    <div className={styles.cardBadge}>{item.count}</div>
                  )}
                </div>
              ))}
            </div>
          </div>
          {userRole === 'superuser' && accessibleSuperuserItems.length > 0 && (
            <div className={styles.menuSection}>
              <h2>超级管理员操作</h2>
              <div className={styles.menuGrid}>
                {accessibleSuperuserItems.map((item) => (
                  <div
                    key={item.path}
                    className={styles.menuCard}
                    onClick={() => handleNavigate(item.path)}
                  >
                    <div className={styles.cardIcon}>{item.icon}</div>
                    <div className={styles.cardContent}>
                      <h3>{item.title}</h3>
                      <p>{item.description}</p>
                    </div>
                    {item.count > 0 && (
                      <div className={styles.cardBadge}>{item.count}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default AdminDashboard;
