import React, { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { createPost } from '../../services/postService';
import NoticeBox from '../../components/widgets/NoticeBox';
import styles from './Wall.module.css';

const CreatePost = () => {
  const navigate = useNavigate();
  const [content, setContent] = useState('');
  const [title, setTitle] = useState('');
  const [mediaUrls, setMediaUrls] = useState('');
  const [mediaFiles, setMediaFiles] = useState([]);
  const [visibility, setVisibility] = useState('public');
  const [isAnonymous, setIsAnonymous] = useState(false);
  const [notice, setNotice] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [hasFileError, setHasFileError] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    const checkPermission = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        // Not logged in handled by service or AuthGate, but good to check
        return;
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('is_banned')
        .eq('id', user.id)
        .single();

      if (profile?.is_banned) {
        window.alert('你已被禁言');
        navigate('/wall');
      }
    };

    checkPermission();
  }, [navigate]);

  const allowedTypes = new Set([
    'image/jpeg',
    'image/png',
    'image/webp',
    'image/gif',
    'video/mp4',
    'video/webm',
    'video/quicktime',
  ]);
  const maxFileSizeBytes = 20 * 1024 * 1024;
  const maxTitleLength = 20;
  const maxContentLength = 2000;
  const maxMediaCount = 5;

  const isFormValid = useMemo(() => {
    const trimmedTitle = title.trim();
    const trimmedContent = content.trim();
    return (
      trimmedTitle.length > 0 &&
      trimmedTitle.length <= maxTitleLength &&
      trimmedContent.length > 0 &&
      trimmedContent.length <= maxContentLength
    );
  }, [title, content, maxTitleLength, maxContentLength]);

  const validateFiles = (files) => {
    const validFiles = [];
    const errors = [];
    if (files.length > maxMediaCount) {
      errors.push(`一次最多上传 ${maxMediaCount} 个媒体文件`);
      return { validFiles, errors };
    }
    for (const file of files) {
      if (!allowedTypes.has(file.type)) {
        errors.push(`文件类型不支持: ${file.name}`);
        continue;
      }
      if (file.size > maxFileSizeBytes) {
        errors.push(`文件过大(>20MB): ${file.name}`);
        continue;
      }
      validFiles.push(file);
    }
    return { validFiles, errors };
  };

  const parseMediaUrls = (value) => {
    return value
      .split(/\n+/)
      .map((item) => item.trim())
      .filter(Boolean);
  };

  const validateMediaUrls = (urls) => {
    const invalidUrls = [];
    const validUrls = [];
    for (const url of urls) {
      try {
        const parsed = new URL(url);
        if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
          invalidUrls.push(url);
          continue;
        }
        validUrls.push(url);
      } catch {
        invalidUrls.push(url);
      }
    }
    return { validUrls, invalidUrls };
  };

  const uploadFiles = async (files) => {
    if (files.length === 0) return [];

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();
    if (authError || !user) {
      throw new Error('用户未登录或认证失败');
    }

    const bucket = supabase.storage.from('post-media');
    const uploadedUrls = [];
    const totalFiles = files.length;
    let completed = 0;

    for (const file of files) {
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = `posts/${user.id}/${Date.now()}_${safeName}`;
      const { error: uploadError } = await bucket.upload(filePath, file, {
        contentType: file.type,
      });

      if (uploadError) {
        throw new Error(`上传失败: ${uploadError.message}`);
      }

      const { data: publicUrlData } = bucket.getPublicUrl(filePath);
      if (publicUrlData?.publicUrl) {
        uploadedUrls.push(publicUrlData.publicUrl);
      }

      completed += 1;
      setUploadProgress(Math.round((completed / totalFiles) * 100));
    }

    return uploadedUrls;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!isFormValid) {
      setNotice({ type: 'error', message: '标题与内容不能为空。' });
      return;
    }

    if (hasFileError) {
      const errorText = '请移除不符合要求的媒体文件后再提交。';
      setNotice({ type: 'error', message: errorText });
      return;
    }

    const { validFiles: recheckedFiles, errors: fileErrors } = validateFiles(mediaFiles);
    if (fileErrors.length > 0) {
      const errorText = fileErrors.join('；');
      setNotice({ type: 'error', message: errorText });
      return;
    }

    const parsedMediaUrls = parseMediaUrls(mediaUrls);
    const { validUrls, invalidUrls } = validateMediaUrls(parsedMediaUrls);
    if (invalidUrls.length > 0) {
      const errorText = `以下链接无效: ${invalidUrls.join('；')}`;
      setNotice({ type: 'error', message: errorText });
      return;
    }

    const totalMediaCount = recheckedFiles.length + validUrls.length;
    if (totalMediaCount > maxMediaCount) {
      const errorText = `媒体总数不能超过 ${maxMediaCount} 个（当前 ${totalMediaCount} 个）`;
      setNotice({ type: 'error', message: errorText });
      return;
    }

    try {
      setSubmitting(true);
      setNotice(null);

      setUploading(true);
      setUploadProgress(0);
      const uploadedUrls = await uploadFiles(recheckedFiles);
      setUploading(false);
      setUploadProgress(100);

      const finalMediaUrls = [...uploadedUrls, ...validUrls];

      const result = await createPost({
        title: title.trim(),
        content: content.trim(),
        media_urls: finalMediaUrls,
        visibility,
        is_anonymous: isAnonymous,
      });

      if (!result.success) {
        throw new Error(result.error || '发布失败');
      }

      setSubmitted(true);
    } catch (error) {
      setUploading(false);
      setUploadProgress(0);
      setNotice({ type: 'error', message: error.message });
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className={`page-content scene-page ${styles.pageContent}`}>
        <section className={`scene-panel ${styles.wallPanel}`}>
          <div className={styles.wallHeader}>
            <p className="scene-kicker">发布帖子</p>
            <h1 className="scene-title">发布成功</h1>
          </div>
          <button className="scene-button ghost" onClick={() => navigate(-1)}>
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
          <p className="scene-kicker">发布帖子</p>
          <h1 className="scene-title">填写帖子信息</h1>
          <p className="scene-subtitle">标题与内容为必填项</p>
        </div>

        <form onSubmit={handleSubmit} className="mt-3" style={{ maxWidth: '600px' }}>
          <div className="mb-3">
            <label className="form-label">标题(*)</label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value.slice(0, maxTitleLength))}
              className="form-control"
              placeholder="请输入帖子标题"
              maxLength={maxTitleLength}
              required
            />
            <div className="form-text">最多 {maxTitleLength} 字</div>
          </div>
          <div className="mb-3">
            <label className="form-label">内容(*)</label>
            <textarea
              value={content}
              onChange={(event) => setContent(event.target.value.slice(0, maxContentLength))}
              className="form-control"
              rows={6}
              placeholder="请输入帖子内容"
              maxLength={maxContentLength}
              required
            />
            <div className="form-text">最多 {maxContentLength} 字</div>
          </div>
          <div className="mb-3">
            <label className="form-label">媒体链接</label>
            <textarea
              value={mediaUrls}
              onChange={(event) => setMediaUrls(event.target.value)}
              className="form-control"
              rows={3}
              placeholder={`多个链接请换行分开，如：\nhttps://a.com/1.jpg\nhttps://a.com/2.jpg`}
            />
            <div className="form-text">多个链接请换行分开，最多 {maxMediaCount} 个。</div>
          </div>
          <div className="mb-3">
            <label className="form-label">上传媒体文件</label>
            <input
              type="file"
              multiple
              accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime"
              className="form-control"
              ref={fileInputRef}
              onChange={(event) => {
                const files = Array.from(event.target.files || []);
                const parsedLinks = parseMediaUrls(mediaUrls);
                const { validFiles, errors } = validateFiles(files);
                if (validFiles.length + parsedLinks.length > maxMediaCount) {
                  errors.push(`媒体总数不能超过 ${maxMediaCount} 个`);
                }
                if (errors.length > 0) {
                  const errorText = errors.join('；');
                  setMediaFiles([]);
                  setHasFileError(true);
                  if (fileInputRef.current) {
                    fileInputRef.current.value = '';
                  }
                  setNotice({ type: 'error', message: errorText });
                } else {
                  setMediaFiles(validFiles);
                  setHasFileError(false);
                  setNotice(null);
                }
              }}
            />
            <div className="form-text">
              支持 JPG/PNG/WEBP/GIF/MP4/WEBM/MOV，单文件不超过 20MB。一次最多上传 {maxMediaCount}{' '}
              个。
            </div>
          </div>
          {uploading && (
            <div className="mb-3">
              <label className="form-label">上传进度</label>
              <div className="progress">
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${uploadProgress}%` }}
                  aria-valuenow={uploadProgress}
                  aria-valuemin={0}
                  aria-valuemax={100}
                >
                  {uploadProgress}%
                </div>
              </div>
            </div>
          )}
          <div className="mb-3">
            <label className="form-label">可见范围</label>
            <select
              value={visibility}
              onChange={(event) => setVisibility(event.target.value)}
              className="form-select"
            >
              <option value="public">所有人可见</option>
              <option value="alumni_only">校友可见</option>
              <option value="classmate_only">本班同学可见</option>
              <option value="private">仅自己可见</option>
            </select>
          </div>
          <div className="form-check mb-3">
            <input
              className="form-check-input"
              type="checkbox"
              id="isAnonymous"
              checked={isAnonymous}
              onChange={(event) => setIsAnonymous(event.target.checked)}
            />
            <label className="form-check-label" htmlFor="isAnonymous">
              匿名发布
            </label>
          </div>

          <div className="d-flex gap-2">
            <button
              type="submit"
              className="scene-button primary"
              disabled={!isFormValid || submitting || uploading || hasFileError}
            >
              {submitting || uploading ? '发布中...' : '发布'}
            </button>
            <button type="button" className="scene-button ghost" onClick={() => navigate(-1)}>
              取消
            </button>
          </div>

          {notice && <NoticeBox type={notice.type} message={notice.message} />}
        </form>
      </section>
    </div>
  );
};

export default CreatePost;
