function downloadBlob(filename, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function escapeCell(v) {
  const s = v == null ? '' : String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportStudentsCsv(students) {
  const rows = [
    ['Student ID', 'Full Name', 'Program', 'Status', 'Enrollment Date'],
    ...(students || []).map((s) => [
      s.studentId,
      s.user?.name ?? '',
      s.program?.code ?? s.program?.name ?? '',
      s.status ?? '',
      s.createdAt ? new Date(s.createdAt).toISOString().slice(0, 10) : '',
    ]),
  ];
  const csv = rows.map((r) => r.map(escapeCell).join(',')).join('\n');
  downloadBlob(`students-export-${Date.now()}.csv`, csv);
}

export function exportProgramsCsv(programs) {
  const rows = [
    ['Code', 'Name', 'Type', 'Department', 'Duration', 'Total Credits'],
    ...(programs || []).map((p) => [
      p.code,
      p.name,
      p.type ?? '',
      p.department?.name ?? '',
      p.durationYears ?? '',
      p.totalCredits ?? '',
    ]),
  ];
  const csv = rows.map((r) => r.map(escapeCell).join(',')).join('\n');
  downloadBlob(`programs-export-${Date.now()}.csv`, csv);
}
