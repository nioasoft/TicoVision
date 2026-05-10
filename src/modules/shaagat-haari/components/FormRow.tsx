/**
 * FormRow / FormSection
 *
 * Aligned, accountant-friendly form primitives. The Section is a CSS grid
 * with a fixed label-column width so all labels (and therefore all inputs)
 * line up vertically across every row, even with varying Hebrew label
 * lengths. In 2-column layout the same shape repeats horizontally.
 *
 * Usage:
 *   <FormSection title="ניכויים" cols={1} labelWidth={140}>
 *     <FormRow label='ניכוי חל"ת'>
 *       <MoneyInput value={x} onChange={setX} className="w-[140px]" />
 *     </FormRow>
 *   </FormSection>
 */

import * as React from 'react';
import { cn } from '@/lib/utils';

interface FormRowProps {
  label: React.ReactNode;
  /** Optional secondary control rendered next to the main input. */
  trailing?: React.ReactNode;
  /** Hint shown to the LEFT of the input (RTL: appears at the row's far end). */
  hint?: React.ReactNode;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}

/**
 * Renders TWO grid items inside a FormSection's grid: the label cell and the
 * input cell. Adjacency is automatic — both labels and inputs line up because
 * they share the parent grid's column tracks.
 */
export function FormRow({
  label,
  trailing,
  hint,
  required,
  className,
  children,
}: FormRowProps) {
  return (
    <>
      <label
        className={cn(
          'text-sm text-gray-700 font-medium text-right leading-none',
          'self-center py-2.5 border-b border-gray-100',
          'group-last:border-b-0',
          className
        )}
      >
        {label}
        {required && <span className="text-red-500 ms-1">*</span>}
      </label>
      <div
        className={cn(
          'flex items-center gap-2 py-2 border-b border-gray-100',
          'group-last:border-b-0'
        )}
      >
        {children}
        {trailing}
        {hint && (
          <span className="text-[11px] text-gray-400 leading-tight ms-auto">
            {hint}
          </span>
        )}
      </div>
    </>
  );
}

interface FormSectionProps {
  title?: React.ReactNode;
  description?: React.ReactNode;
  /** Number of side-by-side field columns. Default 2. Use 1 for rows that need full width. */
  cols?: 1 | 2;
  /** Fixed pixel width for the label column. Tune per section to fit longest label. Default 110. */
  labelWidth?: number;
  className?: string;
  children: React.ReactNode;
}

export function FormSection({
  title,
  description,
  cols = 2,
  labelWidth = 110,
  className,
  children,
}: FormSectionProps) {
  // Build grid template: pairs of [label-width auto] for each visual column,
  // separated by larger gap for the 2-col case.
  const oneColTemplate = `${labelWidth}px 1fr`;
  const twoColTemplate = `${labelWidth}px auto ${labelWidth}px 1fr`;

  return (
    <section className={cn('space-y-1.5', className)}>
      {title && (
        <h3 className="text-[11px] font-semibold tracking-wide text-gray-500 text-right">
          {title}
        </h3>
      )}
      {description && (
        <p className="text-[11px] text-gray-400 text-right leading-tight pb-1">
          {description}
        </p>
      )}
      <div
        className="rounded-md border border-gray-200 bg-white px-4 grid gap-x-4"
        style={{
          gridTemplateColumns: cols === 2 ? twoColTemplate : oneColTemplate,
        }}
      >
        {children}
      </div>
    </section>
  );
}

/**
 * Compact integer input scoped to small counts (employees, months).
 */
interface CountInputProps {
  value: number | '';
  onChange: (value: number | '') => void;
  min?: number;
  max?: number;
  className?: string;
}

export function CountInput({
  value,
  onChange,
  min = 0,
  max,
  className,
}: CountInputProps) {
  return (
    <input
      type="number"
      min={min}
      max={max}
      value={value === '' ? '' : value}
      onChange={(e) =>
        onChange(e.target.value === '' ? '' : parseInt(e.target.value) || 0)
      }
      dir="ltr"
      className={cn(
        'h-9 w-[80px] rounded-md border border-input bg-transparent px-2 text-sm shadow-sm',
        'tabular-nums text-left',
        'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        className
      )}
    />
  );
}
