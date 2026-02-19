import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import {
  getAllNotifications,
  getUnreadNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  subscribeToNotifications,
  unsubscribeFromNotifications,
} from '../../services/inboxService';
import styles from './Notifications.module.css';

/**
 * 通知中心组件
 * 用户可以查看所有通知、标记已读、实时接收新通知
 */
function Notifications() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [notifications, setNotifications] = useState([]);
  const [filter, setFilter] = useState('all'); // all, unread, audit, report, interaction, announcement
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 20;

  // 检查登录状态
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

        setUserId(user.id);
      } catch (error) {
        console.error('检查认证失败:', error);
        navigate('/login');
      }
    };

    checkAuth();
  }, [navigate]);

  // 加载通知列表
  useEffect(() => {
    if (!userId) return;

    const loadNotifications = async () => {
      setLoading(true);
      setError(null);

      const offset = (currentPage - 1) * itemsPerPage;
      const { data, error } = await getAllNotifications(userId, itemsPerPage, offset);

      if (error) {
        setError(error.message || '加载通知失败');
      } else {
        setNotifications(data || []);
      }

      setLoading(false);
    };

    loadNotifications();
  }, [userId, currentPage]);

  // 订阅实时通知
  useEffect(() => {
    if (!userId) return;

    const setupSubscription = async () => {
      const { error } = await subscribeToNotifications(userId, (payload) => {
        if (payload.type === 'INSERT') {
          // 新通知到达，添加到列表顶部
          setNotifications((prev) => [payload.data, ...prev]);
        } else if (payload.type === 'UPDATE') {
          // 通知状态更新，更新列表
          setNotifications((prev) =>
            prev.map((notif) =>
              notif.id === payload.data.id ? payload.data : notif
            )
          );
        }
      });

      if (error) {
        console.error('订阅通知失败:', error);
      }
    };

    setupSubscription();

    return () => {
      unsubscribeFromNotifications(userId);
    };
  }, [userId]);

  // 根据过滤条件获取通知
  const getFilteredNotifications = () => {
    if (filter === 'all') return notifications;
    if (filter === 'unread') return notifications.filter((n) => !n.is_read);
    return notifications.filter((n) => n.type === filter);
  };

  // 标记单条通知为已读
  const handleMarkAsRead = async (notificationId) => {
    const { error } = await markNotificationAsRead(notificationId);
    if (!error) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationId ? { ...n, is_read: true } : n))
      );
    }
  };

  // 标记全部为已读
  const handleMarkAllAsRead = async () => {
    const { error } = await markAllNotificationsAsRead(userId);
    if (!error) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    }
  };

  // 处理通知点击（不跳转）
  const handleNotificationClick = (notification) => {
    if (!notification.is_read) {
      handleMarkAsRead(notification.id);
    }
  };

  const filteredNotifications = getFilteredNotifications();
  const unreadCount = notifications.filter((n) => !n.is_read).length;

  useEffect(() => {
    if (!userId) return;
    window.dispatchEvent(
      new CustomEvent('notifications:unreadCount', {
        detail: unreadCount,
      })
    );
  }, [unreadCount, userId]);

  const getTypeLabel = (type) => {
    const labels = {
      system_announcement: '系统公告',
      audit_result: '审核结果',
      report_feedback: '举报反馈',
      interaction: '互动提醒',
    };
    return labels[type] || type;
  };

  const getTypeColor = (type) => {
    const colors = {
      system_announcement: '#ff6b6b',
      audit_result: '#4c6ef5',
      report_feedback: '#ffa94d',
      interaction: '#51cf66',
    };
    return colors[type] || '#666';
  };

  return (
    <div className={styles.notificationsContainer}>
      <div className={styles.header}>
        <button
          className={styles.backBtn}
          onClick={() => navigate('/')}
          title="返回首页"
        >
          <i className="fas fa-arrow-left"></i> 返回
        </button>
        <h1>通知中心</h1>
        <div className={styles.headerActions}>
          <span className={styles.unreadBadge}>
            {unreadCount > 0 && <span className={styles.redDot}></span>}
            {unreadCount} 条未读
          </span>
          {unreadCount > 0 && (
            <button
              className={styles.markAllButton}
              onClick={handleMarkAllAsRead}
            >
              全部标记为已读
            </button>
          )}
        </div>
      </div>

      <div className={styles.filterBar}>
        {['all', 'unread', 'audit_result', 'report_feedback', 'interaction', 'system_announcement'].map(
          (f) => (
            <button
              key={f}
              className={`${styles.filterBtn} ${
                filter === f ? styles.active : ''
              }`}
              onClick={() => {
                setFilter(f);
                setCurrentPage(1);
              }}
            >
              {f === 'all'
                ? '全部'
                : f === 'unread'
                ? '未读'
                : getTypeLabel(f)}
            </button>
          )
        )}
      </div>

      <div className={styles.notificationsList}>
        {loading && <div className={styles.loading}>加载中...</div>}
        {error && <div className={styles.error}>{error}</div>}
        {!loading && filteredNotifications.length === 0 && (
          <div className={styles.empty}>
            <p>暂无通知</p>
          </div>
        )}

        {filteredNotifications.map((notification) => (
          <div
            key={notification.id}
            className={`${styles.notificationItem} ${!notification.is_read ? styles.unread : ''}`}
            onClick={() => handleNotificationClick(notification)}
          >
            <div className={styles.notifHeader}>
              <span
                className={styles.typeTag}
                style={{ backgroundColor: getTypeColor(notification.type) }}
              >
                {getTypeLabel(notification.type)}
              </span>
              <span className={styles.timestamp}>
                {new Date(notification.created_at).toLocaleString('zh-CN')}
              </span>
            </div>

            <div className={styles.notifContent}>
              <h3>{notification.title}</h3>
              <p>{notification.content}</p>
            </div>

            <div className={styles.notifFooter}>
              {!notification.is_read && (
                <button
                  className={styles.readBtn}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notification.id);
                  }}
                >
                  标记为已读
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {filteredNotifications.length > 0 && (
        <div className={styles.pagination}>
          <button
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((p) => p - 1)}
          >
            上一页
          </button>
          <span>
            第 {currentPage} 页
          </span>
          <button
            disabled={filteredNotifications.length < itemsPerPage}
            onClick={() => setCurrentPage((p) => p + 1)}
          >
            下一页
          </button>
        </div>
      )}
    </div>
  );
}

export default Notifications;
