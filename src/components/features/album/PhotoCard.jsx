import React, { useEffect, useMemo, useRef, useState } from 'react';
import styles from './PhotoCard.module.css';

const VIDEO_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v', '.avi', '.mkv'];

const resolveMediaType = (media) => {
  const source = (media?.url || media?.file_path || '').toLowerCase();
  if (VIDEO_EXTENSIONS.some((ext) => source.includes(ext))) {
    return 'video';
  }
  return 'image';
};

const PhotoCard = ({
  photo,
  allFolders = [],
  currentFolderId,
  currentUserId,
  isSuperuser,
  onToggleLike,
  onRenamePhoto,
  onMovePhoto,
  onDeletePhoto,
  likeLoading,
  actionLoading,
}) => {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [showMenu, setShowMenu] = useState(false);
  const [showRenameModal, setShowRenameModal] = useState(false);
  const [showMoveModal, setShowMoveModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [renameValue, setRenameValue] = useState(photo.title || '');
  const [moveTargetId, setMoveTargetId] = useState('');
  const menuRef = useRef(null);
  const mediaType = resolveMediaType(photo);
  const movableFolders = useMemo(() => {
    return (allFolders || []).filter((folder) => folder.id !== photo.folder_id);
  }, [allFolders, photo.folder_id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setShowMenu(false);
      }
    };

    if (showMenu) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showMenu]);

  const handleImageLoad = () => {
    setImageLoaded(true);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoaded(true);
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    if (!likeLoading) {
      onToggleLike(photo.id);
    }
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    setShowMenu(false);
    setShowDeleteConfirm(true);
  };

  const handleRenameClick = (e) => {
    e.stopPropagation();
    setRenameValue(photo.title || '');
    setShowMenu(false);
    setShowRenameModal(true);
  };

  const handleMoveClick = (e) => {
    e.stopPropagation();
    const fallbackFolderId = movableFolders[0]?.id || '';
    setMoveTargetId(fallbackFolderId);
    setShowMenu(false);
    setShowMoveModal(true);
  };

  const handleSubmitRename = async () => {
    const nextName = (renameValue || '').trim();
    if (!nextName || !onRenamePhoto) return;
    await onRenamePhoto(photo.id, nextName);
    setShowRenameModal(false);
  };

  const handleSubmitMove = async () => {
    if (!moveTargetId || !onMovePhoto) return;
    await onMovePhoto(photo.id, moveTargetId);
    setShowMoveModal(false);
  };

  const handleConfirmDelete = () => {
    onDeletePhoto(photo.id);
    setShowDeleteConfirm(false);
  };

  const handleCancelDelete = () => {
    setShowDeleteConfirm(false);
  };

  const handleImageClick = () => {
    setShowFullImage(true);
  };

  const handleCloseFullImage = () => {
    setShowFullImage(false);
  };

  const formatFolderPath = (folder) => {
    if (!folder) return 'Home';
    if (!folder.path) return folder.title || 'Home';
    return `Home${folder.path}`;
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const likeCount = photo.album_likes?.[0]?.count || 0;
  const isLiked = currentUserId ? photo.user_liked || false : false;
  const ownerId = photo.uploader_id || photo.user_id;
  const canManageMedia = !!currentUserId && (ownerId === currentUserId || !!isSuperuser);
  const showActions = canManageMedia;
  const currentFolderRecord = (allFolders || []).find((folder) => folder.id === (photo.folder_id || currentFolderId));
  const folderPathSource = photo?.folder?.path
    ? { path: photo.folder.path, title: photo.folder.title }
    : currentFolderRecord;
  const uploaderName = photo?.uploader?.nickname || '未知用户';
  const dimensionsText = photo?.width > 0 && photo?.height > 0 ? `${photo.width} × ${photo.height}` : '未知';
  const mediaPath = formatFolderPath(folderPathSource);

  return (
    <>
      <div className={`${styles.photoCard} ${showMenu ? styles.menuOpen : ''}`}>
        {showActions && (
          <div className={styles.actionMenu} ref={menuRef}>
            <button
              className={styles.menuButton}
              onClick={(e) => {
                e.stopPropagation();
                setShowMenu((prev) => !prev);
              }}
              title="更多操作"
              disabled={actionLoading}
            >
              ···
            </button>

            {showMenu && (
              <div className={styles.menuDropdown} onClick={(e) => e.stopPropagation()}>
                <button type="button" className={styles.menuItem} onClick={handleRenameClick} disabled={actionLoading}>
                  重命名
                </button>
                <button
                  type="button"
                  className={styles.menuItem}
                  onClick={handleMoveClick}
                  disabled={actionLoading || movableFolders.length === 0}
                >
                  移动
                </button>
                <button type="button" className={`${styles.menuItem} ${styles.dangerItem}`} onClick={handleDeleteClick} disabled={actionLoading}>
                  删除
                </button>
              </div>
            )}
          </div>
        )}

        <button
          className={`${styles.likeButton} ${isLiked ? styles.liked : ''}`}
          onClick={handleLikeClick}
          disabled={likeLoading}
          title={isLiked ? '取消点赞' : '点赞'}
        >
          <i className="fas fa-heart"></i>
          <span className={styles.likeCount}>{likeCount}</span>
        </button>

        <div className={styles.photoImageWrapper} onClick={handleImageClick}>
          {!imageLoaded && !imageError && mediaType === 'image' && (
            <div className={styles.imagePlaceholder}>
              <i className="fas fa-image"></i>
            </div>
          )}

          {imageError && mediaType === 'image' ? (
            <div className={styles.imageError}>
              <i className="fas fa-exclamation-triangle"></i>
              <span>媒体加载失败</span>
            </div>
          ) : mediaType === 'video' ? (
            <video className={styles.photoImage} src={photo.url} muted playsInline preload="metadata" />
          ) : (
            <img
              src={photo.url}
              alt={photo.title}
              className={styles.photoImage}
              onLoad={handleImageLoad}
              onError={handleImageError}
              style={{ display: imageLoaded ? 'block' : 'none' }}
            />
          )}

        </div>
        
        <div className={styles.photoInfo}>
          <h4 className={styles.photoTitle} title={photo.title}>{photo.title}</h4>
          <div className={styles.photoDate}>{formatDate(photo.created_at)}</div>
        </div>
      </div>

      {showFullImage && (
        <div className={styles.fullImageOverlay} onClick={handleCloseFullImage}>
          <div className={styles.fullImageContainer} onClick={(e) => e.stopPropagation()}>
            <button 
              className={styles.closeButton}
              onClick={handleCloseFullImage}
              title="关闭"
            >
              <i className="fas fa-times"></i>
            </button>
            
            <div className={styles.fullImageContent}>
              {mediaType === 'video' ? (
                <video src={photo.url} className={styles.fullImage} controls autoPlay playsInline />
              ) : (
                <img
                  src={photo.url}
                  alt={photo.title}
                  className={styles.fullImage}
                />
              )}
              
              <div className={styles.fullImageInfo}>
                <h3>{photo.title}</h3>
                {photo.description && (
                  <p>{photo.description}</p>
                )}
                <div className={styles.mediaDetails}>
                  <div className={styles.mediaDetailItem}>上传者：{uploaderName}</div>
                  <div className={styles.mediaDetailItem}>大小：{dimensionsText}</div>
                  <div className={styles.mediaDetailItem} title={mediaPath}>路径：{mediaPath}</div>
                </div>
                <div className={styles.fullImageStats}>
                  <span>
                    <i className="fas fa-heart"></i>
                    {likeCount} 个点赞
                  </span>
                  <span>
                    <i className="fas fa-calendar"></i>
                    {formatDate(photo.created_at)}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showDeleteConfirm && (
        <div className={styles.confirmOverlay} onClick={handleCancelDelete}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.confirmTitle}>确认删除</h4>
            <p className={styles.confirmText}>确定要删除这个媒体吗？此操作不可撤销。</p>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.confirmCancel} onClick={handleCancelDelete}>
                取消
              </button>
              <button type="button" className={styles.confirmDelete} onClick={handleConfirmDelete}>
                删除
              </button>
            </div>
          </div>
        </div>
      )}

      {showRenameModal && (
        <div className={styles.confirmOverlay} onClick={() => setShowRenameModal(false)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.confirmTitle}>重命名媒体</h4>
            <p className={styles.confirmText}>请输入新的媒体名称。</p>
            <input
              type="text"
              className={styles.dialogInput}
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="输入新名称"
              autoFocus
            />
            <div className={styles.confirmActions}>
              <button type="button" className={styles.confirmCancel} onClick={() => setShowRenameModal(false)}>
                取消
              </button>
              <button
                type="button"
                className={styles.confirmPrimary}
                onClick={handleSubmitRename}
                disabled={!renameValue.trim() || actionLoading}
              >
                确认重命名
              </button>
            </div>
          </div>
        </div>
      )}

      {showMoveModal && (
        <div className={styles.confirmOverlay} onClick={() => setShowMoveModal(false)}>
          <div className={styles.confirmDialog} onClick={(e) => e.stopPropagation()}>
            <h4 className={styles.confirmTitle}>移动媒体</h4>
            <p className={styles.confirmText}>
              当前目录：{formatFolderPath(currentFolderRecord)}
            </p>
            <select
              className={styles.dialogSelect}
              value={moveTargetId}
              onChange={(e) => setMoveTargetId(e.target.value)}
            >
              {movableFolders.map((folder) => (
                <option key={folder.id} value={folder.id}>
                  {formatFolderPath(folder)}
                </option>
              ))}
            </select>
            <div className={styles.confirmActions}>
              <button type="button" className={styles.confirmCancel} onClick={() => setShowMoveModal(false)}>
                取消
              </button>
              <button
                type="button"
                className={styles.confirmPrimary}
                onClick={handleSubmitMove}
                disabled={!moveTargetId || actionLoading || movableFolders.length === 0}
              >
                确认移动
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default PhotoCard;