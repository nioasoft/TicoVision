import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LetterDisplayDialog } from './LetterDisplayDialog';

/**
 * Fee letters builder - V2
 * TODO: Phase 5 - Full implementation
 */
export function LetterBuilderV2() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>מכתבי שכר טרחה - גרסה 2</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12">
            <p className="text-muted-foreground mb-4">
              מערכת חדשה לבניית מכתבי שכר טרחה
            </p>
            <Button onClick={() => setPreviewOpen(true)}>
              תצוגה מקדימה (Demo)
            </Button>
          </div>
        </CardContent>
      </Card>

      <LetterDisplayDialog
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        mode="preview"
        letterType="fee"
        previewHtml={previewHtml}
      />
    </div>
  );
}
