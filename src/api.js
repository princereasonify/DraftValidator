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

export async function getChapters(subjectId, gradeId) {
  const res = await fetch(`${BASE}/learning-plan/list?subjectId=${subjectId}&gradeId=${gradeId}`, { headers: authHeaders() });
  const json = await res.json();
  if (!json.success) throw new Error(json.message || 'Failed to load chapters');
  // Response: { data: { items: [{ id, name, topicNumber }] } }
  const items = json.data?.items ?? json.data;
  return Array.isArray(items) ? items : [];
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
  const body = {
    chapterId,
    draftedPlanJson,
    ...(schoolId != null && String(schoolId) !== '' ? { schoolId: Number(schoolId) } : {}),
  };
  const res = await fetch(`${BASE}/drafted-learning-plan/save-version`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok || !json.success) throw new Error(json.message || 'Failed to save drafted plan');
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
