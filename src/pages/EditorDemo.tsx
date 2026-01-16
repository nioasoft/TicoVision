import React, { useState } from 'react';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { LexicalEditor } from '@/components/editor/LexicalEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

/**
 * Editor Comparison Demo Page
 * Side-by-side comparison of TipTap (current) and Lexical (POC) editors
 *
 * Use this page to test:
 * - Paste behavior from Word/Google Docs
 * - Hebrew text and RTL support
 * - Bold/italic formatting
 * - List behavior
 */
export function EditorDemo() {
  const [tiptapContent, setTiptapContent] = useState('');
  const [lexicalContent, setLexicalContent] = useState('');

  return (
    <div className="container mx-auto p-4" dir="rtl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-2 text-right">השוואת עורכי טקסט</h1>
        <p className="text-muted-foreground text-right">
          השווה בין TipTap (נוכחי) ל-Lexical (POC) - נסה להדביק טקסט מ-Word או Google Docs
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* TipTap Editor (Current) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-right">TipTap (נוכחי)</CardTitle>
            <CardDescription className="text-right">
              העורך הקיים במערכת - כולל את כל התכונות
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TiptapEditor
              value={tiptapContent}
              onChange={setTiptapContent}
              minHeight="400px"
            />
            <div className="mt-4 p-3 bg-muted rounded text-sm text-right">
              <strong>תוכן:</strong>
              <pre className="mt-2 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                {tiptapContent || '(ריק)'}
              </pre>
            </div>
          </CardContent>
        </Card>

        {/* Lexical Editor (POC) */}
        <Card>
          <CardHeader>
            <CardTitle className="text-right">Lexical (חדש - POC)</CardTitle>
            <CardDescription className="text-right">
              עורך חדש מ-Meta - בדיקת התאמה לדרישות
            </CardDescription>
          </CardHeader>
          <CardContent>
            <LexicalEditor
              onChange={setLexicalContent}
              minHeight="400px"
            />
            <div className="mt-4 p-3 bg-muted rounded text-sm text-right">
              <strong>תוכן:</strong>
              <pre className="mt-2 text-xs overflow-auto max-h-32 whitespace-pre-wrap">
                {lexicalContent || '(ריק)'}
              </pre>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Testing Instructions */}
      <Card className="mt-6">
        <CardHeader>
          <CardTitle className="text-right">הוראות בדיקה</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-right">
            <div>
              <h3 className="font-semibold mb-2">בדיקות הדבקה:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>העתק טקסט מ-Word עם עיצובים</li>
                <li>העתק טקסט מ-Google Docs</li>
                <li>נסה Ctrl+Shift+V להדבקה נקייה</li>
                <li>בדוק שהפונט נשאר David Libre</li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-2">בדיקות עיצוב:</h3>
              <ul className="list-disc list-inside space-y-1 text-sm text-muted-foreground">
                <li>הפעל Bold - בדוק שהפונט לא משתנה</li>
                <li>בדוק יישור טקסט (ימין/מרכז/שמאל)</li>
                <li>צור רשימות (bullets/numbers)</li>
                <li>בדוק תמיכה ב-RTL ועברית</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
