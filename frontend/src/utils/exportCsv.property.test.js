import { describe, it, expect, vi } from 'vitest';
import fc from 'fast-check';
import { exportStudentsCsv } from './exportCsv';

describe('CSV export round trip (Property 9)', () => {
  it('Blob contains all student fields', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(
          fc.record({
            studentId: fc.string({ minLength: 1, maxLength: 8 }),
            name: fc.string({ minLength: 1, maxLength: 12 }),
            code: fc.string({ minLength: 2, maxLength: 6 }),
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
          const spy = vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:mock');
          exportStudentsCsv(students);
          const blob = spy.mock.calls[0][0];
          spy.mockRestore();
          const text = await blob.text();
          for (const s of students) {
            expect(text).toContain(s.studentId);
            expect(text).toContain(s.user.name);
            expect(text).toContain(s.program.code);
          }
        }
      ),
      { numRuns: 12 }
    );
  });
});
