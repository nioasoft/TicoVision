import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Plus, Trash2 } from 'lucide-react';
import type { PreviousAccountantRequestVariables } from '@/types/company-onboarding.types';

interface PreviousAccountantRequestFormProps {
  value: Partial<PreviousAccountantRequestVariables>;
  onChange: (data: Partial<PreviousAccountantRequestVariables>) => void;
  disabled?: boolean;
}

export function PreviousAccountantRequestForm({ value, onChange, disabled }: PreviousAccountantRequestFormProps) {
  const subjects = value.subjects || [''];

  const handleAddSubject = () => {
    onChange({
      ...value,
      subjects: [...subjects, ''],
    });
  };

  const handleRemoveSubject = (index: number) => {
    if (subjects.length <= 1) return; // Keep at least one subject
    const newSubjects = subjects.filter((_, i) => i !== index);
    onChange({
      ...value,
      subjects: newSubjects,
    });
  };

  const handleSubjectChange = (index: number, newValue: string) => {
    const newSubjects = [...subjects];
    newSubjects[index] = newValue;
    onChange({
      ...value,
      subjects: newSubjects,
    });
  };

  const isValid = subjects.length > 0 && subjects.every(s => s.trim()) && value.email_for_documents?.trim();

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">פנייה לרואה חשבון קודם</CardTitle>
          <CardDescription className="text-right">
            בקשת מסמכים ותיקים מרואה חשבון קודם
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Subject Lines (הנדון) - Multiple */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-right block">
                הנדון (שמות החברות) 
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddSubject}
                disabled={disabled}
                className="flex items-center gap-1"
              >
                <Plus className="h-4 w-4" />
                הוסף חברה
              </Button>
            </div>

            <div className="space-y-2">
              {subjects.map((subject, index) => (
                <div key={index} className="flex items-center gap-2">
                  <Input
                    type="text"
                    value={subject}
                    onChange={(e) => handleSubjectChange(index, e.target.value)}
                    disabled={disabled}
                    className="text-right flex-1"
                    dir="rtl"
                    placeholder={`שם חברה ${index + 1}`}
                  />
                  {subjects.length > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveSubject(index)}
                      disabled={disabled}
                      className="h-9 w-9 text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-gray-500 text-right">
              הוסף שורת נדון לכל חברה שברצונך למשוך את התיק שלה
            </p>
          </div>

          {/* Email for Documents */}
          <div className="space-y-2">
            <Label htmlFor="email-for-documents" className="text-right block">
              כתובת מייל לקבלת המסמכים 
            </Label>
            <Input
              id="email-for-documents"
              type="email"
              value={value.email_for_documents || ''}
              onChange={(e) => onChange({ ...value, email_for_documents: e.target.value })}
              disabled={disabled}
              className="text-left"
              dir="ltr"
              placeholder="helli@franco.co.il"
            />
            <p className="text-sm text-gray-500 text-right">
              כתובת המייל שתופיע במכתב לקבלת המסמכים
            </p>
          </div>

          {/* Document Preview Info */}
          <div className="p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h4 className="font-medium text-blue-900 mb-2 text-right">תוכן המכתב:</h4>
            <ul className="space-y-2 text-sm text-blue-800 text-right list-disc list-inside">
              <li>בקשה לאישור אתיקה מקצועית</li>
              <li>רשימת מסמכי החברות הנדרשים</li>
              <li>רשימת מסמכי בעל השליטה</li>
              <li>פרטי יצירת קשר לשליחת המסמכים</li>
            </ul>
          </div>

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                יש למלא לפחות שם חברה אחד ואת כתובת המייל
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
