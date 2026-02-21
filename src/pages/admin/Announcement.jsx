import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { publishSystemAnnouncement } from '../../services/adminService';
import styles from './AdminSimplePage.module.css';
import announcementStyles from './Announcement.module.css';

const IDENTITY_TYPES = [
  { value: 'classmate', label: '本班同学' },
  { value: 'alumni', label: '校友' },
  { value: 'guest', label: '游客' },
];

function Announcement() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [targetIdentities, setTargetIdentities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [recentAnnouncements, setRecentAnnouncements] = useState([]);

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

        // 获取最近的系统公告
        const { data: announcements, error: annoError } = await supabase
          .from('notifications')
          .select(
            `
            id,
            title,
            content,
            created_at,
            recipient_id
          `
          )
          .eq('type', 'system_announcement')
          .order('created_at', { ascending: false })
          .limit(20);

        if (!annoError && announcements) {
          // 去重：只保留每个公告的一条记录
          const uniqueAnnouncements = [];
          const titleSet = new Set();
          announcements.forEach(anno => {
            if (!titleSet.has(anno.title)) {
              titleSet.add(anno.title);
              uniqueAnnouncements.push(anno);
            }
          });
          setRecentAnnouncements(uniqueAnnouncements.slice(0, 10));
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

  const handleIdentityToggle = (value) => {
    setTargetIdentities(prev =>
      prev.includes(value) ? prev.filter(v => v !== value) : [...prev, value]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      setErrorMessage('请输入公告标题');
      return;
    }

    if (!content.trim()) {
      setErrorMessage('请输入公告内容');
      return;
    }

    setSubmitting(true);
    setErrorMessage('');

    try {
      const { insertedCount, error } = await publishSystemAnnouncement(
        title,
        content,
        user.id,
        targetIdentities.length > 0 ? targetIdentities : []
      );

      if (error) {
        setErrorMessage(`发布失败: ${error}`);
      } else {
        setSuccessMessage(`公告已发布，${insertedCount} 名用户已收到通知！`);
        setTitle('');
        setContent('');
        setTargetIdentities([]);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      }
    } catch (err) {
      setErrorMessage(`发布失败: ${err.message}`);
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
          <h1>发布系统公告</h1>
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
        <h1>发布系统公告</h1>
      </div>

      <div className={announcementStyles.contentWrapper}>
        {/* 发布公告表单 */}
        <div className={styles.contentBox}>
          <h2>发布新的系统公告</h2>
          <form onSubmit={handleSubmit} className={announcementStyles.form}>
            <div className={announcementStyles.formSection}>
              <label htmlFor="title">公告标题 *</label>
              <input
                id="title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="例如：系统维护公告"
                className={announcementStyles.titleInput}
                maxLength="50"
              />
            </div>

            <div className={announcementStyles.formSection}>
              <label htmlFor="content">公告内容 *</label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="输入公告的详细内容..."
                rows="8"
                className={announcementStyles.contentInput}
              />
              <p className={announcementStyles.charCount}>
                {content.length}/2000
              </p>
            </div>

            <div className={announcementStyles.formSection}>
              <label>接收对象（不选则发送给所有用户）：</label>
              <div className={announcementStyles.identitiesGrid}>
                {IDENTITY_TYPES.map(identity => (
                  <div key={identity.value} className={announcementStyles.identityCheckbox}>
                    <label>
                      <input
                        type="checkbox"
                        checked={targetIdentities.includes(identity.value)}
                        onChange={() => handleIdentityToggle(identity.value)}
                      />
                      <span>{identity.label}</span>
                    </label>
                  </div>
                ))}
              </div>
            </div>

            {errorMessage && <div className={announcementStyles.errorMessage}>{errorMessage}</div>}
            {successMessage && <div className={announcementStyles.successMessage}>{successMessage}</div>}

            <button
              type="submit"
              disabled={submitting}
              className={announcementStyles.submitBtn}
            >
              {submitting ? '发布中...' : '发布公告'}
            </button>
          </form>
        </div>

        {/* 最近的公告 */}
        {recentAnnouncements.length > 0 && (
          <div className={styles.contentBox}>
            <h2>最近发布的公告</h2>
            <div className={announcementStyles.announcementsList}>
              {recentAnnouncements.map((anno) => (
                <div key={anno.id} className={announcementStyles.announcementItem}>
                  <h4>{anno.title}</h4>
                  <p className={announcementStyles.announcementContent}>
                    {anno.content.substring(0, 150)}
                    {anno.content.length > 150 ? '...' : ''}
                  </p>
                  <p className={announcementStyles.announcementDate}>
                    {new Date(anno.created_at).toLocaleDateString('zh-CN', {
                      year: 'numeric',
                      month: '2-digit',
                      day: '2-digit',
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Announcement;
