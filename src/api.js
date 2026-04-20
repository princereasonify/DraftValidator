const BASE = String(import.meta.env.VITE_DOTNET_BASE_URL || 'https://app.singularity-learn.com/api').trim().replace(/\/$/, '');

function authHeaders() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return {
      'Content-Type': 'application/json',
      ...(user.accessToken ? { Authorization: `Bearer ${user.accessToken}` } : {}),
    };
  } catch {
    return { 'Content-Type': 'application/json' };
  }
}

function getTeacherIdFromToken() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const direct = user.id ?? user.userId ?? user.Id ?? user.UserId ?? user.createdBy ?? null;
    if (direct != null) return Number(direct);
    if (user.accessToken) {
      const payload = JSON.parse(atob(user.accessToken.split('.')[1]));
      const id = payload.sub ?? payload.nameid ?? payload.userId ?? payload.id ?? payload.Id ?? null;
      if (id != null) return Number(id);
    }
    return null;
  } catch {
    return null;
  }
}

export async function apiLogin(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Login failed');
  return json.data;
}

export async function apiLogout() {
  const res = await fetch(`${BASE}/auth/logout`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || 'Logout failed');
  return json.data;
}

export async function getSchoolProfiles() {
  const res = await fetch(`${BASE}/schoolProfile?page=1&pageSize=10000`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load school profiles');
  return Array.isArray(json.data?.schoolProfiles) ? json.data.schoolProfiles : [];
}

export async function getSchoolClasses(schoolId) {
  const res = await fetch(`${BASE}/schoolClasses?schoolId=${schoolId}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load classes');
  return Array.isArray(json.data?.schoolClasses) ? json.data.schoolClasses : [];
}

export async function getSchoolClassSubjectMap(classId, schoolId) {
  const res = await fetch(`${BASE}/schoolClassSubjectMap/${classId}?schoolId=${schoolId}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load subjects');
  return Array.isArray(json.data?.schoolClassSubjectMaps) ? json.data.schoolClassSubjectMaps : [];
}

export async function getChapters({ schoolId, schoolBoardsLanguagesId, gradeId, subjectId }) {
  const params = new URLSearchParams();
  if (schoolId != null && String(schoolId) !== '') params.set('schoolId', String(schoolId));
  if (schoolBoardsLanguagesId != null && String(schoolBoardsLanguagesId) !== '') params.set('schoolBoardsLanguagesId', String(schoolBoardsLanguagesId));
  if (gradeId != null && String(gradeId) !== '') params.set('gradeId', String(gradeId));
  if (subjectId != null && String(subjectId) !== '') params.set('subjectId', String(subjectId));
  params.set('page', '1');
  params.set('pageSize', '100');
  const res = await fetch(`${BASE}/schoolSubjectChapter/byBoardLanguage?${params}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load chapters');
  const items = json.data?.schoolSubjectChapters ?? [];
  return items.map(c => ({
    id: c.chapterId,
    name: c.chapterName,
    topicNumber: c.chapterNumber,
    pdfUrl: c.pdfUrl,
  }));
}

export function getTextbookPdfUrl(pdfUrl) {
  return `${BASE}/textbook/pdf?url=${encodeURIComponent(pdfUrl)}`;
}

export function getAuthToken() {
  try {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    return user.accessToken || '';
  } catch {
    return '';
  }
}

export async function getLearningPlanChapter(chapterId, { schoolId } = {}) {
  const q = schoolId != null && String(schoolId) !== '' ? `?schoolId=${encodeURIComponent(String(schoolId))}` : '';
  const res = await fetch(`${BASE}/learning-plan/chapter/${encodeURIComponent(chapterId)}${q}`, {
    headers: authHeaders(),
  });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load learning plan chapter');
  return json.data;
}

export async function saveDraftedPlanVersion({ chapterId, schoolId, draftedPlanJson }) {
  const headers = authHeaders();
  if (!headers.Authorization) {
    throw new Error('Session expired. Please log in again before saving.');
  }

  const teacherId = getTeacherIdFromToken();
  const chapterIdName = typeof draftedPlanJson?.chapter_id === 'string' && draftedPlanJson.chapter_id.trim()
    ? draftedPlanJson.chapter_id.trim()
    : undefined;
  const body = {
    chapterId,
    draftedPlanJson,
    ...(chapterIdName ? { chapterIdName } : {}),
    ...(teacherId != null ? { teacherId } : {}),
    ...(schoolId != null && String(schoolId) !== '' ? { schoolId: Number(schoolId) } : {}),
  };
  console.log('Body:', body);
  const res = await fetch(`${BASE}/drafted-learning-plan/save-version`, {
    method: 'POST',
    headers,
    credentials: 'include',
    body: JSON.stringify(body),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || `Failed to save drafted plan (HTTP ${res.status}).`);
  return json.data;
}

export async function getDraftedPlansForChapter(chapterId, { schoolId } = {}) {
  const params = new URLSearchParams();
  if (chapterId) params.set('chapterId', chapterId);
  if (schoolId != null && String(schoolId) !== '') params.set('schoolId', String(schoolId));
  const q = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE}/drafted-learning-plan${q}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load drafted plans');
  return Array.isArray(json.data) ? json.data : [];
}

export async function approveDraftedPlan(planId) {
  const res = await fetch(`${BASE}/drafted-learning-plan/approve/${encodeURIComponent(planId)}`, {
    method: 'POST',
    headers: authHeaders(),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok || !json.success) throw new Error(json.message || 'Failed to approve plan');
  return json.data;
}

export async function getDraftedLearningPlanChapter(chapterId, { schoolId } = {}) {
  const params = new URLSearchParams();
  if (schoolId != null && String(schoolId) !== '') params.set('schoolId', String(schoolId));
  const q = params.toString() ? `?${params}` : '';
  const res = await fetch(`${BASE}/drafted-learning-plan/chapter/${encodeURIComponent(chapterId)}${q}`, {
    headers: authHeaders(),
  });
  if (res.status === 404) return null;
  const json = await res.json();
  if (!json.success) return null;
  return json.data;
}
