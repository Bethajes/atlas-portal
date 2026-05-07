import api from '../api/axios';

export async function fetchMySections() {
  const r = await api.get('/sections/my-sections');
  return r.data?.data ?? [];
}

export async function fetchMyCourses() {
  const r = await api.get('/courses/teaching');
  return r.data?.courses ?? [];
}

export async function fetchMyStudents() {
  const r = await api.get('/sections/my-students');
  return r.data?.data ?? [];
}

export async function fetchInstructorAnnouncements() {
  const r = await api.get('/announcements/instructor');
  return r.data?.data ?? [];
}

export async function createAnnouncement(payload) {
  const r = await api.post('/announcements', payload);
  return r.data?.data;
}

export async function sendStudentMessage({ userId, title, message, type }) {
  const r = await api.post('/users/notifications', { userId, title, message, type });
  return r.data?.data;
}

export async function markNotificationRead(id) {
  await api.put(`/users/notifications/${id}/read`);
}

export async function fetchNotifications() {
  const r = await api.get('/users/notifications');
  return r.data?.data ?? [];
}

export async function fetchSection(sectionId) {
  const r = await api.get(`/sections/${sectionId}`);
  return r.data?.data;
}

export async function assignSectionGrade({ sectionId, studentId, letterGrade }) {
  const r = await api.put(`/sections/${sectionId}/students/${studentId}/grade`, { grade: null, letterGrade });
  return r.data;
}

export async function fetchAssignmentsByCourse(courseId) {
  const r = await api.get(`/assignments/course/${courseId}`);
  return r.data?.assignments ?? [];
}

export async function fetchAssignmentSubmissions(assignmentId) {
  const r = await api.get(`/assignments/${assignmentId}/submissions`);
  return r.data?.submissions ?? [];
}

export async function createAssignment(payload) {
  const r = await api.post('/assignments', payload);
  return r.data;
}
