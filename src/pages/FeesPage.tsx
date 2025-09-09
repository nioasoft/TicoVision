import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Calculator } from 'lucide-react';

export function FeesPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול שכר טרחה</h1>
          <p className="text-gray-500 mt-1">חישוב וניהול שכר טרחה שנתי</p>
        </div>
        <Button>
          <Calculator className="h-4 w-4 ml-2" />
          חשב שכר טרחה
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>חישובי שכר טרחה</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">טבלת חישובי שכר טרחה תופיע כאן</p>
        </CardContent>
      </Card>
    </div>
  );
}