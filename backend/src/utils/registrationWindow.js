/**
 * Registrar-defined registration windows vs. academic term dates (AcademicSemester).
 */

function getRegistrationState(semester) {
  if (!semester) {
    return {
      state: 'CLOSED',
      message: 'No active semester configured.',
      daysUntilOpen: null,
      daysUntilClose: null,
    };
  }
  const now = new Date();
  const regStart = new Date(semester.registrationStart);

  // Treat registrationEnd as inclusive: extend to end-of-day (23:59:59.999)
  // so that a date stored as midnight still covers the full calendar day.
  const regEndRaw = new Date(semester.registrationEnd);
  const regEnd = new Date(regEndRaw);
  regEnd.setHours(23, 59, 59, 999);

  if (now < regStart) {
    const daysUntilOpen = Math.ceil((regStart - now) / (1000 * 60 * 60 * 24));
    return {
      state: 'UPCOMING',
      message: `Registration opens in ${daysUntilOpen} day${daysUntilOpen !== 1 ? 's' : ''}.`,
      daysUntilOpen,
      daysUntilClose: null,
    };
  }
  if (now >= regStart && now <= regEnd) {
    const daysUntilClose = Math.ceil((regEnd - now) / (1000 * 60 * 60 * 24));
    return {
      state: 'OPEN',
      message: `Registration is open. Closes in ${daysUntilClose} day${daysUntilClose !== 1 ? 's' : ''}.`,
      daysUntilOpen: 0,
      daysUntilClose,
    };
  }
  return {
    state: 'CLOSED',
    message: 'Registration period has ended for this semester.',
    daysUntilOpen: null,
    daysUntilClose: 0,
  };
}

function isRegistrationWindowOpen(semester) {
  return getRegistrationState(semester).state === 'OPEN';
}

/** Eligibility for course registration (lifecycle + standing). */
function canStudentAttemptRegistration(student) {
  if (!student) return { ok: false, reason: 'Student not found' };
  if (student.status === 'GRADUATED' || student.academicLevel === 'GRADUATED') {
    return { ok: false, reason: 'Graduated students cannot register.' };
  }
  if (['SUSPENDED', 'WITHDRAWN', 'DROPPED'].includes(student.status)) {
    return { ok: false, reason: `Registration not available for status: ${student.status}.` };
  }
  if (['APPLICANT', 'ADMITTED'].includes(student.academicLevel)) {
    return { ok: false, reason: 'Complete enrollment before registering for courses.' };
  }
  return { ok: true, reason: null };
}

module.exports = {
  getRegistrationState,
  isRegistrationWindowOpen,
  canStudentAttemptRegistration,
};
