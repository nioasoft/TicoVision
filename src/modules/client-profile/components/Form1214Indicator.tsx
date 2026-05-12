/**
 * Form1214Indicator - 1214 status badge
 *
 * Renders nothing for 'regular' (default) and NULL — only flags the special
 * 'zero' case so consumers know to exclude/treat the client differently.
 */

import { Badge } from '@/components/ui/badge';

interface Form1214IndicatorProps {
  status: 'regular' | 'zero' | null | undefined;
}

export const Form1214Indicator: React.FC<Form1214IndicatorProps> = ({ status }) => {
  if (status !== 'zero') return null;

  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
      1214: אפס
    </Badge>
  );
};
