/**
 * TaxWithholdingIndicator - ניכוי מס במקור badge
 *
 * NULL    → hidden (not yet specified).
 * 'yes'   → neutral badge showing the percentage.
 * 'no'    → loud red badge — flagged as problematic, since most active clients
 *           should have withholding configured.
 */

import { AlertTriangle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TaxWithholdingIndicatorProps {
  status: 'yes' | 'no' | null | undefined;
  percentage: number | null | undefined;
}

export const TaxWithholdingIndicator: React.FC<TaxWithholdingIndicatorProps> = ({
  status,
  percentage,
}) => {
  if (status == null) return null;

  if (status === 'no') {
    return (
      <Badge
        variant="outline"
        className="bg-red-50 text-red-700 border-red-300 font-semibold gap-1"
      >
        <AlertTriangle className="h-3 w-3" />
        אין ניכוי מס במקור
      </Badge>
    );
  }

  // status === 'yes'
  const pctLabel =
    percentage === null || percentage === undefined
      ? 'ניכוי מס במקור'
      : `ניכוי מס במקור: ${percentage}%`;

  return (
    <Badge variant="outline" className="bg-emerald-50 text-emerald-800 border-emerald-200">
      {pctLabel}
    </Badge>
  );
};
