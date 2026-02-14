import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NoticeBox from '../components/widgets/NoticeBox';
import { useIrisTransition } from '../components/ui/IrisTransition';
import { submitGuestIdentityUpgradeRequest } from '../services/userService';

const GuestUpdateIdentity = () => {
  const { triggerIris } = useIrisTransition();
  const location = useLocation();
  const fromPath = useMemo(() => {
    const rawFrom = location.state?.from;
    if (!rawFrom) return location.pathname;
    if (typeof rawFrom === 'string') return rawFrom;
    if (typeof rawFrom?.pathname === 'string') return rawFrom.pathname;
    return location.pathname;
  }, [location.pathname, location.state]);
  const [status, setStatus] = useState('loading');
  const [profile, setProfile] = useState(null);
  const [formData, setFormData] = useState({
    evidence: '',
  });
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [hasUpgradeRequest, setHasUpgradeRequest] = useState(false);

  useEffect(() => {
    const loadProfile = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          setStatus('anonymous');
          return;
        }

        const { data: profileData, error: profileError } = await supabase
          .from('profiles')
          .select('identity_type, role, nickname, email')
          .eq('id', user.id)
          .single();

        if (profileError || !profileData) {
          setStatus('anonymous');
          return;
        }

        setProfile(profileData);

        let upgradeRequestExists = false;
        if (profileData.identity_type === 'guest') {
          const { data: requestData, error: requestError } = await supabase
            .from('admin_requests')
            .select('id')
            .eq('requester_id', user.id)
            .eq('request_type', 'upgrade_identity')
            .eq('status', 'pending')
            .limit(1);

          if (requestError) {
            console.error('Failed to load admin request:', requestError);
          } else {
            upgradeRequestExists = Boolean(requestData?.length);
          }
        }

        setHasUpgradeRequest(upgradeRequestExists);

        if (profileData.role === 'admin' || profileData.role === 'superuser') {
          setStatus('member');
          return;
        }

        if (profileData.identity_type !== 'guest') {
          setStatus('member');
          return;
        }

        setStatus('guest');
      } catch (error) {
        console.error('Failed to load profile:', error);
        setStatus('anonymous');
      }
    };

    loadProfile();
  }, []);

  const canSubmit = useMemo(() => {
    return formData.evidence.trim().length > 0;
  }, [formData.evidence]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!canSubmit || submitting) return;

    try {
      setSubmitting(true);
      setNotice(null);

      const result = await submitGuestIdentityUpgradeRequest({
        evidence: formData.evidence,
        nickname: profile?.nickname || null,
      });

      if (!result.success) {
        throw new Error(result.error || 'Failed to submit request.');
      }

      setSubmitted(true);
      setHasUpgradeRequest(true);
      setNotice({ type: 'success', message: '您的申请已上交，请等待审核' });
      setFormData((prev) => ({ ...prev, evidence: '' }));
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Failed to submit request.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return null;
  }

  if (hasUpgradeRequest) {
    return (
      <div className="page-content scene-page">
        <section className="scene-panel" style={{ padding: '2rem' }}>
          <p className="scene-kicker">校友身份核验</p>
          <h1 className="scene-title">我们正在努力处理中&lt;&gt;</h1>
          <p className="scene-subtitle">请耐心等待我们的审核处理完毕哦，注意查看消息提示AwA</p>
        </section>
      </div>
    );
  }

  if (status === 'anonymous') {
    return (
      <div className="page-content scene-page">
        <section className="scene-panel" style={{ padding: '2rem' }}>
          <p className="scene-kicker">校友身份核验</p>
          <h1 className="scene-title">需要登录</h1>
          <p className="scene-subtitle">请先登录，再进行校友身份核验</p>
          <div className="scene-actions">
            <Link
              to="/login"
              className="scene-button primary"
              state={{ from: fromPath }}
              onClick={(event) => triggerIris?.(event, '/login', { state: { from: fromPath } })}
            >
              Sign in
            </Link>
            <Link
              to="/register"
              className="scene-button ghost"
              state={{ from: fromPath }}
              onClick={(event) => triggerIris?.(event, '/register', { state: { from: fromPath } })}
            >
              Register
            </Link>
          </div>
        </section>
      </div>
    );
  }

  if (status === 'member') {
    return (
      <div className="page-content scene-page">
        <section className="scene-panel" style={{ padding: '2rem' }}>
          <p className="scene-kicker">校友身份核验</p>
          <h1 className="scene-title">您已为校友</h1>
          <p className="scene-subtitle">
            您的校友身份已经通过！您可以申请班级日志查看，并访问班级墙了！
          </p>
          <div className="scene-actions">
            <Link
              to="/journal"
              className="scene-button primary"
              onClick={(event) => triggerIris?.(event, '/journal')}
            >
              班级日志
            </Link>
            <Link
              to="/wall"
              className="scene-button ghost"
              onClick={(event) => triggerIris?.(event, '/wall')}
            >
              班级墙
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content scene-page">
      <section className="scene-panel" style={{ padding: 'clamp(1.8rem, 4vw, 3rem)' }}>
        <p className="scene-kicker">身份验证</p>
        <h1 className="scene-title">校友身份核验</h1>
        <p className="scene-subtitle">请证明您的少儿班/八中校友身份</p>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        {!submitted && (
          <form onSubmit={handleSubmit} style={{ maxWidth: '560px', marginTop: '1.2rem' }}>
            <div className="mb-3">
              <label className="form-label">描述</label>
              <textarea
                name="evidence"
                value={formData.evidence}
                onChange={handleChange}
                className="form-control"
                rows={6}
                placeholder="您可以注明您的毕业年份、班级，也可附上一切可证明您八中校友的链接。当然，如果您事先与我们的开发人员沟通过，也可仅注明沟通对象"
                required
              />
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="submit"
                className="scene-button primary"
                disabled={!canSubmit || submitting}
              >
                {submitting ? '提交中...' : '提交申请'}
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default GuestUpdateIdentity;
