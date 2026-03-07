import { supabase } from '../lib/supabase.js';
import { logger } from '../utils/logger.js';

const getAuthenticatedUser = async () => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    throw new Error('用户未登录或认证失败');
  }

  return user;
};

const getUserAndProfile = async (profileFields = 'role') => {
  const user = await getAuthenticatedUser();

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('获取用户信息失败');
  }

  return { user, profile };
};

const getOptionalUserAndProfile = async (profileFields = 'role, nickname') => {
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return {
      user: null,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select(profileFields)
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
    throw new Error('获取用户信息失败');
  }

  return { user, profile };
};

const buildFolderPath = async (title, parentId = null) => {
  let path = `/${title}`;

  if (parentId) {
    const { data: parentFolder, error } = await supabase
      .from('album_folders')
      .select('path')
      .eq('id', parentId)
      .single();

    if (error || !parentFolder) {
      throw new Error('父文件夹不存在');
    }

    path = `${parentFolder.path}/${title}`;
  }

  return path;
};

const withUserLikeFlag = async (mediaList) => {
  const { user } = await getOptionalUserAndProfile();
  if (!user || !Array.isArray(mediaList) || mediaList.length === 0) {
    return mediaList.map((item) => ({ ...item, user_liked: false }));
  }

  const mediaIds = mediaList.map((item) => item.id);
  const { data: likes } = await supabase
    .from('album_likes')
    .select('photo_id')
    .eq('user_id', user.id)
    .in('photo_id', mediaIds);

  const likeSet = new Set((likes || []).map((item) => item.photo_id));

  return mediaList.map((item) => ({
    ...item,
    user_liked: likeSet.has(item.id),
  }));
};

const inferMediaTitle = (media) => {
  if (media?.title && String(media.title).trim()) {
    return media.title;
  }

  const source = media?.file_path || media?.url || '';
  const rawName = source.split('/').pop() || '';
  if (!rawName) return 'media';
  return rawName.replace(/\.[^.]+$/, '');
};

const normalizeMediaRecords = (records = []) => {
  return records.map((media) => ({
    ...media,
    title: inferMediaTitle(media),
  }));
};

const getMediaDimensions = (file) => {
  return new Promise((resolve) => {
    if (!file) {
      resolve({ width: 0, height: 0 });
      return;
    }

    const objectUrl = URL.createObjectURL(file);

    const safeResolve = (dimensions) => {
      URL.revokeObjectURL(objectUrl);
      resolve(dimensions);
    };

    if (file.type?.startsWith('image/')) {
      const image = new Image();
      image.onload = () => {
        safeResolve({
          width: image.naturalWidth || image.width || 0,
          height: image.naturalHeight || image.height || 0,
        });
      };
      image.onerror = () => safeResolve({ width: 0, height: 0 });
      image.src = objectUrl;
      return;
    }

    if (file.type?.startsWith('video/')) {
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.onloadedmetadata = () => {
        safeResolve({
          width: video.videoWidth || 0,
          height: video.videoHeight || 0,
        });
      };
      video.onerror = () => safeResolve({ width: 0, height: 0 });
      video.src = objectUrl;
      return;
    }

    safeResolve({ width: 0, height: 0 });
  });
};

const assertSuperuser = async () => {
  const { user, profile } = await getUserAndProfile('role');
  if (profile?.role !== 'superuser') {
    throw new Error('只有超级管理员可以执行此操作');
  }
  return { user, profile };
};

const collectDescendantFolderIds = (folders, rootFolderId) => {
  const childMap = new Map();
  folders.forEach((folder) => {
    const parentId = folder.parent_id || '__ROOT__';
    if (!childMap.has(parentId)) {
      childMap.set(parentId, []);
    }
    childMap.get(parentId).push(folder.id);
  });

  const result = [];
  const queue = [rootFolderId];

  while (queue.length > 0) {
    const currentId = queue.shift();
    result.push(currentId);
    const children = childMap.get(currentId) || [];
    children.forEach((childId) => queue.push(childId));
  }

  return result;
};

const assertMediaManager = async (photoId, selectFields = 'id, folder_id, file_path, uploader_id') => {
  const { user, profile } = await getUserAndProfile('role');

  const { data: media, error: selectError } = await supabase
    .from('album_photos')
    .select(selectFields)
    .eq('id', photoId)
    .single();

  if (selectError || !media) {
    throw new Error('媒体不存在');
  }

  const canManage = media.uploader_id === user.id || profile?.role === 'superuser';
  if (!canManage) {
    throw new Error('只有媒体上传者或超级管理员可以执行此操作');
  }

  return { user, profile, media };
};

export const albumService = {
  async createFolder(title, parentId = null) {
    await getAuthenticatedUser();

    const safeTitle = title?.trim();
    if (!safeTitle) {
      throw new Error('文件夹名称不能为空');
    }

    const path = await buildFolderPath(safeTitle, parentId);

    const { data: folder, error } = await supabase
      .from('album_folders')
      .insert({
        title: safeTitle,
        parent_id: parentId,
        path,
      })
      .select('*')
      .single();

    if (error) {
      throw new Error('创建文件夹失败: ' + error.message);
    }

    return folder;
  },

  async getFolders(parentId = null) {
    let query = supabase.from('album_folders').select('*').order('created_at', { ascending: false });

    if (parentId) {
      query = query.eq('parent_id', parentId);
    } else {
      query = query.is('parent_id', null);
    }

    const { data: folders, error } = await query;
    if (error) {
      throw new Error('获取文件夹列表失败: ' + error.message);
    }

    return folders || [];
  },

  async getAllFolders() {
    const { data: folders, error } = await supabase
      .from('album_folders')
      .select('*')
      .order('path', { ascending: true });

    if (error) {
      throw new Error('获取完整目录失败: ' + error.message);
    }

    return folders || [];
  },

  async getFolder(folderId) {
    const { data: folder, error } = await supabase
      .from('album_folders')
      .select('*')
      .eq('id', folderId)
      .single();

    if (error) {
      throw new Error('获取文件夹详情失败: ' + error.message);
    }

    return folder;
  },

  async uploadMedia(folderId, file, title = '') {
    const user = await getAuthenticatedUser();
    const fileNameBase = title?.trim() || file?.name?.replace(/\.[^.]+$/, '') || 'media';
    const mediaDimensions = await getMediaDimensions(file);

    if (!file || !(file.type?.startsWith('image/') || file.type?.startsWith('video/'))) {
      throw new Error('仅支持图片或视频文件');
    }

    const { data: folder, error: folderError } = await supabase
      .from('album_folders')
      .select('id')
      .eq('id', folderId)
      .single();

    if (folderError || !folder) {
      throw new Error('文件夹不存在');
    }

    const ext = file.name.split('.').pop() || 'bin';
    const objectName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${user.id}/${objectName}`;

    const { error: uploadError } = await supabase.storage
      .from('album-photos')
      .upload(filePath, file);

    if (uploadError) {
      throw new Error('媒体上传失败: ' + uploadError.message);
    }

    const {
      data: { publicUrl },
    } = supabase.storage.from('album-photos').getPublicUrl(filePath);

    const { data: media, error: insertError } = await supabase
      .from('album_photos')
      .insert({
        folder_id: folderId,
        uploader_id: user.id,
        title: fileNameBase,
        url: publicUrl,
        file_path: filePath,
        width: mediaDimensions.width,
        height: mediaDimensions.height,
      })
      .select('*')
      .single();

    if (insertError) {
      await supabase.storage.from('album-photos').remove([filePath]);
      throw new Error('创建媒体记录失败: ' + insertError.message);
    }

    await this.updateFolderStats(folderId);
    return {
      ...media,
      title: media?.title || fileNameBase,
    };
  },

  async uploadPhoto(folderId, file, title = '') {
    return this.uploadMedia(folderId, file, title);
  },

  async getPhotos(folderId, page = 1, pageSize = 20) {
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    const { data: mediaList, error, count } = await supabase
      .from('album_photos')
      .select(
        `
        *,
        uploader:profiles!album_photos_uploader_id_fkey(nickname, avatar_url),
        album_likes(count)
      `,
        { count: 'exact' }
      )
      .eq('folder_id', folderId)
      .order('created_at', { ascending: false })
      .range(start, end);

    if (error) {
      throw new Error('获取媒体列表失败: ' + error.message);
    }

    const photos = await withUserLikeFlag(mediaList || []);
    const normalizedPhotos = normalizeMediaRecords(photos);

    return {
      photos: normalizedPhotos,
      totalCount: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / pageSize),
    };
  },

  async searchPhotos(keyword, folderId = null, page = 1, pageSize = 20) {
    const searchText = (keyword || '').trim();
    const start = (page - 1) * pageSize;
    const end = start + pageSize - 1;

    let query = supabase
      .from('album_photos')
      .select(
        `
        *,
        uploader:profiles!album_photos_uploader_id_fkey(nickname, avatar_url),
        album_likes(count),
        folder:album_folders!album_photos_folder_id_fkey(title, path)
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(start, end);

    if (searchText) {
      query = query.ilike('title', `%${searchText}%`);
    }

    if (folderId) {
      query = query.eq('folder_id', folderId);
    }

    const { data: mediaList, error, count } = await query;

    if (error) {
      throw new Error('搜索媒体失败: ' + error.message);
    }

    const photos = await withUserLikeFlag(mediaList || []);
    const normalizedPhotos = normalizeMediaRecords(photos);

    return {
      photos: normalizedPhotos,
      totalCount: count || 0,
      currentPage: page,
      totalPages: Math.ceil((count || 0) / pageSize),
      query: searchText,
    };
  },

  async toggleLikePhoto(photoId) {
    const user = await getAuthenticatedUser();

    const { data: existingLike, error: likeQueryError } = await supabase
      .from('album_likes')
      .select('photo_id, user_id')
      .eq('photo_id', photoId)
      .eq('user_id', user.id)
      .single();

    const hasExistingLike = !!existingLike && !likeQueryError;

    let liked = true;
    let error = null;

    if (hasExistingLike) {
      ({ error } = await supabase
        .from('album_likes')
        .delete()
        .eq('photo_id', photoId)
        .eq('user_id', user.id));
      liked = false;
    } else {
      ({ error } = await supabase
        .from('album_likes')
        .insert({ photo_id: photoId, user_id: user.id }));

      if (error?.code === '23505') {
        ({ error } = await supabase
          .from('album_likes')
          .delete()
          .eq('photo_id', photoId)
          .eq('user_id', user.id));
        liked = false;
      }
    }

    if (error) {
      throw new Error((liked ? '点赞失败: ' : '取消点赞失败: ') + error.message);
    }

    const { data: media } = await supabase
      .from('album_photos')
      .select('folder_id')
      .eq('id', photoId)
      .single();

    if (media?.folder_id) {
      await this.updateFolderStats(media.folder_id);
    }

    return { success: true, liked };
  },

  async updateFolderStats(folderId) {
    const { count: photoCount } = await supabase
      .from('album_photos')
      .select('id', { count: 'exact', head: true })
      .eq('folder_id', folderId);

    const { data: likesData } = await supabase
      .from('album_photos')
      .select('album_likes(count)')
      .eq('folder_id', folderId);

    const totalLikes = (likesData || []).reduce(
      (sum, media) => sum + (media.album_likes?.[0]?.count || 0),
      0
    );

    const { error } = await supabase
      .from('album_folders')
      .update({
        photo_count: photoCount || 0,
        total_likes: totalLikes,
        updated_at: new Date().toISOString(),
      })
      .eq('id', folderId);

    if (error) {
      logger.error('更新文件夹统计失败:', error);
    }

    return {
      photoCount: photoCount || 0,
      totalLikes,
    };
  },

  async deletePhoto(photoId) {
    const { media } = await assertMediaManager(photoId, 'id, folder_id, file_path, uploader_id');

    if (media.file_path) {
      await supabase.storage.from('album-photos').remove([media.file_path]);
    }

    const { error: deleteError } = await supabase
      .from('album_photos')
      .delete()
      .eq('id', photoId);

    if (deleteError) {
      throw new Error('删除媒体失败: ' + deleteError.message);
    }

    await this.updateFolderStats(media.folder_id);
    return { success: true };
  },

  async renamePhoto(photoId, newName) {
    const safeName = (newName || '').trim();

    if (!safeName) {
      throw new Error('名称不能为空');
    }

    await assertMediaManager(photoId, 'id, uploader_id');

    const sanitizedTitle = safeName.replace(/\s+/g, ' ').trim();

    const { data: updatedMedia, error: updateError } = await supabase
      .from('album_photos')
      .update({
        title: sanitizedTitle,
      })
      .eq('id', photoId)
      .select('*')
      .single();

    if (updateError) {
      throw new Error('更新媒体记录失败: ' + updateError.message);
    }

    return updatedMedia;
  },

  async movePhoto(photoId, targetFolderId) {
    if (!targetFolderId) {
      throw new Error('请选择目标文件夹');
    }

    const { data: targetFolder, error: targetFolderError } = await supabase
      .from('album_folders')
      .select('id')
      .eq('id', targetFolderId)
      .single();

    if (targetFolderError || !targetFolder) {
      throw new Error('目标文件夹不存在');
    }

    const { media } = await assertMediaManager(photoId, 'id, folder_id, uploader_id');

    if (media.folder_id === targetFolderId) {
      return { success: true, moved: false };
    }

    const sourceFolderId = media.folder_id;

    const { error: updateError } = await supabase
      .from('album_photos')
      .update({
        folder_id: targetFolderId,
        moved_at: new Date().toISOString(),
      })
      .eq('id', photoId);

    if (updateError) {
      throw new Error('移动媒体失败: ' + updateError.message);
    }

    if (sourceFolderId) {
      await this.updateFolderStats(sourceFolderId);
    }
    await this.updateFolderStats(targetFolderId);

    return { success: true, moved: true };
  },

  async deleteFolderWithMedia(folderId) {
    await assertSuperuser();

    const { data: allFolders, error: foldersError } = await supabase
      .from('album_folders')
      .select('id, parent_id, path');

    if (foldersError) {
      throw new Error('读取目录结构失败: ' + foldersError.message);
    }

    const targetFolder = (allFolders || []).find((folder) => folder.id === folderId);
    if (!targetFolder) {
      throw new Error('文件夹不存在');
    }

    const folderIds = collectDescendantFolderIds(allFolders || [], folderId);

    const { data: mediaList, error: mediaQueryError } = await supabase
      .from('album_photos')
      .select('id, file_path')
      .in('folder_id', folderIds);

    if (mediaQueryError) {
      throw new Error('查询文件夹媒体失败: ' + mediaQueryError.message);
    }

    const mediaIds = (mediaList || []).map((media) => media.id);
    const filePaths = (mediaList || []).map((media) => media.file_path).filter(Boolean);

    if (filePaths.length > 0) {
      const { error: storageRemoveError } = await supabase.storage.from('album-photos').remove(filePaths);
      if (storageRemoveError) {
        throw new Error('删除媒体文件失败: ' + storageRemoveError.message);
      }
    }

    if (mediaIds.length > 0) {
      const { error: likesDeleteError } = await supabase
        .from('album_likes')
        .delete()
        .in('photo_id', mediaIds);

      if (likesDeleteError) {
        throw new Error('删除媒体点赞失败: ' + likesDeleteError.message);
      }

      const { error: mediaDeleteError } = await supabase
        .from('album_photos')
        .delete()
        .in('id', mediaIds);

      if (mediaDeleteError) {
        throw new Error('删除媒体记录失败: ' + mediaDeleteError.message);
      }
    }

    const folderDeleteOrder = (allFolders || [])
      .filter((folder) => folderIds.includes(folder.id))
      .sort((a, b) => (b.path?.length || 0) - (a.path?.length || 0));

    for (const folder of folderDeleteOrder) {
      const { error: folderDeleteError } = await supabase
        .from('album_folders')
        .delete()
        .eq('id', folder.id);

      if (folderDeleteError) {
        throw new Error('删除文件夹失败: ' + folderDeleteError.message);
      }
    }

    return {
      success: true,
      deletedFolderCount: folderDeleteOrder.length,
      deletedMediaCount: mediaIds.length,
    };
  },
};
