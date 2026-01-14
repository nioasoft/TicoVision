/**
 * Reminder Settings Card Component
 * Basic settings for capital declaration automatic reminders
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Button } from '@/components/ui/button';
import { Loader2, Save, Settings } from 'lucide-react';
import { toast } from 'sonner';
import {
  capitalDeclarationReminderService,
  type UpdateReminderSettingsDto,
} from '@/services/capital-declaration-reminder.service';
import type { Database } from '@/types/supabase';

type ReminderSettings = Database['public']['Tables']['capital_declaration_reminder_settings']['Row'];

export function ReminderSettingsCard() {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [settings, setSettings] = useState<ReminderSettings | null>(null);

  // Local form state
  const [enableClientReminders, setEnableClientReminders] = useState(true);
  const [frequencyDays, setFrequencyDays] = useState(9);
  const [enableWeeklyReport, setEnableWeeklyReport] = useState(true);
  const [weeklyReportEmail, setWeeklyReportEmail] = useState('');

  // Load settings on mount
  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    setIsLoading(true);
    const { data, error } = await capitalDeclarationReminderService.getSettings();

    if (error) {
      toast.error('שגיאה בטעינת ההגדרות');
      console.error('Error loading settings:', error);
    } else if (data) {
      setSettings(data);
      setEnableClientReminders(data.enable_client_reminders);
      setFrequencyDays(data.client_reminder_frequency_days);
      setEnableWeeklyReport(data.enable_weekly_report);
      setWeeklyReportEmail(data.weekly_report_email || '');
    }
    setIsLoading(false);
  };

  const handleSave = async () => {
    setIsSaving(true);

    const dto: UpdateReminderSettingsDto = {
      enable_client_reminders: enableClientReminders,
      client_reminder_frequency_days: frequencyDays,
      enable_weekly_report: enableWeeklyReport,
      weekly_report_email: weeklyReportEmail || null,
    };

    const { data, error } = await capitalDeclarationReminderService.updateSettings(dto);

    if (error) {
      toast.error('שגיאה בשמירת ההגדרות');
      console.error('Error saving settings:', error);
    } else {
      toast.success('ההגדרות נשמרו בהצלחה');
      setSettings(data);
    }

    setIsSaving(false);
  };

  // Check if settings have changed
  const hasChanges =
    settings &&
    (enableClientReminders !== settings.enable_client_reminders ||
      frequencyDays !== settings.client_reminder_frequency_days ||
      enableWeeklyReport !== settings.enable_weekly_report ||
      (weeklyReportEmail || null) !== settings.weekly_report_email);

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2 rtl:flex-row-reverse">
          <Settings className="h-5 w-5 text-muted-foreground" />
          <CardTitle className="rtl:text-right">הגדרות תזכורות אוטומטיות</CardTitle>
        </div>
        <CardDescription className="rtl:text-right">
          הגדר תזכורות אוטומטיות ללקוחות ודוח שבועי למנהל
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Client Reminders Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground rtl:text-right">
            תזכורות ללקוחות
          </h3>

          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <Label htmlFor="enable-client-reminders" className="rtl:text-right">
              שלח תזכורות אוטומטיות ללקוחות
            </Label>
            <Switch
              id="enable-client-reminders"
              checked={enableClientReminders}
              onCheckedChange={setEnableClientReminders}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="frequency-days" className="rtl:text-right">
              תדירות שליחה (ימים)
            </Label>
            <Input
              id="frequency-days"
              type="number"
              min={1}
              max={60}
              value={frequencyDays}
              onChange={(e) => setFrequencyDays(parseInt(e.target.value) || 9)}
              disabled={!enableClientReminders}
              className="w-24 rtl:text-right"
            />
            <p className="text-xs text-muted-foreground rtl:text-right">
              כל כמה ימים לשלוח תזכורת ללקוח שעדיין לא סיים
            </p>
          </div>
        </div>

        {/* Divider */}
        <div className="border-t" />

        {/* Weekly Report Section */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold text-muted-foreground rtl:text-right">
            דו"ח שבועי למנהל
          </h3>

          <div className="flex items-center justify-between rtl:flex-row-reverse">
            <Label htmlFor="enable-weekly-report" className="rtl:text-right">
              שלח דו"ח שבועי כל יום ראשון
            </Label>
            <Switch
              id="enable-weekly-report"
              checked={enableWeeklyReport}
              onCheckedChange={setEnableWeeklyReport}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="weekly-report-email" className="rtl:text-right">
              כתובת מייל למנהל הצהרות הון
            </Label>
            <Input
              id="weekly-report-email"
              type="email"
              placeholder="כתובת אימייל"
              value={weeklyReportEmail}
              onChange={(e) => setWeeklyReportEmail(e.target.value)}
              disabled={!enableWeeklyReport}
              className="rtl:text-right"
              dir="ltr"
            />
            <p className="text-xs text-muted-foreground rtl:text-right">
              הדו"ח נשלח כל יום ראשון ב-9 בבוקר עם רשימת הצהרות פתוחות
            </p>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-start rtl:justify-end pt-4">
          <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
            {isSaving ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin ltr:mr-2 rtl:ml-2" />
                שומר...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                שמור הגדרות
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
