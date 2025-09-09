import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { UserPlus } from 'lucide-react';

export function UsersPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">ניהול משתמשים</h1>
          <p className="text-gray-500 mt-1">ניהול הרשאות וגישה למערכת</p>
        </div>
        <Button>
          <UserPlus className="h-4 w-4 ml-2" />
          הוסף משתמש
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>רשימת משתמשים</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-500">רשימת המשתמשים תופיע כאן</p>
        </CardContent>
      </Card>
    </div>
  );
}