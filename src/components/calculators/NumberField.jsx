// Shared numeric field for the /calculator micro-tools.
//
// 2026-09-14: Added with the redemption calculators. The four older
// calculators still carry their own inline Input + Label blocks; they
// can migrate to this whenever they are next touched.

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

/**
 * A field holds an error only once it contains something that isn't a
 * usable number. Empty means "not filled in yet", which is not an error.
 */
export function isInvalidNumber(raw) {
  if (raw === '') return false;
  const n = Number(raw);
  return !Number.isFinite(n) || n < 0;
}

/** Parse a field value for maths, treating blank/garbage as 0. */
export function num(raw) {
  const n = parseFloat(raw);
  return Number.isFinite(n) && n >= 0 ? n : 0;
}

export function NumberField({
  id,
  label,
  hint,
  placeholder,
  value,
  onChange,
  step = '0.01',
}) {
  return (
    <div>
      <Label htmlFor={id} className="text-xs">
        {label}
        {hint && <span className="text-muted-foreground font-normal"> {hint}</span>}
      </Label>
      <Input
        id={id}
        type="number"
        inputMode="decimal"
        min="0"
        step={step}
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={isInvalidNumber(value)}
        className="mt-1"
      />
    </div>
  );
}

export default NumberField;
