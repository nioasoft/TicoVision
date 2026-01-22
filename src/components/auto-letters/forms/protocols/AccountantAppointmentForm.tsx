/**
 * AccountantAppointmentForm - Form for Protocol: Accountant Appointment
 * פרוטוקול מאסיפת בעלי מניות למינוי רואה חשבון חדש
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Trash2, Crown } from 'lucide-react';
import type { AccountantAppointmentVariables } from '@/types/auto-letters.types';
import { formatIsraeliDate } from '@/lib/formatters';

interface AccountantAppointmentFormProps {
  value: Partial<AccountantAppointmentVariables>;
  onChange: (data: Partial<AccountantAppointmentVariables>) => void;
  disabled?: boolean;
  companyName?: string;
  companyId?: string;
}

export function AccountantAppointmentForm({
  value,
  onChange,
  disabled,
  companyName,
  companyId,
}: AccountantAppointmentFormProps) {
  const attendees = value.attendees || [{ name: '', is_chairman: true }];

  // Chairman is always the first attendee with is_chairman=true
  const handleChairmanNameChange = (name: string) => {
    // Update chairman name and sync to attendees[0]
    const newAttendees = [...attendees];
    if (newAttendees.length > 0) {
      newAttendees[0] = { ...newAttendees[0], name, is_chairman: true };
    } else {
      newAttendees.push({ name, is_chairman: true });
    }
    onChange({
      ...value,
      chairman_name: name,
      attendees: newAttendees,
    });
  };

  const handleAddAttendee = () => {
    onChange({
      ...value,
      attendees: [...attendees, { name: '', is_chairman: false }],
    });
  };

  const handleRemoveAttendee = (index: number) => {
    // Cannot remove chairman (index 0)
    if (index === 0) return;
    const newAttendees = attendees.filter((_, i) => i !== index);
    onChange({
      ...value,
      attendees: newAttendees,
    });
  };

  const handleAttendeeChange = (index: number, name: string) => {
    const newAttendees = [...attendees];
    newAttendees[index] = { ...newAttendees[index], name };
    // If changing chairman (index 0), also update chairman_name
    if (index === 0) {
      onChange({
        ...value,
        chairman_name: name,
        attendees: newAttendees,
      });
    } else {
      onChange({
        ...value,
        attendees: newAttendees,
      });
    }
  };

  // Validation checks
  const hasCompany = !!companyName?.trim();
  const hasCompanyId = !!companyId?.trim();
  const hasMeetingDate = !!value.meeting_date;
  const hasChairman = !!value.chairman_name?.trim();
  const hasPreviousFirm = !!value.previous_firm?.trim();
  const hasAttendees = attendees.length > 0 && attendees.every(a => a.name?.trim());

  const isValid = hasCompany && hasCompanyId && hasMeetingDate && hasChairman && hasPreviousFirm && hasAttendees;

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">פרוטוקול מינוי רואה חשבון</CardTitle>
          <CardDescription className="text-right">
            פרוטוקול מאסיפת בעלי המניות להפסקת מינוי רואה חשבון קודם ומינוי רואה חשבון חדש
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Company Display */}
          <div className="space-y-2">
            <Label className="text-right block">
              פרטי החברה 
            </Label>
            {companyName ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="text-right font-medium text-blue-900">{companyName}</div>
                {companyId && (
                  <div className="text-sm text-blue-700 text-right mt-1">
                    ח.פ: {companyId}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md text-yellow-800 text-right text-sm">
                יש לבחור לקוח בסעיף "בחירת נמען" למעלה
              </div>
            )}
          </div>

          <Separator />

          {/* Meeting Date */}
          <div className="space-y-2">
            <Label htmlFor="meeting-date" className="text-right block">
              תאריך האסיפה 
            </Label>
            <Input
              id="meeting-date"
              type="date"
              value={value.meeting_date || ''}
              onChange={(e) => onChange({ ...value, meeting_date: e.target.value })}
              disabled={disabled}
              className="text-left max-w-[200px]"
              dir="ltr"
            />
            {value.meeting_date && (
              <div className="text-sm text-gray-600 text-right">
                {formatIsraeliDate(new Date(value.meeting_date))}
              </div>
            )}
          </div>

          <Separator />

          {/* Chairman */}
          <div className="space-y-2">
            <Label htmlFor="chairman-name" className="text-right block">
              יו"ר האסיפה 
            </Label>
            <div className="flex items-center gap-2 rtl:flex-row-reverse ltr:flex-row">
              <Input
                id="chairman-name"
                type="text"
                value={value.chairman_name || ''}
                onChange={(e) => handleChairmanNameChange(e.target.value)}
                disabled={disabled}
                className="text-right flex-1"
                dir="rtl"
                placeholder="שם היו״ר"
              />
              <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
            </div>
            <p className="text-xs text-gray-500 text-right">
              היו"ר מתווסף אוטומטית לרשימת הנוכחים
            </p>
          </div>

          <Separator />

          {/* Attendees List */}
          <div className="space-y-4">
            <div className="flex justify-between items-center rtl:flex-row-reverse">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleAddAttendee}
                disabled={disabled}
                className="gap-1 rtl:flex-row-reverse"
              >
                <Plus className="h-4 w-4" />
                הוסף נוכח
              </Button>
              <Label className="text-right font-medium">
                נוכחים באסיפה
              </Label>
            </div>

            <div className="space-y-3">
              {attendees.map((attendee, index) => (
                <div key={index} className="flex items-center gap-3 rtl:flex-row-reverse">
                  {index > 0 && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => handleRemoveAttendee(index)}
                      disabled={disabled}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50 flex-shrink-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Input
                    type="text"
                    value={attendee.name}
                    onChange={(e) => handleAttendeeChange(index, e.target.value)}
                    disabled={disabled || index === 0}
                    className={`text-right flex-1 ${index === 0 ? 'bg-gray-50' : ''}`}
                    dir="rtl"
                    placeholder={index === 0 ? 'יו"ר (מסונכרן מלמעלה)' : `נוכח ${index + 1}`}
                  />
                  {index === 0 ? (
                    <Crown className="h-5 w-5 text-amber-500 flex-shrink-0" />
                  ) : (
                    <div className="w-5" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <Separator />

          {/* Previous Firm */}
          <div className="space-y-2">
            <Label htmlFor="previous-firm" className="text-right block">
              משרד רואי החשבון הקודם 
            </Label>
            <Input
              id="previous-firm"
              type="text"
              value={value.previous_firm || ''}
              onChange={(e) => onChange({ ...value, previous_firm: e.target.value })}
              disabled={disabled}
              className="text-right"
              dir="rtl"
              placeholder="שם משרד רו״ח הקודם"
            />
            <p className="text-xs text-gray-500 text-right">
              יופיע בסעיף "הפסקת מינוי רואה חשבון קודם"
            </p>
          </div>

          {/* New Firm (Hardcoded, read-only) */}
          <div className="space-y-2">
            <Label className="text-right block">משרד רואי החשבון החדש</Label>
            <Input
              value="פרנקו ושות' - רואי חשבון"
              disabled
              className="text-right bg-gray-50"
              dir="rtl"
            />
            <p className="text-xs text-gray-500 text-right">
              ערך קבוע - לא ניתן לשינוי
            </p>
          </div>

          {/* Validation */}
          {!isValid && (
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
              <p className="text-sm text-yellow-800 text-right">
                {!hasCompany && 'יש לבחור חברה. '}
                {!hasCompanyId && 'לחברה חסר ח.פ. '}
                {!hasMeetingDate && 'יש לבחור תאריך אסיפה. '}
                {!hasChairman && 'יש להזין שם יו"ר. '}
                {!hasPreviousFirm && 'יש להזין שם משרד רו"ח הקודם. '}
                {!hasAttendees && 'יש למלא שמות כל הנוכחים.'}
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
