import { supabase } from '../lib/supabase';

const AVATAR_BUCKET = 'people-avatars';
const MAX_AVATAR_SIZE = 2 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = ['image/jpeg', 'image/png', 'image/webp'];

const toArrayOrNull = (value) => {
  if (!value) return null;
  if (Array.isArray(value)) return value.length > 0 ? value : null;
  return null;
};

const normalizeCreatePayload = (payload = {}) => ({
  name: String(payload.name || '').trim(),
  student_no: Number.isFinite(payload.student_no) ? payload.student_no : null,
  nickname: payload.nickname || null,
  gender: payload.gender,
  role: payload.role,
  status: payload.status || '未设置',
  description: payload.description || null,
  bio: payload.bio || null,
  hobbies: toArrayOrNull(payload.hobbies),
  phone: payload.phone || null,
  social: payload.social || null,
  sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 100,
  english_name: payload.english_name || null,
  university: payload.university || null,
  major: payload.major || null,
  skills: toArrayOrNull(payload.skills),
  website: payload.website || null,
  subject: payload.subject || null,
  current_position: payload.current_position || null,
});

const normalizeUpdatePayload = (payload = {}) => ({
  nickname: payload.nickname || null,
  status: payload.status || null,
  description: payload.description || null,
  bio: payload.bio || null,
  hobbies: toArrayOrNull(payload.hobbies),
  phone: payload.phone || null,
  social: payload.social || null,
  sort_order: Number.isFinite(payload.sort_order) ? payload.sort_order : 100,
  english_name: payload.english_name || null,
  university: payload.university || null,
  major: payload.major || null,
  skills: toArrayOrNull(payload.skills),
  website: payload.website || null,
  current_position: payload.current_position || null,
});

const requireUserId = async () => {
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    throw new Error('用户未登录或会话失效');
  }

  return user.id;
};

const getCurrentUserRoleInfo = async () => {
  const ownerUserId = await requireUserId();
  const { data: profileRow, error: profileError } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', ownerUserId)
    .maybeSingle();

  if (profileError) {
    throw profileError;
  }

  return {
    userId: ownerUserId,
    role: profileRow?.role || null,
    isSuperuser: profileRow?.role === 'superuser',
  };
};

const validateAvatarFile = (file) => {
  if (!file) return;

  if (!ALLOWED_AVATAR_TYPES.includes(file.type)) {
    throw new Error('头像仅支持 JPEG/PNG/WEBP 格式');
  }

  if (file.size > MAX_AVATAR_SIZE) {
    throw new Error('头像大小不能超过 2MB');
  }
};

const uploadAvatar = async (ownerUserId, file) => {
  if (!file) return null;

  validateAvatarFile(file);

  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const fileName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const path = `${ownerUserId}/${fileName}`;

  const { error } = await supabase.storage.from(AVATAR_BUCKET).upload(path, file, {
    upsert: false,
    contentType: file.type,
  });

  if (error) {
    throw new Error(`头像上传失败: ${error.message}`);
  }

  return path;
};

const removeAvatarIfExists = async (avatarPath) => {
  if (!avatarPath) return;
  await supabase.storage.from(AVATAR_BUCKET).remove([avatarPath]);
};

const withAvatarUrl = async (profile) => {
  const avatarPath = profile?.avatar_path;
  if (!avatarPath) return profile;

  const { data, error } = await supabase.storage.from(AVATAR_BUCKET).createSignedUrl(avatarPath, 60 * 60);
  return {
    ...profile,
    avatar_url: error ? null : data?.signedUrl || null,
  };
};

export async function getPeopleProfiles() {
  const { data, error } = await supabase
    .from('people_profiles')
    .select(
      'id, owner_user_id, student_no, name, nickname, gender, role, status, description, bio, hobbies, phone, social, avatar_path, sort_order, updated_at, english_name, university, major, skills, website, subject, current_position'
    )
    .order('sort_order', { ascending: true })
    .order('updated_at', { ascending: false });

  if (error) {
    return { data: [], error };
  }

  const rows = await Promise.all((data || []).map(withAvatarUrl));

  return {
    data: rows,
    error: null,
  };
}

export async function getMyPeopleProfile() {
  const ownerUserId = await requireUserId();
  const { data, error } = await supabase
    .from('people_profiles')
    .select(
      'id, owner_user_id, student_no, name, nickname, gender, role, status, description, bio, hobbies, phone, social, avatar_path, sort_order, updated_at, english_name, university, major, skills, website, subject, current_position'
    )
    .eq('owner_user_id', ownerUserId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: await withAvatarUrl(data), error: null };
}

export async function getPeopleProfileById(profileId) {
  if (!profileId) {
    return { data: null, error: new Error('缺少 profileId') };
  }

  const { data, error } = await supabase
    .from('people_profiles')
    .select(
      'id, owner_user_id, student_no, name, nickname, gender, role, status, description, bio, hobbies, phone, social, avatar_path, sort_order, updated_at, english_name, university, major, skills, website, subject, current_position'
    )
    .eq('id', profileId)
    .maybeSingle();

  if (error) {
    return { data: null, error };
  }

  if (!data) {
    return { data: null, error: null };
  }

  return { data: await withAvatarUrl(data), error: null };
}

export async function createMyPeopleProfile(payload = {}) {
  let roleInfo;
  try {
    roleInfo = await getCurrentUserRoleInfo();
  } catch (error) {
    return { data: null, error };
  }

  if (!roleInfo.isSuperuser) {
    return { data: null, error: new Error('仅 superuser 可创建人物资料') };
  }

  if (!payload?.name || !payload?.gender || !payload?.role) {
    return { data: null, error: new Error('创建人物资料必须填写 name、gender、role') };
  }

  if (payload.role === 'teacher' && !String(payload.subject || '').trim()) {
    return { data: null, error: new Error('教师人物创建时必须填写学科') };
  }

  if (!['male', 'female'].includes(payload.gender)) {
    return { data: null, error: new Error('gender 仅支持 male 或 female') };
  }

  const body = {
    owner_user_id: roleInfo.isSuperuser ? null : roleInfo.userId,
    created_by_user_id: roleInfo.userId,
    ...normalizeCreatePayload(payload),
  };

  const { data, error } = await supabase.from('people_profiles').insert([body]).select().single();

  if (error) {
    return { data: null, error };
  }

  return { data, error: null };
}

export async function deleteMyPeopleProfile() {
  const ownerUserId = await requireUserId();

  const { error } = await supabase.from('people_profiles').delete().eq('owner_user_id', ownerUserId);

  return { data: !error, error };
}

export async function deletePeopleProfileById(profileId) {
  if (!profileId) {
    return { data: null, error: new Error('缺少 profileId') };
  }

  try {
    const roleInfo = await getCurrentUserRoleInfo();
    if (!roleInfo.isSuperuser) {
      return { data: null, error: new Error('仅 superuser 可删除人物资料') };
    }
  } catch (error) {
    return { data: null, error };
  }

  const { error } = await supabase.from('people_profiles').delete().eq('id', profileId);
  return { data: !error, error };
}

export async function updateMyPeopleProfile(payload = {}, avatarFile = null) {
  const ownerUserId = await requireUserId();
  const patch = normalizeUpdatePayload(payload);
  let oldAvatarPath = null;
  let newAvatarPath = null;

  if (avatarFile) {
    const { data: currentRow } = await supabase
      .from('people_profiles')
      .select('avatar_path')
      .eq('owner_user_id', ownerUserId)
      .maybeSingle();

    oldAvatarPath = currentRow?.avatar_path || null;
    newAvatarPath = await uploadAvatar(ownerUserId, avatarFile);
    patch.avatar_path = newAvatarPath;
  }

  const { data, error } = await supabase
    .from('people_profiles')
    .update(patch)
    .eq('owner_user_id', ownerUserId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  if (newAvatarPath && oldAvatarPath && oldAvatarPath !== newAvatarPath) {
    await removeAvatarIfExists(oldAvatarPath);
  }

  return { data, error: null };
}

export async function updatePeopleProfileById(profileId, payload = {}, avatarFile = null) {
  if (!profileId) {
    return { data: null, error: new Error('缺少 profileId') };
  }

  let roleInfo;
  try {
    roleInfo = await getCurrentUserRoleInfo();
  } catch (error) {
    return { data: null, error };
  }

  if (!roleInfo.isSuperuser) {
    const { data: row, error: rowError } = await supabase
      .from('people_profiles')
      .select('owner_user_id')
      .eq('id', profileId)
      .maybeSingle();

    if (rowError) {
      return { data: null, error: rowError };
    }

    if (!row || row.owner_user_id !== roleInfo.userId) {
      return { data: null, error: new Error('无权修改该人物资料') };
    }
  }

  const patch = normalizeUpdatePayload(payload);
  let oldAvatarPath = null;
  let newAvatarPath = null;

  if (roleInfo.isSuperuser && Object.prototype.hasOwnProperty.call(payload, 'owner_user_id')) {
    const ownerUserId = String(payload.owner_user_id || '').trim();
    if (!ownerUserId) {
      return { data: null, error: new Error('owner_user_id 不能为空') };
    }
    patch.owner_user_id = ownerUserId;
  }

  if (avatarFile) {
    const { data: currentRow } = await supabase
      .from('people_profiles')
      .select('avatar_path')
      .eq('id', profileId)
      .maybeSingle();

    oldAvatarPath = currentRow?.avatar_path || null;
    const userId = await requireUserId();
    newAvatarPath = await uploadAvatar(userId, avatarFile);
    patch.avatar_path = newAvatarPath;
  }

  const { data, error } = await supabase
    .from('people_profiles')
    .update(patch)
    .eq('id', profileId)
    .select()
    .single();

  if (error) {
    return { data: null, error };
  }

  if (newAvatarPath && oldAvatarPath && oldAvatarPath !== newAvatarPath) {
    await removeAvatarIfExists(oldAvatarPath);
  }

  return { data, error: null };
}
