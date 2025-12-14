import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import type { ExcellenceBonusVariables } from '@/types/tzlul-approvals.types';

interface ExcellenceBonusFormProps {
  value: Partial<ExcellenceBonusVariables>;
  onChange: (data: Partial<ExcellenceBonusVariables>) => void;
  disabled?: boolean;
}

export function ExcellenceBonusForm({ value, onChange, disabled }: ExcellenceBonusFormProps) {
  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">חוות דעת מענק מצויינות</CardTitle>
          <CardDescription className="text-right">
            חוות דעת רו"ח לסעיפים 2 ו-3 בהצהרה בדבר מענק מצויינות
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Statement Date */}
          <div className="space-y-2">
            <Label htmlFor="statement-date" className="text-right block">
              תאריך ההצהרה <span className="text-red-500">*</span>
            </Label>
            <Input
              id="statement-date"
              type="date"
              value={value.statement_date || ''}
              onChange={(e) => onChange({ ...value, statement_date: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="ltr"
            />
            <p className="text-sm text-gray-500 text-right">
              תאריך ההצהרה המצורפת
            </p>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>ביקורת סעיפים 1-3 בהצהרה</li>
              <li>חישוב "בסיס השכר"</li>
              <li>תשלום מענק מצויינות לעובדים המפורטים בסעיף 3</li>
              <li>חוות דעת לפי תקני ביקורת מקובלים</li>
            </ul>
          </div>

          {/* Validation */}
          {!value.statement_date && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא את תאריך ההצהרה
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
