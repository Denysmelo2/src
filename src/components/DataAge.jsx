/**
 * DataAge — "Verified 3 days ago" / "Verified 143 days ago" next to a rate.
 *
 * The audit of 2026-10-09 found five of the eleven rate sources between
 * 95 and 143 days stale. /compare showed no date at all, and the two
 * pages that did (store detail, strategy detail) printed it in the same
 * faint grey whether the figure was two hours old or five months old —
 * each with its own copy of a local `fmtTimeAgo`. So a user had no way
 * to tell a current rate from a dead one.
 *
 * This is the one place that decides how an age looks. It states the
 * age and colours it by how bad it is; it never hides a route or
 * changes a ranking. A user who can see a number is four months old can
 * decide for themselves whether to trust it, which is strictly better
 * than being told nothing.
 *
 * `now` is optional. Pass one clock from the page when several of these
 * render together, so two rates verified on the same day cannot read as
 * different ages.
 */

import React, { useMemo } from 'react';
import { Clock, AlertTriangle } from 'lucide-react';
import { describeAge, AGE_CLASS } from '@/lib/dataFreshness';
import { cn } from '@/lib/utils';

export function DataAge({ verifiedAt, now, className }) {
  const age = useMemo(() => describeAge(verifiedAt, now), [verifiedAt, now]);
  const Icon = age.state === 'stale' ? AlertTriangle : Clock;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 text-[11px] leading-none',
        AGE_CLASS[age.state],
        className
      )}
      title={age.title}
    >
      <Icon className="w-3 h-3 shrink-0" aria-hidden="true" />
      {age.label}
    </span>
  );
}

export default DataAge;
