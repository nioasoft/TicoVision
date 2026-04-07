import { HardHat, Wrench } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function UnderConstructionPage() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Card className="w-full max-w-md border-border/90 shadow-sm">
        <CardContent className="pt-10 pb-10 text-center">
          <div className="flex justify-center items-center gap-3 mb-6">
            <HardHat className="h-16 w-16 text-primary" />
            <Wrench className="h-10 w-10 text-muted-foreground" />
          </div>
          <h1 className="mb-3 text-2xl font-bold text-foreground">
            פיתוח בבנייה
          </h1>
          <p className="text-sm text-muted-foreground/60 mb-2 italic">Under Pressure — Coming Soon</p>
          <p className="text-muted-foreground">
            העמוד בפיתוח, יהיה זמין בקרוב
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
