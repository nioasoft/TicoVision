import { HardHat, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function UnderConstructionPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <HardHat className="h-16 w-16 text-amber-500" />
            <Wrench className="h-10 w-10 text-gray-400" />
          </div>
          <h1 className="text-2xl font-bold text-gray-800 mb-3">
            פיתוח בבנייה
          </h1>
          <p className="text-gray-500">
            העמוד בפיתוח, יהיה זמין בקרוב
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
