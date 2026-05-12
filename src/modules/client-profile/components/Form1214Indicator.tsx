/**
 * Form1214Indicator - 1214 status badge
 *
 * Renders nothing for NULL (status not applicable).
 * 'regular' → subtle neutral badge.
 * 'zero'    → amber badge (flagged: this client files 1214 as zero,
 *             excluded from revenue-based modules).
 */

import { Badge } from '@/components/ui/badge';

interface Form1214IndicatorProps {
  status: 'regular' | 'zero' | null | undefined;
}

export const Form1214Indicator: React.FC<Form1214IndicatorProps> = ({ status }) => {
  if (status == null) return null;

  if (status === 'zero') {
    return (
      <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
        1214: אפס
      </Badge>
    );
  }

  return (
    <Badge variant="outline" className="bg-slate-50 text-slate-600 border-slate-200">
      1214: רגיל
    </Badge>
  );
};
