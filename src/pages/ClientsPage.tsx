import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';

export function ClientsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול לקוחות</h1>
          <p className="text-gray-500 mt-1">546 לקוחות פעילים</p>
        </div>
        <Button>
          <Plus className="h-4 w-4 ml-2" />
          הוסף לקוח חדש
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>רשימת לקוחות</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">רשימת הלקוחות תופיע כאן</p>
        </CardContent>
      </Card>
    </div>
  );
}