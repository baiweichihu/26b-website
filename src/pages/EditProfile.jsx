import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { getCurrentUser, getProfileDetails, updateProfileDetails } from '../services/userService';
import NoticeBox from '../components/widgets/NoticeBox';
import { useIrisTransition } from '../components/ui/IrisTransition';
import styles from './Auth.module.css';

const NAME_LIMIT = 10;
const BIO_LIMIT = 50;

const EditProfile = () => {
  const [loading, setLoading] = useState(true);
  const [initialProfile, setInitialProfile] = useState({ nickname: '', bio: '' });
  const [formData, setFormData] = useState({ nickname: '', bio: '' });
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const panelRef = useRef(null);
  const navigate = useNavigate();
  const { triggerIris } = useIrisTransition();

  useEffect(() => {
    const loadProfile = async () => {
      const userResult = await getCurrentUser();
      if (!userResult.success || !userResult.user) {
        navigate('/login', { replace: true });
        return;
      }

      const profileResult = await getProfileDetails();
      if (!profileResult.success) {
        setNotice({ type: 'error', message: profileResult.error || '加载个人账户信息失败' });
        setLoading(false);
        return;
      }

      const nickname = profileResult.profile?.nickname || '';
      const bio = profileResult.profile?.bio || '';
      setInitialProfile({ nickname, bio });
      setFormData({ nickname, bio });
      setLoading(false);
    };

    loadProfile();
  }, [navigate]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    const limit = name === 'nickname' ? NAME_LIMIT : BIO_LIMIT;
    setFormData((prev) => ({ ...prev, [name]: value.slice(0, limit) }));
  };

  const trimmedNickname = useMemo(() => formData.nickname.trim(), [formData.nickname]);
  const trimmedBio = useMemo(() => formData.bio.trim(), [formData.bio]);

  const isDirty =
    trimmedNickname !== (initialProfile.nickname || '') ||
    trimmedBio !== (initialProfile.bio || '');

  const canSubmit = isDirty && !submitting;

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!canSubmit) return;

    try {
      setSubmitting(true);
      setNotice(null);
      const result = await updateProfileDetails({
        nickname: trimmedNickname,
        bio: trimmedBio,
      });
      if (!result.success) {
        throw new Error(result.error || 'Failed to update profile.');
      }

      if (triggerIris) {
        triggerIris(null, '/user/manage', { replace: true });
      } else {
        navigate('/user/manage', { replace: true });
      }
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Failed to update profile.' });
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content scene-page">
        <section className={`scene-panel ${styles.authPanel}`} ref={panelRef}>
          <p className="scene-kicker">我的账户</p>
          <h1 className="scene-title">加载中...</h1>
          <p className="scene-subtitle">正在加载您的个人账户信息.</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.authPanel}`} ref={panelRef}>
        <div className={styles.glow} aria-hidden="true" />
        <div className={styles.glowSecondary} aria-hidden="true" />
        <div className={styles.formCard}>
          <div className={styles.formHeader}>
            <h2>个人信息修改</h2>
            <p>更新昵称和个人简介</p>
          </div>

          {notice && <NoticeBox type={notice.type} message={notice.message} />}

          <form onSubmit={handleSubmit}>
            <div className={styles.field}>
              <label className="form-label" htmlFor="nickname">
                用户名
              </label>
              <input
                id="nickname"
                name="nickname"
                type="text"
                className="form-control"
                value={formData.nickname}
                onChange={handleChange}
                maxLength={NAME_LIMIT}
                autoComplete="nickname"
              />
              <span className={styles.helperText} style={{ textAlign: 'right' }}>
                {formData.nickname.length}/{NAME_LIMIT}
              </span>
            </div>

            <div className={styles.field}>
              <label className="form-label" htmlFor="bio">
                个人简介
              </label>
              <textarea
                id="bio"
                name="bio"
                className="form-control"
                rows={3}
                value={formData.bio}
                onChange={handleChange}
                maxLength={BIO_LIMIT}
              />
              <span className={styles.helperText} style={{ textAlign: 'right' }}>
                {formData.bio.length}/{BIO_LIMIT}
              </span>
            </div>

            <div className={styles.formActions}>
              <button type="submit" className="scene-button primary" disabled={!canSubmit}>
                {submitting ? '保存中...' : '保存更改'}
              </button>
              <Link
                to="/user/manage"
                className={styles.altLink}
                onClick={(event) => triggerIris?.(event, '/user/manage')}
              >
                返回账户页
              </Link>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
};

export default EditProfile;
