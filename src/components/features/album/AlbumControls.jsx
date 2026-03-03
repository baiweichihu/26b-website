import React, { useState, useRef } from 'react';
import styles from './AlbumControls.module.css';

const AlbumControls = ({
  currentFolder,
  searchKeyword,
  onSearch,
  onCreateFolder,
  onUploadPhoto,
  onDeleteFolder,
  canDeleteFolder,
  onNavigateBack,
  onNavigateForward,
  canNavigateForward,
  actionLoading,
  albumStats,
  isSearching
}) => {
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [showUploadPhoto, setShowUploadPhoto] = useState(false);
  const [showDeleteFolderConfirm, setShowDeleteFolderConfirm] = useState(false);
  const [folderTitle, setFolderTitle] = useState('');
  const [photoTitle, setPhotoTitle] = useState('');
  const [selectedFiles, setSelectedFiles] = useState([]);
  const fileInputRef = useRef(null);

  const handleCreateFolderSubmit = (e) => {
    e.preventDefault();
    if (folderTitle.trim()) {
      onCreateFolder(folderTitle.trim());
      setFolderTitle('');
      setShowCreateFolder(false);
    }
  };

  const handleUploadPhotoSubmit = (e) => {
    e.preventDefault();
    if (selectedFiles.length > 0) {
      // 检查文件大小
      const oversizedFiles = [];
      for (let i = 0; i < selectedFiles.length; i++) {
        if (selectedFiles[i].size > 50 * 1024 * 1024) {
          oversizedFiles.push(selectedFiles[i].name);
        }
      }
      
      if (oversizedFiles.length > 0) {
        alert(`以下文件超过50MB限制:\n${oversizedFiles.join('\n')}\n\n请选择较小的文件。`);
        return;
      }
      
      onUploadPhoto(selectedFiles, photoTitle.trim());
      setPhotoTitle('');
      setSelectedFiles([]);
      setShowUploadPhoto(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleFileSelect = () => {
    // 重置文件输入框，确保每次选择都能触发onChange事件
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      setSelectedFiles(Array.from(files));
      // 单文件时可自动带入标题，多文件不自动填充
      if (files.length === 1 && !photoTitle.trim()) {
        setPhotoTitle(files[0].name.split('.')[0]);
      }
    }
  };

  const handleSearchChange = (e) => {
    onSearch(e.target.value);
  };

  const handleDeleteFolderConfirm = () => {
    setShowDeleteFolderConfirm(false);
    onDeleteFolder?.();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatPath = (path) => {
    if (!path) return 'Home';
    return `Home${path}`;
  };

  return (
    <div className={styles.controlsPanel}>
      <div className={styles.headerSection}>
        <div className={styles.breadcrumb}>
          {currentFolder ? (
            <>
              <div className={styles.navButtons}>
                <button 
                  className={styles.backButton}
                  onClick={onNavigateBack}
                  title="返回上一级"
                >
                  <i className="fas fa-arrow-left"></i>
                </button>
                <button
                  className={styles.backButton}
                  onClick={onNavigateForward}
                  title="下一级"
                  disabled={!canNavigateForward}
                >
                  <i className="fas fa-arrow-right"></i>
                </button>
              </div>
              <div className={styles.folderMetaLine}>
                <span className={styles.folderName}>{currentFolder.title}</span>
                <span className={styles.folderDate}>{formatDate(currentFolder.created_at)}</span>
                <span className={styles.folderPath}>{formatPath(currentFolder.path)}</span>
              </div>
            </>
          ) : (
            <h2 className={styles.pageTitle}>
              <i className="fas fa-images me-2"></i>
              班级相册
            </h2>
          )}
        </div>

        <div className={styles.searchSection}>
          <div className={styles.searchBox}>
            <i className="fas fa-search"></i>
            <input
              type="text"
              placeholder="搜索媒体..."
              value={searchKeyword}
              onChange={handleSearchChange}
              className={styles.searchInput}
            />
            {searchKeyword && (
              <button 
                className={styles.clearSearch}
                onClick={() => onSearch('')}
                title="清除搜索"
              >
                <i className="fas fa-times"></i>
              </button>
            )}
          </div>
        </div>
      </div>

      <div className={styles.statsSection}>
        {!isSearching && (
          <div className={styles.stats}>
            <div className={styles.statItem}>
              <i className="fas fa-folder"></i>
              <span>{albumStats.totalFolders} 个文件夹</span>
            </div>
            <div className={styles.statItem}>
              <i className="fas fa-image"></i>
              <span>{albumStats.totalPhotos} 个媒体</span>
            </div>
            <div className={styles.statItem}>
              <i className="fas fa-heart"></i>
              <span>{albumStats.totalLikes} 个点赞</span>
            </div>
          </div>
        )}

        <div className={styles.actionButtons}>
          <button
            className={`btn btn-primary ${styles.actionButton}`}
            onClick={() => setShowCreateFolder(true)}
            disabled={actionLoading}
          >
            <i className="fas fa-folder-plus me-2"></i>
            新建文件夹
          </button>

          {canDeleteFolder && (
            <button
              className={`btn ${styles.deleteFolderButton} ${styles.actionButton}`}
              onClick={() => setShowDeleteFolderConfirm(true)}
              disabled={actionLoading}
              title="删除当前文件夹"
            >
              <i className="fas fa-trash me-2"></i>
              删除文件夹
            </button>
          )}
          
          <button
            className={`btn btn-success ${styles.actionButton}`}
            onClick={() => setShowUploadPhoto(true)}
            disabled={actionLoading || !currentFolder}
            title={!currentFolder ? '请在文件夹内上传媒体' : '上传媒体'}
          >
            <i className="fas fa-upload me-2"></i>
            上传媒体
          </button>
        </div>
      </div>

      {showCreateFolder && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>新建文件夹</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowCreateFolder(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleCreateFolderSubmit}>
              <div className="mb-3">
                <label className="form-label">文件夹名称</label>
                <input
                  type="text"
                  className="form-control"
                  value={folderTitle}
                  onChange={(e) => setFolderTitle(e.target.value)}
                  placeholder="输入文件夹名称"
                  required
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowCreateFolder(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={!folderTitle.trim() || actionLoading}
                >
                  {actionLoading ? '创建中...' : '创建'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showUploadPhoto && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>上传媒体</h3>
              <button 
                className={styles.closeButton}
                onClick={() => setShowUploadPhoto(false)}
              >
                <i className="fas fa-times"></i>
              </button>
            </div>
            <form onSubmit={handleUploadPhotoSubmit}>
              <div className="mb-3">
                <label className="form-label">选择媒体（图片/视频，可多选，每个文件最大50MB）</label>
                <div className={styles.fileInputWrapper}>
                  <button
                    type="button"
                    className="btn btn-outline-secondary w-100"
                    onClick={handleFileSelect}
                  >
                    <i className="fas fa-images me-2"></i>
                    选择媒体文件（可多选）
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*,video/*"
                    multiple
                    className="d-none"
                    onChange={handleFileChange}
                  />
                </div>
                {selectedFiles.length > 0 && (
                  <div className={styles.fileList}>
                    <div className={styles.fileListHeader}>
                      <span>已选择 {selectedFiles.length} 个文件：</span>
                    </div>
                    {selectedFiles.map((file, index) => (
                      <div key={index} className={styles.fileItem}>
                        <i className={`fas ${file.type.startsWith('video/') ? 'fa-file-video' : 'fa-file-image'} me-2`}></i>
                        <span className={styles.fileName}>{file.name}</span>
                        <span className={styles.fileSize}>
                          ({(file.size / 1024 / 1024).toFixed(2)} MB)
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <div className="mb-3">
                <label className="form-label">媒体标题</label>
                <input
                  type="text"
                  className="form-control"
                  value={photoTitle}
                  onChange={(e) => setPhotoTitle(e.target.value)}
                  placeholder="输入媒体标题"
                  disabled={selectedFiles.length > 1}
                />
              </div>
              <div className={styles.modalActions}>
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowUploadPhoto(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={!fileInputRef.current?.files?.[0] || actionLoading}
                >
                  {actionLoading ? '上传中...' : '上传媒体'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showDeleteFolderConfirm && (
        <div className={styles.modalOverlay}>
          <div className={styles.modal}>
            <div className={styles.modalHeader}>
              <h3>确认删除</h3>
              <button className={styles.closeButton} onClick={() => setShowDeleteFolderConfirm(false)}>
                <i className="fas fa-times"></i>
              </button>
            </div>
            <p>确定要删除这个媒体吗？此操作不可撤销。</p>
            <div className={styles.modalActions}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setShowDeleteFolderConfirm(false)}
              >
                取消
              </button>
              <button
                type="button"
                className={`btn ${styles.deleteFolderButton}`}
                onClick={handleDeleteFolderConfirm}
                disabled={actionLoading}
              >
                删除
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AlbumControls;