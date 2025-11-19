import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';

/**
 * Universal letter builder - V2
 * TODO: Phase 5 - Full implementation
 */
export function UniversalBuilderV2() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>בונה מכתבים אוניברסלי - גרסה 2</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-center py-12">
          <p className="text-muted-foreground">
            מערכת חדשה לבניית מכתבים מותאמים אישית
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
