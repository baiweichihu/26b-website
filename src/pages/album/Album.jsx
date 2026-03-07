import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import FolderCard from '../../components/features/album/FolderCard';
import PhotoCard from '../../components/features/album/PhotoCard';
import AlbumControls from '../../components/features/album/AlbumControls';
import AlbumSidebar from '../../components/features/album/AlbumSidebar';
import AlbumEmptyState from '../../components/features/album/AlbumEmptyState';
import NoticeBox from '../../components/widgets/NoticeBox';
import AuthGateOverlay from '../../components/ui/AuthGateOverlay';
import { albumService } from '../../services/albumService';
import styles from './Album.module.css';

const Album = () => {
  const navigate = useNavigate();
  const { folderId } = useParams();
  
  const [folders, setFolders] = useState([]);
  const [allFolders, setAllFolders] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [currentFolder, setCurrentFolder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [notice, setNotice] = useState(null);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [forwardTarget, setForwardTarget] = useState(null);
  const [authStatus, setAuthStatus] = useState('loading');
  const [isSuperuser, setIsSuperuser] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [likeLoadingPhotoId, setLikeLoadingPhotoId] = useState(null);

  const albumStats = useMemo(() => {
    return folders.reduce(
      (acc, folder) => {
        acc.totalPhotos += folder.photo_count || 0;
        acc.totalLikes += folder.total_likes || 0;
        return acc;
      },
      {
        totalFolders: folders.length,
        totalPhotos: 0,
        totalLikes: 0,
      }
    );
  }, [folders]);

  const loadAuthStatus = useCallback(async () => {
    try {
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        setAuthStatus('anonymous');
        setCurrentUserId(null);
        setIsSuperuser(false);
      } else {
        setCurrentUserId(user.id);

        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', user.id)
          .single();

        if (profileError || !profile) {
          setAuthStatus('anonymous');
          setIsSuperuser(false);
          return;
        }

        setIsSuperuser(profile?.role === 'superuser');

        setAuthStatus('member');
      }
    } catch (err) {
      console.error('认证状态加载失败:', err);
      setAuthStatus('anonymous');
      setIsSuperuser(false);
    }
  }, []);

  const loadFolders = useCallback(async () => {
    try {
      setLoading(true);
      // 直接使用albumService的过滤逻辑，不需要额外过滤
      const foldersData = await albumService.getFolders(folderId || null);
      
      setFolders(foldersData);
      setError(null);
    } catch (err) {
      console.error('加载文件夹失败:', err);
      setError(err.message);
      setFolders([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  const loadAllFolders = useCallback(async () => {
    try {
      const foldersData = await albumService.getAllFolders();
      setAllFolders(foldersData);
    } catch (err) {
      console.error('加载完整目录失败:', err);
    }
  }, []);

  const loadPhotos = useCallback(async () => {
    if (!folderId) return;
    
    try {
      setLoading(true);
      const photosData = await albumService.getPhotos(folderId);
      setPhotos(photosData.photos || []);
      setError(null);
    } catch (err) {
      console.error('加载图片失败:', err);
      setError(err.message);
      setPhotos([]);
    } finally {
      setLoading(false);
    }
  }, [folderId]);

  const loadCurrentFolder = useCallback(async () => {
    if (!folderId) {
      setCurrentFolder(null);
      return;
    }

    try {
      const folderData = await albumService.getFolder(folderId);
      setCurrentFolder(folderData);
    } catch (err) {
      console.error('加载当前文件夹失败:', err);
      setCurrentFolder(null);
    }
  }, [folderId]);

  const handleSearch = useCallback(async (keyword) => {
    try {
      setLoading(true);
      setSearchKeyword(keyword);
      
      if (keyword.trim()) {
        const searchResults = await albumService.searchPhotos(keyword, folderId || null);
        setPhotos(searchResults.photos || []);
        setFolders([]);
      } else {
        // 重置搜索，重新加载正常内容
        if (folderId) {
          await loadPhotos();
        } else {
          await loadFolders();
        }
      }
    } catch (err) {
      console.error('搜索失败:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [folderId, loadPhotos, loadFolders]);

  const handleToggleLike = useCallback(async (photoId) => {
    if (authStatus !== 'member') {
      setNotice({ type: 'warning', message: '请先登录后再点赞' });
      return;
    }

    const targetPhoto = photos.find((item) => item.id === photoId);
    if (!targetPhoto) {
      return;
    }

    const previousLiked = !!targetPhoto.user_liked;
    const previousCount = targetPhoto.album_likes?.[0]?.count || 0;
    const optimisticLiked = !previousLiked;
    const optimisticCount = optimisticLiked
      ? previousCount + 1
      : Math.max(previousCount - 1, 0);

    setPhotos(prevPhotos => 
      prevPhotos.map(photo => {
        if (photo.id === photoId) {
          return {
            ...photo,
            user_liked: optimisticLiked,
            album_likes: [{ count: optimisticCount }]
          };
        }
        return photo;
      })
    );

    try {
      setLikeLoadingPhotoId(photoId);
      const result = await albumService.toggleLikePhoto(photoId);

      setPhotos(prevPhotos =>
        prevPhotos.map(photo => {
          if (photo.id === photoId) {
            const confirmedLiked = !!result.liked;
            const confirmedCount = confirmedLiked
              ? previousLiked
                ? previousCount
                : previousCount + 1
              : previousLiked
                ? Math.max(previousCount - 1, 0)
                : previousCount;

            return {
              ...photo,
              user_liked: confirmedLiked,
              album_likes: [{ count: confirmedCount }]
            };
          }
          return photo;
        })
      );

      setNotice({ 
        type: 'success', 
        message: result.liked ? '点赞成功' : '取消点赞成功' 
      });
    } catch (err) {
      console.error('点赞操作失败:', err);

      setPhotos(prevPhotos =>
        prevPhotos.map(photo => {
          if (photo.id === photoId) {
            return {
              ...photo,
              user_liked: previousLiked,
              album_likes: [{ count: previousCount }]
            };
          }
          return photo;
        })
      );

      setNotice({ type: 'error', message: err.message });
    } finally {
      setLikeLoadingPhotoId(null);
    }
  }, [authStatus, photos]);

  const handleCreateFolder = useCallback(async (title) => {
    if (authStatus !== 'member') {
      setNotice({ type: 'warning', message: '请先登录后再创建文件夹' });
      return;
    }

    try {
      setActionLoading(true);
      await albumService.createFolder(title, folderId || null);
      
      setNotice({ type: 'success', message: '文件夹创建成功' });
      await Promise.all([loadFolders(), loadAllFolders()]);
    } catch (err) {
      console.error('创建文件夹失败:', err);
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [authStatus, folderId, loadFolders, loadAllFolders]);

  const handleUploadPhoto = useCallback(async (files, title) => {
    if (authStatus !== 'member') {
      setNotice({ type: 'warning', message: '请先登录后再上传媒体' });
      return;
    }

    if (!folderId) {
      setNotice({ type: 'warning', message: '请先选择文件夹' });
      return;
    }

    try {
      setActionLoading(true);
      
      // 上传多个文件
      const uploadPromises = Array.from(files).map((file, index) => {
        const fileTitle = index === 0 && title ? title : file.name.split('.')[0];
        return albumService.uploadMedia(folderId, file, fileTitle);
      });
      
      await Promise.all(uploadPromises);
      
      setNotice({ type: 'success', message: `成功上传 ${files.length} 个媒体文件` });
      await loadPhotos(); // 重新加载图片列表
    } catch (err) {
      console.error('上传媒体失败:', err);
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [authStatus, folderId, loadPhotos]);

  const handleDeletePhoto = useCallback(async (photoId) => {
    if (authStatus !== 'member') {
      setNotice({ type: 'warning', message: '请先登录后再操作' });
      return;
    }

    try {
      setActionLoading(true);
      await albumService.deletePhoto(photoId);
      
      setNotice({ type: 'success', message: '媒体删除成功' });
      await loadPhotos(); // 重新加载图片列表
    } catch (err) {
      console.error('删除媒体失败:', err);
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [authStatus, loadPhotos]);

  const handleRenamePhoto = useCallback(async (photoId, newName) => {
    if (authStatus !== 'member') {
      setNotice({ type: 'warning', message: '请先登录后再操作' });
      return;
    }

    try {
      setActionLoading(true);
      await albumService.renamePhoto(photoId, newName);

      setNotice({ type: 'success', message: '媒体重命名成功' });
      await loadPhotos();
    } catch (err) {
      console.error('重命名媒体失败:', err);
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [authStatus, loadPhotos]);

  const handleMovePhoto = useCallback(async (photoId, targetFolderId) => {
    if (authStatus !== 'member') {
      setNotice({ type: 'warning', message: '请先登录后再操作' });
      return;
    }

    try {
      setActionLoading(true);
      const result = await albumService.movePhoto(photoId, targetFolderId);

      if (result?.moved) {
        setNotice({ type: 'success', message: '媒体移动成功' });
      } else {
        setNotice({ type: 'warning', message: '媒体已在目标文件夹中' });
      }

      await Promise.all([loadPhotos(), loadFolders()]);
    } catch (err) {
      console.error('移动媒体失败:', err);
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [authStatus, loadFolders, loadPhotos]);

  const handleDeleteFolder = useCallback(async () => {
    if (authStatus !== 'member') {
      setNotice({ type: 'warning', message: '请先登录后再操作' });
      return;
    }

    if (!currentFolder?.id) {
      setNotice({ type: 'warning', message: '根目录不支持删除' });
      return;
    }

    try {
      setActionLoading(true);
      const parentId = currentFolder.parent_id;
      await albumService.deleteFolderWithMedia(currentFolder.id);

      setNotice({ type: 'success', message: '文件夹删除成功' });
      if (parentId) {
        navigate(`/album/${parentId}`);
      } else {
        navigate('/album');
      }
      await Promise.all([loadFolders(), loadAllFolders()]);
    } catch (err) {
      console.error('删除文件夹失败:', err);
      setNotice({ type: 'error', message: err.message });
    } finally {
      setActionLoading(false);
    }
  }, [authStatus, currentFolder, navigate, loadFolders, loadAllFolders]);

  const handleNavigateToFolder = useCallback((targetFolderId) => {
    setForwardTarget(null);
    if (targetFolderId) {
      navigate(`/album/${targetFolderId}`);
    } else {
      navigate('/album');
    }
  }, [navigate]);

  const handleNavigateBack = useCallback(() => {
    if (!currentFolder?.id) return;

    setForwardTarget(`/album/${currentFolder.id}`);

    if (currentFolder.parent_id) {
      navigate(`/album/${currentFolder.parent_id}`);
      return;
    }

    navigate('/album');
  }, [currentFolder, navigate]);

  const handleNavigateForward = useCallback(() => {
    if (!forwardTarget) return;
    navigate(forwardTarget);
    setForwardTarget(null);
  }, [forwardTarget, navigate]);

  useEffect(() => {
    loadAuthStatus();
  }, [loadAuthStatus]);

  useEffect(() => {
    if (authStatus !== 'member') {
      setLoading(false);
      setFolders([]);
      setAllFolders([]);
      setPhotos([]);
      setCurrentFolder(null);
      return;
    }

    loadFolders();
    loadAllFolders();

    if (folderId) {
      loadPhotos();
      loadCurrentFolder();
    } else {
      // 返回到根目录时，重置currentFolder为null
      setCurrentFolder(null);
      setPhotos([]);
    }
  }, [authStatus, folderId, loadFolders, loadAllFolders, loadPhotos, loadCurrentFolder]);

  useEffect(() => {
    if (notice && notice.type !== 'error') {
      const timer = setTimeout(() => setNotice(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  const isSearching = searchKeyword.trim() !== '';
  const hasContent = folders.length > 0 || photos.length > 0;
  const showFolders = !isSearching;
  const showPhotos = folderId || isSearching;
  const isLocked = authStatus === 'loading' || authStatus === 'anonymous' || authStatus === 'guest';
  const gateCopy = useMemo(() => {
    if (authStatus === 'loading') {
      return {
        title: '加载中',
        message: '正在验证您的身份和权限...',
      };
    }

    return {
      title: '请登录',
      message: '登录后方可浏览班级相册',
    };
  }, [authStatus]);

  return (
    <div className={styles.pageContent}>
      <div className={styles.layoutContainer}>
        {/* 左侧目录栏 */}
        <AlbumSidebar
          folders={allFolders}
          currentFolder={currentFolder}
          onNavigateToFolder={handleNavigateToFolder}
        />
        
        {/* 右侧内容区 */}
        <div className={styles.contentPanel}>
          <AlbumControls
            currentFolder={currentFolder}
            searchKeyword={searchKeyword}
            onSearch={handleSearch}
            onCreateFolder={handleCreateFolder}
            onUploadPhoto={handleUploadPhoto}
            onDeleteFolder={handleDeleteFolder}
            canDeleteFolder={isSuperuser && !!currentFolder}
            onNavigateBack={handleNavigateBack}
            onNavigateForward={handleNavigateForward}
            canNavigateForward={!!forwardTarget}
            actionLoading={actionLoading}
            albumStats={albumStats}
            isSearching={isSearching}
          />

        {notice && (
          <div className={styles.noticeWrap}>
            <NoticeBox
              type={notice.type}
              message={notice.message}
              onClose={() => setNotice(null)}
            />
          </div>
        )}

        {loading ? (
          <div className={styles.stateBlock}>
            <div className="spinner-border text-primary" role="status">
              <span className="visually-hidden">加载中...</span>
            </div>
            <div className={styles.stateText}>加载中...</div>
          </div>
        ) : error ? (
          <div className={styles.stateBlock}>
            <div className="text-danger">
              <i className="fas fa-exclamation-triangle me-2"></i>
              {error}
            </div>
          </div>
        ) : !hasContent ? (
          <AlbumEmptyState
            isSearching={isSearching}
            hasFolder={!!folderId}
            onNavigateBack={handleNavigateBack}
          />
        ) : (
          <>
            {showFolders && (
              <div className={styles.folderGrid}>
                {folders.map((folder) => (
                  <FolderCard
                    key={folder.id}
                    folder={folder}
                    onNavigate={handleNavigateToFolder}
                  />
                ))}
              </div>
            )}

            {showPhotos && (
              <div className={styles.photoGrid}>
                {photos.map((photo) => (
                  <PhotoCard
                    key={photo.id}
                    photo={photo}
                    allFolders={allFolders}
                    currentFolderId={folderId || null}
                    currentUserId={currentUserId}
                    isSuperuser={isSuperuser}
                    onToggleLike={handleToggleLike}
                    onRenamePhoto={handleRenamePhoto}
                    onMovePhoto={handleMovePhoto}
                    onDeletePhoto={handleDeletePhoto}
                    likeLoading={likeLoadingPhotoId === photo.id}
                    actionLoading={actionLoading}
                  />
                ))}
              </div>
            )}
          </>
        )}
        
        {isLocked && (
          <AuthGateOverlay
            mode={authStatus === 'guest' ? 'guest' : 'anonymous'}
            title={gateCopy.title}
            message={gateCopy.message}
            isApplyRequired={gateCopy.isApplyRequired}
          />
        )}
      </div>
    </div>
  </div>
);
}

export default Album;