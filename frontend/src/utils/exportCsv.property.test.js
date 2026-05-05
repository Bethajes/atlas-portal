import { describe, it, expect, vi, beforeAll } from 'vitest';
import fc from 'fast-check';
import { exportStudentsCsv, exportProgramsCsv } from './exportCsv';

// jsdom does not implement URL.createObjectURL — define stubs so the export function runs
beforeAll(() => {
  if (!URL.createObjectURL) {
    URL.createObjectURL = () => 'blob:mock';
  }
  if (!URL.revokeObjectURL) {
    URL.revokeObjectURL = () => {};
  }
});

// Helper to parse CSV text into rows
function parseCsv(text) {
  const rows = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    if (char === '"') {
      if (inQuotes && text[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      rows.push(current);
      current = '';
    } else if ((char === '\n' || char === '\r') && !inQuotes) {
      if (current || rows.length > 0) {
        rows.push(current);
        current = '';
      }
      if (char === '\r' && text[i + 1] === '\n') i++;
    } else {
      current += char;
    }
  }
  if (current) rows.push(current);
  return rows;
}

describe('CSV export round trip (Property 9)', () => {
  it('**Feature: admin-dashboard-upgrade, Property 9: CSV export round trip** — Student CSV contains all input field values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            // Exclude CSV special chars (", comma, newline) so raw values appear verbatim in output
            studentId: fc.stringMatching(/^[A-Za-z0-9]{1,8}$/),
            name: fc.stringMatching(/^[A-Za-z0-9 ]{1,12}$/),
            code: fc.stringMatching(/^[A-Za-z0-9]{2,6}$/),
            status: fc.constantFrom('ACTIVE', 'PROBATION'),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (rows) => {
          const students = rows.map((r, i) => ({
            id: `s-${i}`,
            studentId: r.studentId,
            status: r.status,
            createdAt: new Date().toISOString(),
            user: { name: r.name },
            program: { code: r.code },
          }));

          // Capture the CSV text passed to the Blob constructor
          let capturedCsvText = '';
          const OriginalBlob = globalThis.Blob;
          const BlobSpy = vi.fn((parts) => {
            capturedCsvText = parts[0];
            return new OriginalBlob(parts);
          });
          globalThis.Blob = BlobSpy;

          exportStudentsCsv(students);

          globalThis.Blob = OriginalBlob;

          // Parse CSV and verify all input values appear in output
          const csvValues = parseCsv(capturedCsvText);
          for (const s of students) {
            expect(csvValues).toContain(s.studentId);
            expect(csvValues).toContain(s.user.name);
            expect(csvValues).toContain(s.program.code);
            expect(csvValues).toContain(s.status);
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  it('**Feature: admin-dashboard-upgrade, Property 9: CSV export round trip** — Program CSV contains all input field values', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            code: fc.stringMatching(/^[A-Za-z0-9]{2,6}$/),
            name: fc.stringMatching(/^[A-Za-z0-9 ]{1,12}$/),
            type: fc.constantFrom('DECLARED', 'UNDECLARED'),
            deptName: fc.stringMatching(/^[A-Za-z0-9 ]{1,12}$/),
            duration: fc.integer({ min: 1, max: 6 }),
            credits: fc.integer({ min: 60, max: 180 }),
          }),
          { minLength: 1, maxLength: 5 }
        ),
        async (rows) => {
          const programs = rows.map((r, i) => ({
            id: `p-${i}`,
            code: r.code,
            name: r.name,
            type: r.type,
            durationYears: r.duration,
            totalCredits: r.credits,
            department: { name: r.deptName },
          }));

          // Capture the CSV text passed to the Blob constructor
          let capturedCsvText = '';
          const OriginalBlob = globalThis.Blob;
          const BlobSpy = vi.fn((parts) => {
            capturedCsvText = parts[0];
            return new OriginalBlob(parts);
          });
          globalThis.Blob = BlobSpy;

          exportProgramsCsv(programs);

          globalThis.Blob = OriginalBlob;

          // Parse CSV and verify all input values appear in output
          const csvValues = parseCsv(capturedCsvText);
          for (const p of programs) {
            expect(csvValues).toContain(p.code);
            expect(csvValues).toContain(p.name);
            expect(csvValues).toContain(p.type);
            expect(csvValues).toContain(p.department.name);
            expect(csvValues).toContain(String(p.durationYears));
            expect(csvValues).toContain(String(p.totalCredits));
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
