const BASE = import.meta.env.VITE_DOTNET_BASE_URL || 'https://app.singularity-learn.com/api';

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

export async function getSchoolProfiles() {
  const res = await fetch(`${BASE}/schoolProfile`, { headers: authHeaders() });
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
