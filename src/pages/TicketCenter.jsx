import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import styles from './Wall.module.css';

const TicketCenter = () => {
  const navigate = useNavigate();
  const { targetType, targetId } = useParams();
  const [reporterName, setReporterName] = useState('');
  const [category, setCategory] = useState(() => {
    if (targetType === 'post' && targetId) return 'report_post';
    if (targetType === 'comment' && targetId) return 'report_comment';
    return '';
  });
  const [reason, setReason] = useState('');
  const [suggestion, setSuggestion] = useState('');
  const [message, setMessage] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(true);

  const isFormValid = useMemo(() => {
    return category !== '' && reason.trim().length > 0 && suggestion.trim().length > 0;
  }, [category, reason, suggestion]);

  useEffect(() => {
    const loadReporter = async () => {
      try {
        const {
          data: { user },
          error: authError,
        } = await supabase.auth.getUser();

        if (authError || !user) {
          throw new Error('用户未登录或认证失败');
        }

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('nickname')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          throw new Error('获取用户信息失败');
        }

        setReporterName(profile.nickname || '用户');
      } catch (error) {
        setMessage(error.message);
      } finally {
        setLoading(false);
      }
    };

    loadReporter();
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFormValid) {
      setMessage('请完整选择工单类别并填写 reason 与 suggestion。');
      return;
    }

    if (
      (category === 'report_post' || category === 'report_comment') &&
      (!targetType || !targetId)
    ) {
      setMessage('缺少被举报的目标信息。');
      return;
    }

    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        throw new Error('用户未登录或认证失败');
      }

      const now = new Date().toISOString();
      const isReportPost = category === 'report_post';
      const isReportComment = category === 'report_comment';
      const payload = {
        reporter_id: user.id,
        category,
        title: reason.trim(),
        description: suggestion.trim(),
        related_resource_type: isReportPost ? 'post' : isReportComment ? 'comment' : null,
        related_resource_id: isReportPost || isReportComment ? targetId || null : null,
        metadata:
          isReportPost || isReportComment ? { target_type: targetType, target_id: targetId } : null,
        status: 'pending',
        created_at: now,
        updated_at: now,
      };

      const { error: insertError } = await supabase.from('support_tickets').insert(payload);

      if (insertError) {
        throw new Error(insertError.message || '提交工单失败');
      }

      setSubmitted(true);
      setMessage('提交成功。');
    } catch (error) {
      setMessage(`提交失败：${error.message}`);
    }
  };

  if (submitted) {
    return (
      <div className={`page-content scene-page ${styles.pageContent}`}>
        <section className={`scene-panel ${styles.wallPanel}`}>
          <div className={styles.wallHeader}>
            <p className="scene-kicker">工单中心</p>
            <h1 className="scene-title">提交成功</h1>
            <p className="scene-subtitle">我们已收到你的工单。</p>
          </div>
          {message && (
            <div className="alert alert-success" role="alert">
              {message}
            </div>
          )}
          <button className="btn btn-outline-secondary" onClick={() => navigate(-1)}>
            返回
          </button>
        </section>
      </div>
    );
  }

  return (
    <div className={`page-content scene-page ${styles.pageContent}`}>
      <section className={`scene-panel ${styles.wallPanel}`}>
        <div className={styles.wallHeader}>
          <p className="scene-kicker">工单中心</p>
          <h1 className="scene-title">提交工单</h1>
          <p className="scene-subtitle">请填写以下信息并提交。</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-3" style={{ maxWidth: '560px' }}>
          <div className="mb-3">
            <label className="form-label">发起人</label>
            <input
              type="text"
              value={loading ? '加载中...' : reporterName}
              className="form-control"
              disabled
            />
          </div>
          <div className="mb-3">
            <label className="form-label">工单类别</label>
            <select
              value={category}
              onChange={(event) => setCategory(event.target.value)}
              className="form-select"
            >
              <option value="">--请选择--</option>
              <option value="report_post">举报帖子</option>
              <option value="report_comment">举报评论</option>
              <option value="other">其他问题</option>
            </select>
          </div>
          <div className="mb-3">
            <label className="form-label">reason（必填）</label>
            <input
              type="text"
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              className="form-control"
              placeholder="请输入举报理由标题"
              required
            />
          </div>
          <div className="mb-3">
            <label className="form-label">suggestion（必填）</label>
            <textarea
              value={suggestion}
              onChange={(event) => setSuggestion(event.target.value)}
              className="form-control"
              rows={5}
              placeholder="请描述具体原因"
              required
            />
          </div>

          <div className="d-flex gap-2">
            <button type="submit" className="btn btn-danger" disabled={!isFormValid}>
              提交
            </button>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate(-1)}
            >
              返回
            </button>
          </div>

          {message && !submitted && (
            <div className="alert alert-warning mt-3" role="alert">
              {message}
            </div>
          )}
        </form>
      </section>
    </div>
  );
};

export default TicketCenter;
