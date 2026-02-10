import React, { useEffect, useMemo, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import NoticeBox from '../components/widgets/NoticeBox';
import { useIrisTransition } from '../components/ui/IrisTransition';

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
    desiredIdentity: 'alumni',
    evidence: '',
  });
  const [notice, setNotice] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

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

      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('You are not signed in.');
      }

      const now = new Date().toISOString();
      const payload = {
        requester_id: user.id,
        request_type: 'upgrade_identity',
        target_id: null,
        evidence: JSON.stringify({
          desired_identity: formData.desiredIdentity,
          message: formData.evidence.trim(),
          nickname: profile?.nickname || null,
        }),
        requested_permissions: null,
        status: 'pending',
        created_at: now,
      };

      const { error: insertError } = await supabase.from('admin_requests').insert(payload);

      if (insertError) {
        throw new Error(insertError.message || 'Failed to submit request.');
      }

      setSubmitted(true);
      setNotice({ type: 'success', message: 'Request submitted. Please wait for review.' });
      setFormData((prev) => ({ ...prev, evidence: '' }));
    } catch (error) {
      setNotice({ type: 'error', message: error.message || 'Failed to submit request.' });
    } finally {
      setSubmitting(false);
    }
  };

  if (status === 'loading') {
    return (
      <div className="page-content scene-page">
        <section className="scene-panel" style={{ padding: '2rem' }}>
          <p className="scene-kicker">Identity upgrade</p>
          <h1 className="scene-title">Checking access</h1>
          <p className="scene-subtitle">Please wait while we verify your account.</p>
        </section>
      </div>
    );
  }

  if (status === 'anonymous') {
    return (
      <div className="page-content scene-page">
        <section className="scene-panel" style={{ padding: '2rem' }}>
          <p className="scene-kicker">Identity upgrade</p>
          <h1 className="scene-title">Sign in required</h1>
          <p className="scene-subtitle">Please sign in to request an identity upgrade.</p>
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
          <p className="scene-kicker">Identity upgrade</p>
          <h1 className="scene-title">Already verified</h1>
          <p className="scene-subtitle">
            Your account is already verified. You can access journals and the class wall.
          </p>
          <div className="scene-actions">
            <Link
              to="/journal"
              className="scene-button primary"
              onClick={(event) => triggerIris?.(event, '/journal')}
            >
              Open journals
            </Link>
            <Link
              to="/wall"
              className="scene-button ghost"
              onClick={(event) => triggerIris?.(event, '/wall')}
            >
              Go to wall
            </Link>
          </div>
        </section>
      </div>
    );
  }

  return (
    <div className="page-content scene-page">
      <section className="scene-panel" style={{ padding: 'clamp(1.8rem, 4vw, 3rem)' }}>
        <p className="scene-kicker">Identity upgrade</p>
        <h1 className="scene-title">Request alumni access</h1>
        <p className="scene-subtitle">
          Tell us about your connection to Class 26B and share any proof we can verify.
        </p>

        {notice && <NoticeBox type={notice.type} message={notice.message} />}

        {!submitted && (
          <form onSubmit={handleSubmit} style={{ maxWidth: '560px', marginTop: '1.2rem' }}>
            <div className="mb-3">
              <label className="form-label">Desired identity</label>
              <select
                name="desiredIdentity"
                value={formData.desiredIdentity}
                onChange={handleChange}
                className="form-select"
              >
                <option value="alumni">Alumni</option>
                <option value="classmate">Classmate</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">Evidence</label>
              <textarea
                name="evidence"
                value={formData.evidence}
                onChange={handleChange}
                className="form-control"
                rows={6}
                placeholder="Include graduation year, class, and any proof links."
                required
              />
              <div className="form-text">
                Share links to photos, yearbook pages, or other references.
              </div>
            </div>
            <div className="d-flex gap-2 flex-wrap">
              <button
                type="submit"
                className="scene-button primary"
                disabled={!canSubmit || submitting}
              >
                {submitting ? 'Submitting...' : 'Submit request'}
              </button>
              <Link
                to="/wall"
                className="scene-button ghost"
                onClick={(event) => triggerIris?.(event, '/wall')}
              >
                Back to wall
              </Link>
            </div>
          </form>
        )}
      </section>
    </div>
  );
};

export default GuestUpdateIdentity;
