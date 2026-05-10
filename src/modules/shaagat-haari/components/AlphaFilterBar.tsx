/**
 * AlphaFilterBar
 *
 * Hebrew alphabet quick-jump filter above the unified dashboard table.
 * Filters by the first character of `company_name_hebrew`.
 *
 * Buttons (RTL natural):
 *   [הכל] [#]  [א] [ב] [ג] ... [ת]
 *
 * - "הכל" → no filter
 * - "#"   → companies that start with a digit, English letter, or anything
 *           other than the 22 Hebrew letters
 * - Letter → companies whose name starts with that letter
 *
 * Buttons whose letter has zero matching rows in the current dataset are
 * rendered with reduced opacity as a visual hint, but stay clickable.
 */

import React from 'react';
import { cn } from '@/lib/utils';

export type AlphaFilterValue = string | null;

const HEBREW_LETTERS = [
  'א', 'ב', 'ג', 'ד', 'ה', 'ו', 'ז', 'ח', 'ט', 'י',
  'כ', 'ל', 'מ', 'נ', 'ס', 'ע', 'פ', 'צ', 'ק', 'ר',
  'ש', 'ת',
];

const HEBREW_FINAL_TO_REGULAR: Record<string, string> = {
  ך: 'כ',
  ם: 'מ',
  ן: 'נ',
  ף: 'פ',
  ץ: 'צ',
};

/**
 * Returns the canonical Hebrew letter that this name starts with, or '#' for
 * non-Hebrew (digits, English, symbols), or null if no first char.
 */
// eslint-disable-next-line react-refresh/only-export-components
export function firstAlphaKey(name: string | null | undefined): string | null {
  if (!name) return null;
  const trimmed = name.trim();
  if (trimmed.length === 0) return null;
  const first = trimmed[0];

  // Final-form letters → regular form (so ם counts as מ, ן as נ, etc.)
  if (HEBREW_FINAL_TO_REGULAR[first]) return HEBREW_FINAL_TO_REGULAR[first];

  if (HEBREW_LETTERS.includes(first)) return first;

  return '#';
}

interface AlphaFilterBarProps {
  /** Map of letter → row count (used for greying out empty letters) */
  counts: Record<string, number>;
  /** null = "all"; '#' = non-Hebrew; otherwise a Hebrew letter */
  selected: AlphaFilterValue;
  onSelect: (value: AlphaFilterValue) => void;
  /** Total rows count (for the "הכל" button) */
  total: number;
}

export function AlphaFilterBar({
  counts,
  selected,
  onSelect,
  total,
}: AlphaFilterBarProps) {
  return (
    <div
      className="flex flex-wrap items-center gap-1 bg-white border border-gray-200 rounded-md px-2 py-1.5"
      dir="rtl"
    >
      <LetterButton
        label="הכל"
        sub={total}
        active={selected === null}
        onClick={() => onSelect(null)}
        wide
      />
      <LetterButton
        label="#"
        sub={counts['#'] ?? 0}
        active={selected === '#'}
        onClick={() => onSelect('#')}
      />
      <span className="mx-1 h-5 border-r border-gray-200" />
      {HEBREW_LETTERS.map((letter) => {
        const count = counts[letter] ?? 0;
        return (
          <LetterButton
            key={letter}
            label={letter}
            sub={count}
            active={selected === letter}
            onClick={() => onSelect(letter)}
            dim={count === 0}
          />
        );
      })}
    </div>
  );
}

interface LetterButtonProps {
  label: string;
  sub: number;
  active: boolean;
  onClick: () => void;
  /** Render with reduced opacity (no matches) */
  dim?: boolean;
  /** Slightly wider button for "הכל" */
  wide?: boolean;
}

function LetterButton({ label, sub, active, onClick, dim, wide }: LetterButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      title={`${label} — ${sub} לקוחות`}
      className={cn(
        'inline-flex items-center justify-center rounded text-xs font-medium transition-colors',
        wide ? 'min-w-[2.75rem] px-2 h-7' : 'min-w-[1.75rem] px-1.5 h-7',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500',
        active
          ? 'bg-gray-700 text-white hover:bg-gray-700'
          : 'bg-transparent text-gray-700 hover:bg-gray-100',
        dim && !active && 'opacity-30'
      )}
    >
      {label}
    </button>
  );
}

/**
 * Build a counts-by-letter map from a list of rows (or any objects with a
 * `company_name_hebrew` field).
 */
// eslint-disable-next-line react-refresh/only-export-components
export function countsByAlpha(
  rows: Array<{ company_name_hebrew: string | null; company_name?: string | null }>
): Record<string, number> {
  const out: Record<string, number> = {};
  for (const row of rows) {
    const key = firstAlphaKey(row.company_name_hebrew ?? row.company_name);
    if (!key) continue;
    out[key] = (out[key] ?? 0) + 1;
  }
  return out;
}

export default AlphaFilterBar;
