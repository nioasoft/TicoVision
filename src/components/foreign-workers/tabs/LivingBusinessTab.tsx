import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { LivingBusinessVariables } from '@/types/foreign-workers.types';

interface LivingBusinessTabProps {
  value: Partial<LivingBusinessVariables>;
  onChange: (data: Partial<LivingBusinessVariables>) => void;
  disabled?: boolean;
}

const currentYear = new Date().getFullYear();
const yearOptions = [currentYear - 1, currentYear];

export function LivingBusinessTab({ value, onChange, disabled }: LivingBusinessTabProps) {
  const selectedYear = value.certificate_year || currentYear;

  const handleForeignExpertsChange = (count: string) => {
    const num = parseInt(count, 10);
    onChange({
      ...value,
      foreign_experts_count: isNaN(num) ? undefined : num
    });
  };

  const handleYearChange = (yearStr: string) => {
    onChange({
      ...value,
      certificate_year: Number(yearStr)
    });
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">עסק חי {selectedYear}</CardTitle>
          <CardDescription className="text-right">
            אישור למשרד הפנים - רשות האוכלוסין ההגירה ומעברי גבול
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Certificate Year */}
          <div className="space-y-2">
            <Label htmlFor="certificate-year" className="text-right block">
              שנת האישור
            </Label>
            <Select
              value={String(selectedYear)}
              onValueChange={handleYearChange}
              disabled={disabled}
              dir="rtl"
            >
              <SelectTrigger id="certificate-year" className="w-[180px] text-right">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-sm text-gray-500 text-right">
              המסמך יציג את השנים {selectedYear - 1} – {selectedYear}
            </p>
          </div>

          {/* Foreign Experts Count */}
          <div className="space-y-2">
            <Label htmlFor="foreign-experts" className="text-right block">
              כמות עובדים זרים מומחים
            </Label>
            <Input
              id="foreign-experts"
              type="number"
              min="1"
              value={value.foreign_experts_count || ''}
              onChange={(e) => handleForeignExpertsChange(e.target.value)}
              disabled={disabled}
              className="text-right rtl:text-right ltr:text-left"
              dir="rtl"
            />
            <p className="text-sm text-gray-500 text-right">
              מספר העובדים הזרים המומחים שהחברה תעסיק
            </p>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>החברה הינה חברה פעילה</li>
              <li>לא נרשמה לחברה הערת עסק חי בשנים {selectedYear - 1}-{selectedYear}</li>
              <li>
                החברה תעסיק{' '}
                <strong>{value.foreign_experts_count || '_'}</strong> עובדים מומחים זרים
                ותוכל לעמוד בעלות העסקתם
              </li>
            </ul>
          </div>

          {/* Validation */}
          {!value.foreign_experts_count && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא את מספר העובדים הזרים המומחים
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
