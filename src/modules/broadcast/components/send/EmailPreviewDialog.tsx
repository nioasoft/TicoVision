/**
 * Email Preview Dialog - Preview HTML email before sending
 */

import React, { useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

interface EmailPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subject: string;
  content: string;
  fromName?: string;
  fromEmail?: string;
}

/**
 * Build HTML preview matching the Edge Function format
 */
function buildPreviewHtml(content: string): string {
  return `<!DOCTYPE html>
<html lang="he" dir="rtl">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <style>
    body {
      margin: 0;
      padding: 20px;
      direction: rtl;
      background-color: #ffffff;
      font-family: Arial, 'Heebo', sans-serif;
    }
    .content {
      max-width: 600px;
      margin: 0 auto;
      text-align: right;
      line-height: 1.6;
      font-size: 16px;
      color: #333;
    }
  </style>
</head>
<body>
  <div class="content">
    ${content.replace(/\n/g, '<br>')}
  </div>
</body>
</html>`;
}

export const EmailPreviewDialog: React.FC<EmailPreviewDialogProps> = ({
  open,
  onOpenChange,
  subject,
  content,
  fromName = 'פרנקו ושות',
  fromEmail = 'sigal@franco.co.il',
}) => {
  const previewHtml = useMemo(() => buildPreviewHtml(content), [content]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] flex flex-col" dir="rtl">
        <DialogHeader>
          <DialogTitle className="rtl:text-right">תצוגה מקדימה</DialogTitle>
        </DialogHeader>

        {/* Email metadata */}
        <div className="space-y-2 text-sm border-b pb-4">
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[60px]">מאת:</span>
            <span className="font-medium">{fromName} &lt;{fromEmail}&gt;</span>
          </div>
          <div className="flex items-start gap-2">
            <span className="text-muted-foreground min-w-[60px]">נושא:</span>
            <span className="font-medium">{subject || '(לא הוגדר)'}</span>
          </div>
        </div>

        {/* Email content in sandboxed iframe */}
        <div className="flex-1 min-h-[400px] border rounded-lg overflow-hidden bg-white">
          {content ? (
            <iframe
              srcDoc={previewHtml}
              title="תצוגה מקדימה של המייל"
              className="w-full h-full border-0"
              sandbox="allow-same-origin"
            />
          ) : (
            <div className="flex items-center justify-center h-full text-muted-foreground">
              אין תוכן להצגה
            </div>
          )}
        </div>

        <p className="text-xs text-muted-foreground rtl:text-right">
          זוהי תצוגה מקדימה של המייל כפי שיופיע אצל הנמענים
        </p>
      </DialogContent>
    </Dialog>
  );
};
