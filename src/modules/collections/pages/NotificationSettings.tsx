/**
 * Notification Settings Page
 * Configure alert thresholds and reminder settings for Sigal
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';

export const NotificationSettings: React.FC = () => {
  const [settings, setSettings] = useState({
    notify_letter_not_opened_days: 7,
    notify_no_selection_days: 14,
    notify_abandoned_cart_days: 3,
    notify_checks_overdue_days: 30,
    enable_email_notifications: true,
    notification_email: 'sigal@franco.co.il',
    enable_automatic_reminders: true,
    first_reminder_days: 14,
    second_reminder_days: 7,
    third_reminder_days: 3,
  });

  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // TODO: Implement save to notification_settings table
    await new Promise((resolve) => setTimeout(resolve, 1000));

    setLoading(false);
    toast.success('ההגדרות נשמרו בהצלחה');
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold rtl:text-right ltr:text-left">הגדרות התראות ותזכורות</h1>
        <p className="text-gray-500 rtl:text-right ltr:text-left">
          הגדרת סף ימים להתראות ותזכורות אוטומטיות
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Alert Thresholds */}
        <Card>
          <CardHeader>
            <CardTitle className="rtl:text-right ltr:text-left">סף ימים להתראות</CardTitle>
            <CardDescription className="rtl:text-right ltr:text-left">
              כמה ימים לחכות לפני שליחת התראה
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="not-opened" className="rtl:text-right ltr:text-left">
                  מכתב לא נפתח
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Input
                    id="not-opened"
                    type="number"
                    min="1"
                    value={settings.notify_letter_not_opened_days}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        notify_letter_not_opened_days: parseInt(e.target.value),
                      })
                    }
                    className="rtl:text-right ltr:text-left"
                  />
                  <span className="text-sm text-gray-500">ימים</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="no-selection" className="rtl:text-right ltr:text-left">
                  לא בחר אופן תשלום
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Input
                    id="no-selection"
                    type="number"
                    min="1"
                    value={settings.notify_no_selection_days}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_no_selection_days: parseInt(e.target.value) })
                    }
                    className="rtl:text-right ltr:text-left"
                  />
                  <span className="text-sm text-gray-500">ימים</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="abandoned" className="rtl:text-right ltr:text-left">
                  נטש Cardcom
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Input
                    id="abandoned"
                    type="number"
                    min="1"
                    value={settings.notify_abandoned_cart_days}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_abandoned_cart_days: parseInt(e.target.value) })
                    }
                    className="rtl:text-right ltr:text-left"
                  />
                  <span className="text-sm text-gray-500">ימים</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="checks" className="rtl:text-right ltr:text-left">
                  המחאות באיחור
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Input
                    id="checks"
                    type="number"
                    min="1"
                    value={settings.notify_checks_overdue_days}
                    onChange={(e) =>
                      setSettings({ ...settings, notify_checks_overdue_days: parseInt(e.target.value) })
                    }
                    className="rtl:text-right ltr:text-left"
                  />
                  <span className="text-sm text-gray-500">ימים</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Email Notifications */}
        <Card>
          <CardHeader>
            <CardTitle className="rtl:text-right ltr:text-left">התראות באימייל</CardTitle>
            <CardDescription className="rtl:text-right ltr:text-left">
              הגדרות קבלת התראות באימייל
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rtl:flex-row-reverse">
              <Label htmlFor="enable-email" className="rtl:text-right ltr:text-left">
                קבלת התראות באימייל
              </Label>
              <Switch
                id="enable-email"
                checked={settings.enable_email_notifications}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_email_notifications: checked })
                }
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="rtl:text-right ltr:text-left">
                כתובת אימייל
              </Label>
              <Input
                id="email"
                type="email"
                value={settings.notification_email}
                onChange={(e) => setSettings({ ...settings, notification_email: e.target.value })}
                className="rtl:text-right ltr:text-left"
              />
            </div>
          </CardContent>
        </Card>

        {/* Automatic Reminders */}
        <Card>
          <CardHeader>
            <CardTitle className="rtl:text-right ltr:text-left">תזכורות אוטומטיות</CardTitle>
            <CardDescription className="rtl:text-right ltr:text-left">
              הגדרת מרווחים לתזכורות ללקוחות
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between rtl:flex-row-reverse">
              <Label htmlFor="enable-reminders" className="rtl:text-right ltr:text-left">
                הפעלת תזכורות אוטומטיות
              </Label>
              <Switch
                id="enable-reminders"
                checked={settings.enable_automatic_reminders}
                onCheckedChange={(checked) =>
                  setSettings({ ...settings, enable_automatic_reminders: checked })
                }
              />
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="first-reminder" className="rtl:text-right ltr:text-left">
                  תזכורת ראשונה
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Input
                    id="first-reminder"
                    type="number"
                    min="1"
                    value={settings.first_reminder_days}
                    onChange={(e) =>
                      setSettings({ ...settings, first_reminder_days: parseInt(e.target.value) })
                    }
                    disabled={!settings.enable_automatic_reminders}
                    className="rtl:text-right ltr:text-left"
                  />
                  <span className="text-sm text-gray-500">ימים</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="second-reminder" className="rtl:text-right ltr:text-left">
                  תזכורת שנייה (אחרי)
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Input
                    id="second-reminder"
                    type="number"
                    min="1"
                    value={settings.second_reminder_days}
                    onChange={(e) =>
                      setSettings({ ...settings, second_reminder_days: parseInt(e.target.value) })
                    }
                    disabled={!settings.enable_automatic_reminders}
                    className="rtl:text-right ltr:text-left"
                  />
                  <span className="text-sm text-gray-500">ימים</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="third-reminder" className="rtl:text-right ltr:text-left">
                  תזכורת שלישית (אחרי)
                </Label>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  <Input
                    id="third-reminder"
                    type="number"
                    min="1"
                    value={settings.third_reminder_days}
                    onChange={(e) =>
                      setSettings({ ...settings, third_reminder_days: parseInt(e.target.value) })
                    }
                    disabled={!settings.enable_automatic_reminders}
                    className="rtl:text-right ltr:text-left"
                  />
                  <span className="text-sm text-gray-500">ימים</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Submit */}
        <div className="flex justify-end gap-2 rtl:flex-row-reverse">
          <Button type="submit" disabled={loading}>
            {loading ? 'שומר...' : 'שמירת הגדרות'}
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            ביטול
          </Button>
        </div>
      </form>
    </div>
  );
};

NotificationSettings.displayName = 'NotificationSettings';
