import { validate } from 'class-validator';
import { TeacherDashboardRequest } from './teacher-dashboard.request';

describe('TeacherDashboardRequest', () => {
  it('accepts a complete ordered date range', async () => {
    const request = Object.assign(new TeacherDashboardRequest(), {
      from: '2026-03-01',
      to: '2026-03-31',
    });

    await expect(validate(request)).resolves.toHaveLength(0);
  });

  it('requires both dates and rejects an inverted range', async () => {
    const partial = Object.assign(new TeacherDashboardRequest(), {
      from: '2026-03-01',
    });
    const inverted = Object.assign(new TeacherDashboardRequest(), {
      from: '2026-03-31',
      to: '2026-03-01',
    });

    await expect(validate(partial)).resolves.not.toHaveLength(0);
    await expect(validate(inverted)).resolves.not.toHaveLength(0);
  });
});
