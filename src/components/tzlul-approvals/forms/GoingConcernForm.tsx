import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import type { GoingConcernVariables, GoingConcernOption } from '@/types/tzlul-approvals.types';

interface GoingConcernFormProps {
  value: Partial<GoingConcernVariables>;
  onChange: (data: Partial<GoingConcernVariables>) => void;
  disabled?: boolean;
}

export function GoingConcernForm({ value, onChange, disabled }: GoingConcernFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">הוכחת עמידה בתנאי עסק חי</CardTitle>
          <CardDescription className="text-right">
            אישור רו"ח להוכחת עמידת המשתתף בתנאי סעיף 2.1.8/2.2.8
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Last Audited Report Date */}
          <div className="space-y-2">
            <Label htmlFor="last-audited-report-date" className="text-right block">
              תאריך הדוח הכספי המבוקר האחרון 
            </Label>
            <Input
              id="last-audited-report-date"
              type="date"
              value={value.last_audited_report_date || ''}
              onChange={(e) => onChange({ ...value, last_audited_report_date: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="ltr"
            />
            <p className="text-sm text-gray-500 text-right">
              תאריך הדוח הכספי המבוקר האחרון של המשתתף
            </p>
          </div>

          {/* Audit Opinion Date */}
          <div className="space-y-2">
            <Label htmlFor="audit-opinion-date" className="text-right block">
              תאריך חתימת חוות הדעת 
            </Label>
            <Input
              id="audit-opinion-date"
              type="date"
              value={value.audit_opinion_date || ''}
              onChange={(e) => onChange({ ...value, audit_opinion_date: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="ltr"
            />
            <p className="text-sm text-gray-500 text-right">
              תאריך חתימת חוות הדעת על הדוח הכספי
            </p>
          </div>

          {/* Reviewed Statements Option */}
          <div className="space-y-4">
            <Label className="text-right block">
              דוחות כספיים סקורים לאחר הדוח המבוקר 
            </Label>
            <RadioGroup
              value={value.reviewed_statements_option || ''}
              onValueChange={(val) => onChange({ ...value, reviewed_statements_option: val as GoingConcernOption })}
              disabled={disabled}
              className="space-y-4"
            >
              <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="option_a" id="option-a" className="mt-1" />
                <Label htmlFor="option-a" className="text-right leading-relaxed cursor-pointer flex-1">
                  <span className="font-semibold">אפשרות א':</span>{' '}
                  כל הדוחות הכספיים הסקורים של המשתתף שנערכו לאחר הדוח הכספי המבוקר האחרון של המשתתף ונסקרו על ידינו, אינם כוללים הערה בדבר ספקות ממשיים לגבי המשך קיומו של המשתתף "כעסק חי" או כל הערה דומה.
                </Label>
              </div>

              <div className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 transition-colors">
                <RadioGroupItem value="option_b" id="option-b" className="mt-1" />
                <Label htmlFor="option-b" className="text-right leading-relaxed cursor-pointer flex-1">
                  <span className="font-semibold">אפשרות ב':</span>{' '}
                  אין למשתתף דוחות כספיים סקורים שנערכו לאחר הדוח הכספי המבוקר האחרון של המשתתף.
                </Label>
              </div>
            </RadioGroup>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>אישור לגבי הדוח הכספי המבוקר האחרון</li>
              <li>הצהרה על היעדר הערת "עסק חי"</li>
              <li>מידע על דוחות סקורים (בהתאם לבחירה)</li>
              <li>אישור שלא חל שינוי מהותי לרעה במצב העסקי</li>
            </ul>
          </div>

          {/* Validation */}
          {(!value.last_audited_report_date || !value.audit_opinion_date || !value.reviewed_statements_option) && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!value.last_audited_report_date && 'יש למלא את תאריך הדוח הכספי המבוקר האחרון. '}
                {!value.audit_opinion_date && 'יש למלא את תאריך חתימת חוות הדעת. '}
                {!value.reviewed_statements_option && 'יש לבחור אפשרות לגבי דוחות סקורים.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
