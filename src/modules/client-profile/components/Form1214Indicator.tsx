/**
 * Form1214Indicator - Prominent tax coding badge
 */

import { Badge } from '@/components/ui/badge';

interface Form1214IndicatorProps {
  taxCoding: string | null | undefined;
}

export const Form1214Indicator: React.FC<Form1214IndicatorProps> = ({ taxCoding }) => {
  if (!taxCoding || taxCoding === '0') return null;

  return (
    <Badge variant="outline" className="bg-amber-50 text-amber-800 border-amber-300">
      1214: {taxCoding}
    </Badge>
  );
};
