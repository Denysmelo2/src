// "Student −15%" — the best student discount today (Student Beans or
// UNiDAYS) for a store, shown only to users with "I'm a student" on
// (handover 17/11/2026). No link: the code comes from the platform's app.
import { studentBadgeText, studentLine } from '@/lib/studentDiscount';

export function StudentBadge({ best, withTitle = true }) {
  if (!best) return null;
  return (
    <span
      className="inline-block shrink-0 rounded-full border border-sky-300 bg-sky-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-800"
      title={withTitle ? studentLine(best) : undefined}
    >
      {studentBadgeText(best)}
    </span>
  );
}
