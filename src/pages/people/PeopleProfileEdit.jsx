import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import NoticeBox from '../../components/widgets/NoticeBox';
import { supabase } from '../../lib/supabase';
import {
  getMyPeopleProfile,
  getPeopleProfileById,
  updateMyPeopleProfile,
  updatePeopleProfileById,
} from '../../services/peopleService';
import styles from './PeopleProfileEdit.module.css';

const splitBySpace = (value) =>
  String(value || '')
    .split(/\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

const SOCIAL_PLATFORM_OPTIONS = [
  { value: '', label: '未选择' },
  { value: 'wechat', label: '微信' },
  { value: 'qq', label: 'QQ' },
  { value: 'bilibili', label: 'Bilibili' },
  { value: 'github', label: 'GitHub' },
  { value: 'other', label: '其他' },
];

const KNOWN_SOCIAL_KEYS = ['wechat', 'qq', 'bilibili', 'github'];

const buildPhoneText = (phone) => {
  if (!phone) return '';
  if (typeof phone === 'string') return phone;
  if (typeof phone !== 'object') return '';

  const display = String(phone.display || '').trim();
  if (display) return display;

  const countryCode = String(phone.countryCode || '').trim();
  const number = String(phone.number || '').trim();
  const ext = String(phone.ext || '').trim();
  const extText = ext ? ` 转 ${ext}` : '';
  return `${countryCode} ${number}${extText}`.trim();
};

const parseSocialRows = (social) => {
  if (!social || typeof social !== 'object') return [];

  const rows = [];

  KNOWN_SOCIAL_KEYS.forEach((key) => {
    const value = String(social[key] || '').trim();
    if (value) {
      rows.push({ platform: key, customPlatform: '', account: value });
    }
  });

  const custom = Array.isArray(social.other) ? social.other : [];
  custom.forEach((item) => {
    const platform = String(item?.platform || '').trim();
    const account = String(item?.account || '').trim();
    if (platform && account) {
      rows.push({ platform: 'other', customPlatform: platform, account });
    }
  });

  return rows;
};

const buildSocialPayload = (rows, emailText) => {
  const social = {};
  const email = String(emailText || '').trim();
  if (email) {
    social.email = email;
  }

  const custom = [];
  rows.forEach((row) => {
    const platform = String(row?.platform || '').trim();
    const account = String(row?.account || '').trim();
    if (!platform || !account) return;

    if (KNOWN_SOCIAL_KEYS.includes(platform)) {
      social[platform] = account;
      return;
    }

    if (platform === 'other') {
      const customPlatform = String(row?.customPlatform || '').trim();
      if (customPlatform) {
        custom.push({ platform: customPlatform, account });
      }
    }
  });

  if (custom.length > 0) {
    social.other = custom;
  }

  return Object.keys(social).length > 0 ? social : null;
};

const roleLabels = {
  student: '学生',
  teacher: '教师',
};

const genderLabels = {
  male: '男',
  female: '女',
};

const statusOptionsByRole = {
  student: ['未设置', '在读', '深造', '工作', '创业', '待业', '其他'],
  teacher: ['在职', '调任', '转行', '退休', '其他'],
};

const PeopleProfileEdit = () => {
  const navigate = useNavigate();
  const { profileId } = useParams();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [notice, setNotice] = useState(null);
  const [avatarFile, setAvatarFile] = useState(null);
  const [hasProfile, setHasProfile] = useState(false);
  const [socialRows, setSocialRows] = useState([]);
  const [isSuperuser, setIsSuperuser] = useState(false);

  const [form, setForm] = useState({
    name: '',
    student_no: '',
    nickname: '',
    gender: 'male',
    role: 'student',
    owner_user_id: '',
    status: '',
    description: '',
    bio: '',
    english_name: '',
    university: '',
    major: '',
    subject: '',
    current_position: '',
    phone: '',
    email: '',
    website: '',
    hobbiesText: '',
    skillsText: '',
  });

  const reloadProfile = async () => {
    setLoading(true);
    try {
      const authResult = await supabase.auth.getUser();
      const userId = authResult?.data?.user?.id || null;
      let isCurrentSuperuser = false;

      if (userId) {
        const { data: profileRow } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', userId)
          .maybeSingle();
        isCurrentSuperuser = profileRow?.role === 'superuser';
        setIsSuperuser(isCurrentSuperuser);
      } else {
        setIsSuperuser(false);
      }

      const { data, error } = profileId
        ? await getPeopleProfileById(profileId)
        : await getMyPeopleProfile();

      if (error) {
        setNotice({ type: 'error', message: error.message || '加载资料失败' });
      }

      if (data) {
        setHasProfile(true);
        setForm({
          name: data.name || '',
          student_no: Number.isFinite(data.student_no) ? String(data.student_no) : '',
          nickname: data.nickname || '',
          gender: data.gender || 'male',
          role: data.role || 'student',
          owner_user_id: data.owner_user_id || '',
          status: data.status || '',
          description: data.description || '',
          bio: data.bio || '',
          english_name: data.english_name || '',
          university: data.university || '',
          major: data.major || '',
          subject: data.subject || '',
          current_position: data.current_position || '',
          phone: buildPhoneText(data.phone),
          email: typeof data.social === 'object' && data.social ? data.social.email || '' : '',
          website: data.website || '',
          hobbiesText: Array.isArray(data.hobbies) ? data.hobbies.join(' ') : '',
          skillsText: Array.isArray(data.skills) ? data.skills.join(' ') : '',
        });

        if (profileId && userId && data.owner_user_id !== userId && !isCurrentSuperuser) {
            setHasProfile(false);
            setNotice({ type: 'error', message: '你无权修改该人物资料' });
            return;
        }

        setSocialRows(parseSocialRows(data.social));
      } else {
        setHasProfile(false);
        setSocialRows([]);
        setNotice({ type: 'error', message: '你还没有人物资料，请先在人物中心创建。' });
      }
    } catch (error) {
      setHasProfile(false);
      setSocialRows([]);
      setNotice({ type: 'error', message: error.message || '加载资料失败' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const load = async () => {
      await reloadProfile();
    };

    void load();
  }, [profileId]);

  const canSubmit = useMemo(() => {
    return !submitting && hasProfile;
  }, [hasProfile, submitting]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  const handleAvatarChange = (event) => {
    const file = event.target.files?.[0] || null;
    setAvatarFile(file);
  };

  const handleAddSocialRow = () => {
    setSocialRows((prev) => [...prev, { platform: '', customPlatform: '', account: '' }]);
  };

  const handleRemoveSocialRow = (index) => {
    setSocialRows((prev) => prev.filter((_, rowIndex) => rowIndex !== index));
  };

  const handleSocialRowChange = (index, field, value) => {
    setSocialRows((prev) =>
      prev.map((row, rowIndex) => {
        if (rowIndex !== index) return row;
        if (field === 'platform') {
          return {
            ...row,
            platform: value,
            customPlatform: value === 'other' ? row.customPlatform : '',
          };
        }
        return { ...row, [field]: value };
      })
    );
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setNotice(null);

    if (avatarFile && avatarFile.size > 2 * 1024 * 1024) {
      setNotice({ type: 'error', message: '头像文件大小不能超过 2MB' });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        nickname: form.nickname.trim() || null,
        status: form.status.trim() || null,
        description: form.description.trim() || null,
        bio: form.bio.trim() || null,
        english_name: form.english_name.trim() || null,
        university: form.university.trim() || null,
        major: form.major.trim() || null,
        subject: form.subject.trim() || null,
        current_position: form.current_position.trim() || null,
        phone: form.phone.trim() ? { display: form.phone.trim() } : null,
        website: form.role === 'student' ? form.website.trim() || null : null,
        social: buildSocialPayload(socialRows, form.email),
        hobbies: splitBySpace(form.hobbiesText),
        skills: splitBySpace(form.skillsText),
      };

      if (isSuperuser && profileId) {
        const ownerUserId = form.owner_user_id.trim();
        if (!ownerUserId) {
          throw new Error('用户归属 owner_user_id 不能为空');
        }
        payload.owner_user_id = ownerUserId;
      }

      const { error } = profileId
        ? await updatePeopleProfileById(profileId, payload, avatarFile)
        : await updateMyPeopleProfile(payload, avatarFile);
      if (error) throw error;

      setNotice({ type: 'success', message: '资料更新成功' });
      setAvatarFile(null);
    } catch (error) {
      setNotice({ type: 'error', message: error.message || '更新失败' });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="page-content scene-page">
        <section className={`scene-panel ${styles.panel}`}>
          <p className={styles.tip}>正在加载个人资料...</p>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content scene-page">
      <section className={`scene-panel ${styles.panel}`}>
        <p className="scene-kicker">人物中心</p>
        <h1 className="scene-title">修改个人资料</h1>
        <p className="scene-subtitle">支持更新资料并上传人物照片（≤2MB）</p>
        <p className={styles.requiredHint}>说明：带 * 的为必填项。</p>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.field}>
            人物照片（JPEG/PNG/WEBP，≤2MB）
            <input
              type="file"
              className="form-control"
              accept="image/jpeg,image/png,image/webp"
              onChange={handleAvatarChange}
            />
          </label>

          <div className={styles.grid}>
            <label className={styles.field}>
              姓名 *（创建后不可修改）
              <input className="form-control" name="name" value={form.name} disabled readOnly />
            </label>
            <label className={styles.field}>
              性别 *（创建后不可修改）
              <input className="form-control" name="gender" value={genderLabels[form.gender] || ''} disabled readOnly />
            </label>
            <label className={styles.field}>
              身份 *（创建后不可修改）
              <input className="form-control" name="role" value={roleLabels[form.role] || ''} disabled readOnly />
            </label>
            {isSuperuser && profileId && (
              <label className={styles.field}>
                用户归属 owner_user_id
                <input className="form-control" name="owner_user_id" value={form.owner_user_id} onChange={handleChange} />
              </label>
            )}
            {form.role === 'student' && (
              <label className={styles.field}>
                学号 *（创建后不可修改）
                <input className="form-control" name="student_no" value={form.student_no} disabled readOnly />
              </label>
            )}
            {form.role === 'student' && (
              <>
                <label className={styles.field}>
                  昵称
                  <input className="form-control" name="nickname" value={form.nickname} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  英文名
                  <input className="form-control" name="english_name" value={form.english_name} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  状态
                  <select className="form-select" name="status" value={form.status} onChange={handleChange}>
                    {statusOptionsByRole.student.map((item) => (
                      <option key={item} value={item === '未设置' ? '' : item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  院校名称
                  <input className="form-control" name="university" value={form.university} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  专业
                  <input className="form-control" name="major" value={form.major} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  爱好（空格分隔）
                  <input className="form-control" name="hobbiesText" value={form.hobbiesText} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  技能（空格分隔）
                  <input className="form-control" name="skillsText" value={form.skillsText} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  手机
                  <input className="form-control" name="phone" value={form.phone} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  邮箱
                  <input className="form-control" name="email" value={form.email} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  个人网站
                  <input className="form-control" name="website" value={form.website} onChange={handleChange} />
                </label>
              </>
            )}
            {form.role === 'teacher' && (
              <>
                <label className={styles.field}>
                  昵称
                  <input className="form-control" name="nickname" value={form.nickname} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  状态
                  <select className="form-select" name="status" value={form.status} onChange={handleChange}>
                    <option value="">未设置</option>
                    {statusOptionsByRole.teacher.map((item) => (
                      <option key={item} value={item}>
                        {item}
                      </option>
                    ))}
                  </select>
                </label>
                <label className={styles.field}>
                  学科
                  <input className="form-control" name="subject" value={form.subject} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  职位
                  <input className="form-control" name="current_position" value={form.current_position} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  爱好（空格分隔）
                  <input className="form-control" name="hobbiesText" value={form.hobbiesText} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  技能（空格分隔）
                  <input className="form-control" name="skillsText" value={form.skillsText} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  手机
                  <input className="form-control" name="phone" value={form.phone} onChange={handleChange} />
                </label>
                <label className={styles.field}>
                  邮箱
                  <input className="form-control" name="email" value={form.email} onChange={handleChange} />
                </label>
              </>
            )}
          </div>

          <div className={styles.socialSection}>
            <div className={styles.socialHeader}>
              <span>社交媒体</span>
              <button type="button" className="scene-button primary" onClick={handleAddSocialRow}>
                + 添加
              </button>
            </div>
            {socialRows.length === 0 && <p className={styles.socialEmpty}>暂无社交媒体，点击 + 添加</p>}
            {socialRows.map((row, index) => (
              <div key={`social-${index}`} className={styles.socialRow}>
                <select
                  className="form-select"
                  value={row.platform}
                  onChange={(event) => handleSocialRowChange(index, 'platform', event.target.value)}
                >
                  {SOCIAL_PLATFORM_OPTIONS.map((option) => (
                    <option key={option.value || 'none'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>

                {row.platform === 'other' && (
                  <input
                    className="form-control"
                    value={row.customPlatform}
                    onChange={(event) => handleSocialRowChange(index, 'customPlatform', event.target.value)}
                    placeholder="自定义平台名"
                  />
                )}

                <input
                  className="form-control"
                  value={row.account}
                  onChange={(event) => handleSocialRowChange(index, 'account', event.target.value)}
                  placeholder="账号"
                />

                <button type="button" className="scene-button ghost" onClick={() => handleRemoveSocialRow(index)}>
                  - 删除
                </button>
              </div>
            ))}
          </div>

          <label className={styles.field}>
            一句话介绍
            <input
              className="form-control"
              name="bio"
              value={form.bio}
              onChange={handleChange}
              maxLength={50}
              placeholder="最多 50 字"
            />
          </label>

          <label className={styles.field}>
            详细介绍
            <textarea
              className={`form-control ${styles.textarea}`}
              name="description"
              value={form.description}
              onChange={handleChange}
              rows={5}
              maxLength={1000}
              placeholder="最多 1000 字"
            />
          </label>

          <div className={styles.actions}>
            <button type="submit" className="scene-button primary" disabled={!canSubmit}>
              {submitting ? '保存中...' : '保存修改'}
            </button>
            <button type="button" className="scene-button ghost" onClick={() => navigate('/introduction')}>
              返回人物中心
            </button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default PeopleProfileEdit;
