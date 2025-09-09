import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Settings, Building, CreditCard, Mail, Shield } from 'lucide-react';

export function SettingsPage() {
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
              <Input id="office-name" defaultValue="משרד רו״ח טיקו פרנקו" />
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
              <Input id="terminal" type="password" placeholder="****" />
            </div>
            <div>
              <Label htmlFor="api-key">מפתח API</Label>
              <Input id="api-key" type="password" placeholder="****" />
            </div>
            <Button variant="outline">בדוק חיבור</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              הגדרות דוא״ל
            </CardTitle>
            <CardDescription>הגדרות שליחת מכתבים ותזכורות</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="sender-email">כתובת שולח</Label>
              <Input id="sender-email" type="email" defaultValue="office@ticovision.com" />
            </div>
            <div>
              <Label htmlFor="sender-name">שם השולח</Label>
              <Input id="sender-name" defaultValue="משרד רו״ח טיקו פרנקו" />
            </div>
            <Button>עדכן הגדרות</Button>
          </CardContent>
        </Card>

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