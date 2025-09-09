import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FileText, Send } from 'lucide-react';

export function LettersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול מכתבים</h1>
          <p className="text-gray-500 mt-1">11 תבניות מכתבים זמינות</p>
        </div>
        <Button>
          <Send className="h-4 w-4 ml-2" />
          שלח מכתבים
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[
          'הודעת שכר טרחה שנתי',
          'העלאת שכר עם אינפלציה',
          'העלאת שכר ריאלית',
          'תזכורת תשלום עדינה',
          'תזכורת תשלום נחרצת',
          'הודעת חוב',
          'אזהרת הפסקת שירות',
          'אישור תשלום',
          'ברוך הבא ללקוח חדש',
          'הודעת סיום שירות',
          'מכתב ייעוץ מותאם',
        ].map((template, index) => (
          <Card key={index} className="cursor-pointer hover:shadow-lg transition-shadow">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileText className="h-4 w-4" />
                {template}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-500">לחץ לעריכה ושליחה</p>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}