/**
 * FeeChip
 *
 * Tiny inline pill used in the unified dashboard's client cell to surface
 * the two fee statuses that can block the Shaagat HaAri pipeline:
 *
 *   - "annual"  → the firm's annual retainer (`fee_calculations` for current year)
 *   - "shaagat" → the Shaagat HaAri service fee (1,350 ₪ + VAT)
 *
 * Rendered next to the client's tax_id at 10px so it doesn't fight with the
 * primary client name. Each chip carries a tooltip with the full explanation.
 */

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

export type FeeChipKind = 'annual' | 'shaagat';
export type FeeChipStatus = 'paid' | 'unpaid' | 'exempt';

interface FeeChipProps {
  kind: FeeChipKind;
  status: FeeChipStatus;
}

interface ChipDefinition {
  label: string;
  symbol: string;
  className: string;
  tooltip: string;
}

const DEFINITIONS: Record<FeeChipKind, Record<FeeChipStatus, ChipDefinition>> = {
  annual: {
    unpaid: {
      label: 'שנתי',
      symbol: '⚠',
      className: 'bg-amber-50 text-amber-700 border-amber-200',
      tooltip: 'שכ"ט שנתי לא שולם — הסדר תשלום במשרד',
    },
    paid: {
      label: 'שנתי',
      symbol: '✓',
      className: 'bg-green-50 text-green-700 border-green-200',
      tooltip: 'שכ"ט שנתי שולם',
    },
    exempt: {
      label: 'שנתי',
      symbol: '—',
      className: 'bg-gray-50 text-gray-500 border-gray-200',
      tooltip: 'שכ"ט שנתי — לא רלוונטי',
    },
  },
  shaagat: {
    unpaid: {
      label: 'הגשה',
      symbol: '✗',
      className: 'bg-red-50 text-red-700 border-red-200',
      tooltip: 'שכ"ט הגשה (1,350 ₪ + מע"מ) — טרם שולם',
    },
    paid: {
      label: 'הגשה',
      symbol: '✓',
      className: 'bg-green-50 text-green-700 border-green-200',
      tooltip: 'שכ"ט הגשה — שולם',
    },
    exempt: {
      label: 'הגשה',
      symbol: '—',
      className: 'bg-gray-50 text-gray-500 border-gray-200',
      tooltip: 'שכ"ט הגשה — פטור',
    },
  },
};

export function FeeChip({ kind, status }: FeeChipProps) {
  const def = DEFINITIONS[kind][status];
  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <span
            className={cn(
              'inline-flex items-center gap-0.5 rounded-full border px-1.5 h-4 text-[10px] font-medium leading-none',
              def.className
            )}
          >
            <span aria-hidden="true">{def.symbol}</span>
            <span>{def.label}</span>
          </span>
        </TooltipTrigger>
        <TooltipContent dir="rtl" side="top">
          {def.tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export default FeeChip;
