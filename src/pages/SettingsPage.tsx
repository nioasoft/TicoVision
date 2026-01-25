import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building, CreditCard, Mail, Shield, Loader2, Check } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { authService } from '@/services/auth.service';
import { logger } from '@/lib/logger';
import { toast } from 'sonner';

interface EmailSettings {
  sender_email: string;
  sender_name: string;
  reply_to_email: string;
  alert_email: string;
}

export function SettingsPage() {
  const [isSuperAdmin, setIsSuperAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [emailSettings, setEmailSettings] = useState<EmailSettings>({
    sender_email: '',
    sender_name: '',
    reply_to_email: '',
    alert_email: '',
  });

  useEffect(() => {
    async function loadData() {
      try {
        // Check if user is super admin
        const isSuper = await authService.isSuperAdmin();
        setIsSuperAdmin(isSuper);

        if (isSuper) {
          // Load email settings from tenant_settings
          const { data, error } = await supabase
            .from('tenant_settings')
            .select('sender_email, sender_name, reply_to_email, alert_email')
            .single();

          if (error) {
            logger.error('Failed to load email settings:', error);
          } else if (data) {
            setEmailSettings({
              sender_email: data.sender_email || '',
              sender_name: data.sender_name || '',
              reply_to_email: data.reply_to_email || '',
              alert_email: data.alert_email || '',
            });
          }
        }
      } catch (err) {
        logger.error('Error loading settings:', err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, []);

  const handleSaveEmailSettings = async () => {
    setSaving(true);
    try {
      const { error } = await supabase
        .from('tenant_settings')
        .update({
          sender_email: emailSettings.sender_email,
          sender_name: emailSettings.sender_name,
          reply_to_email: emailSettings.reply_to_email,
          alert_email: emailSettings.alert_email,
          updated_at: new Date().toISOString(),
        })
        .not('id', 'is', null); // Update all rows (should be just one)

      if (error) {
        throw error;
      }

      toast.success('הגדרות המייל נשמרו בהצלחה');
    } catch (err) {
      logger.error('Failed to save email settings:', err);
      toast.error('שגיאה בשמירת ההגדרות');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">הגדרות מערכת</h1>
        <p className="text-gray-500 mt-1">הגדרות כלליות ואינטגרציות</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building className="h-5 w-5" />
              פרטי המשרד
            </CardTitle>
            <CardDescription>הגדרות בסיסיות של משרד רואי החשבון</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="office-name">שם המשרד</Label>
              <Input id="office-name" defaultValue="משרד רו״ח תיקו פרנקו" />
            </div>
            <div>
              <Label htmlFor="tax-id">מספר עוסק מורשה</Label>
              <Input id="tax-id" defaultValue="123456789" />
            </div>
            <Button>שמור שינויים</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CreditCard className="h-5 w-5" />
              הגדרות תשלום
            </CardTitle>
            <CardDescription>חיבור ל-Cardcom לעיבוד תשלומים</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="terminal">מספר מסוף</Label>
              <Input id="terminal" type="password" />
            </div>
            <div>
              <Label htmlFor="api-key">מפתח API</Label>
              <Input id="api-key" type="password" />
            </div>
            <Button variant="outline">בדוק חיבור</Button>
          </CardContent>
        </Card>

        {/* Email Settings - Super Admin Only */}
        {isSuperAdmin && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                הגדרות דוא״ל
              </CardTitle>
              <CardDescription>הגדרות שליחת מכתבים ותזכורות (Super Admin בלבד)</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="sender-email">כתובת שולח (From)</Label>
                <Input
                  id="sender-email"
                  type="email"
                  value={emailSettings.sender_email}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_email: e.target.value }))}

                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="sender-name">שם השולח</Label>
                <Input
                  id="sender-name"
                  value={emailSettings.sender_name}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, sender_name: e.target.value }))}

                />
              </div>
              <div>
                <Label htmlFor="reply-to">כתובת Reply-To</Label>
                <Input
                  id="reply-to"
                  type="email"
                  value={emailSettings.reply_to_email}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, reply_to_email: e.target.value }))}

                  dir="ltr"
                />
              </div>
              <div>
                <Label htmlFor="alert-email">כתובת להתראות מערכת</Label>
                <Input
                  id="alert-email"
                  type="email"
                  value={emailSettings.alert_email}
                  onChange={(e) => setEmailSettings(prev => ({ ...prev, alert_email: e.target.value }))}

                  dir="ltr"
                />
              </div>
              <Button onClick={handleSaveEmailSettings} disabled={saving}>
                {saving ? (
                  <>
                    <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                    שומר...
                  </>
                ) : (
                  <>
                    <Check className="ml-2 h-4 w-4" />
                    שמור הגדרות מייל
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              אבטחה והרשאות
            </CardTitle>
            <CardDescription>ניהול הרשאות ואבטחת מידע</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label>אימות דו-שלבי</Label>
              <Button variant="outline" size="sm">הפעל</Button>
            </div>
            <div className="flex items-center justify-between">
              <Label>ניתוק אוטומטי</Label>
              <Button variant="outline" size="sm">הגדר</Button>
            </div>
            <div className="flex items-center justify-between">
              <Label>יומן פעילות</Label>
              <Button variant="outline" size="sm">צפה</Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
