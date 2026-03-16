import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { FinanceCostsVariables } from '@/types/tzlul-approvals.types';

interface FinanceCostsFormProps {
  value: Partial<FinanceCostsVariables>;
  onChange: (data: Partial<FinanceCostsVariables>) => void;
  disabled?: boolean;
}

export function FinanceCostsForm({ value, onChange, disabled }: FinanceCostsFormProps) {
  // Suppress unused variable warnings - props required by form interface
  void onChange;
  void disabled;
  void value;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">חוות דעת עלויות מימון</CardTitle>
          <CardDescription className="text-right">
            חוות דעת רו"ח בדבר עלויות מימון
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המסמך:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>חוות דעת רו"ח להצהרת חברת צלול בדבר עלויות מימון</li>
              <li>ביקורת בהתאם לתקני ביקורת מקובלים, ספרי החברה ודפי בנק</li>
              <li>אישור שההצהרה משקפת באופן נאות את המידע הכלול בה</li>
            </ul>
          </div>

          <div className="p-3 bg-gray-50 border rounded-md">
            <p className="text-sm text-gray-600 text-right">
              מסמך זה דורש רק את תאריך ההצהרה (בשדה למעלה). שם החברה וח.פ. קבועים - צלול ניקיון ואחזקה בע"מ.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
