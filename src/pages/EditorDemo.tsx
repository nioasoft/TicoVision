import React, { useState } from 'react';
import { TiptapEditor } from '@/components/editor/TiptapEditor';
import { LexicalEditor } from '@/components/editor/LexicalEditor';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Code, Eye, Maximize2, Minimize2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';

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
// Preview component for rendered HTML
interface PreviewPaneProps {
  content: string;
  onFullscreen?: () => void;
}

function PreviewPane({ content, onFullscreen }: PreviewPaneProps) {
  return (
    <div className="mt-4 border rounded-lg overflow-hidden">
      <Tabs defaultValue="preview" className="w-full">
        <div className="flex items-center justify-between bg-muted px-3 py-1">
          <TabsList className="h-8">
            <TabsTrigger value="preview" className="text-xs gap-1.5 h-7">
              <Eye className="h-3.5 w-3.5" />
              תצוגה מקדימה
            </TabsTrigger>
            <TabsTrigger value="html" className="text-xs gap-1.5 h-7">
              <Code className="h-3.5 w-3.5" />
              HTML
            </TabsTrigger>
          </TabsList>
          {onFullscreen && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2"
              onClick={onFullscreen}
              title="תצוגה מלאה"
            >
              <Maximize2 className="h-4 w-4" />
            </Button>
          )}
        </div>
        <TabsContent value="preview" className="m-0">
          <div
            className="p-4 bg-white min-h-[200px] max-h-[400px] overflow-auto preview-content"
            style={{
              fontFamily: '"David Libre", "Heebo", "Assistant", sans-serif',
              fontSize: '16px',
              lineHeight: '1.5',
              direction: 'rtl'
            }}
          >
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <p style={{ color: '#999', textAlign: 'right' }}>(ריק)</p>
            )}
          </div>
        </TabsContent>
        <TabsContent value="html" className="m-0">
          <pre className="p-3 text-xs overflow-auto max-h-[400px] whitespace-pre-wrap bg-slate-50 font-mono">
            {content || '(ריק)'}
          </pre>
        </TabsContent>
      </Tabs>
    </div>
  );
}

// Fullscreen preview dialog
interface FullscreenPreviewProps {
  open: boolean;
  onClose: () => void;
  content: string;
  title: string;
}

function FullscreenPreview({ open, onClose, content, title }: FullscreenPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="flex-shrink-0">
          <DialogTitle className="text-right flex items-center justify-between">
            <span>תצוגה מקדימה - {title}</span>
            <Button variant="ghost" size="sm" onClick={onClose}>
              <Minimize2 className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-auto border rounded-lg bg-white p-6">
          <div
            className="preview-content"
            style={{
              fontFamily: '"David Libre", "Heebo", "Assistant", sans-serif',
              fontSize: '16px',
              lineHeight: '1.5',
              direction: 'rtl'
            }}
          >
            {content ? (
              <div dangerouslySetInnerHTML={{ __html: content }} />
            ) : (
              <p style={{ color: '#999', textAlign: 'right' }}>(ריק)</p>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function EditorDemo() {
  const [tiptapContent, setTiptapContent] = useState('');
  const [lexicalContent, setLexicalContent] = useState('');
  const [fullscreenPreview, setFullscreenPreview] = useState<{ content: string; title: string } | null>(null);

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
            <PreviewPane
              content={tiptapContent}
              onFullscreen={() => setFullscreenPreview({ content: tiptapContent, title: 'TipTap' })}
            />
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
            <PreviewPane
              content={lexicalContent}
              onFullscreen={() => setFullscreenPreview({ content: lexicalContent, title: 'Lexical' })}
            />
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

      {/* Fullscreen Preview Dialog */}
      <FullscreenPreview
        open={fullscreenPreview !== null}
        onClose={() => setFullscreenPreview(null)}
        content={fullscreenPreview?.content || ''}
        title={fullscreenPreview?.title || ''}
      />
    </div>
  );
}
