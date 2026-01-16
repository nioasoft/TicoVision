# Implementation Plan: שיפור עורך הטקסט העשיר

## Overview

שיפור עורך TipTap הקיים לפתרון בעיות paste, bold, וניהול עיצוב. בנוסף, בניית POC עם Lexical להשוואה.

---

## Phase 1: תיקון בעיות Paste ו-Bold

שיפור התנהגות ההדבקה והעיצוב בעורך הקיים.

### Tasks

- [ ] הוספת `transformPastedHTML` לניקוי עיצוב בהדבקה
- [ ] הוספת תמיכה ב-Ctrl+Shift+V להדבקה נקייה
- [ ] בדיקה ותיקון FontSize extension priority עם bold/italic

### Technical Details

**קובץ לעריכה:** `src/components/editor/TiptapEditor.tsx`

**transformPastedHTML Implementation:**
```typescript
// Add to useEditor configuration
editorProps: {
  // ... existing props
  transformPastedHTML(html: string) {
    // Create a temporary DOM element
    const doc = new DOMParser().parseFromString(html, 'text/html');

    // Remove unwanted inline styles
    doc.querySelectorAll('[style]').forEach(el => {
      const style = el.getAttribute('style') || '';
      // Keep only basic formatting
      const keepStyles = style.match(/(font-weight|font-style|text-decoration):[^;]+/g);
      if (keepStyles) {
        el.setAttribute('style', keepStyles.join(';'));
      } else {
        el.removeAttribute('style');
      }
    });

    // Remove font-family and font-size from any element
    doc.querySelectorAll('*').forEach(el => {
      el.style.fontFamily = '';
      el.style.fontSize = '';
    });

    return doc.body.innerHTML;
  },
},
```

**Ctrl+Shift+V Handler:**
```typescript
// Add keyboard shortcut in addKeyboardShortcuts or via editorProps
handleKeyDown(view, event) {
  // Ctrl+Shift+V or Cmd+Shift+V = paste as plain text
  if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'v') {
    event.preventDefault();
    navigator.clipboard.readText().then(text => {
      editor.commands.insertContent(text);
    });
    return true;
  }
  return false;
}
```

**FontSize Priority Check:**
- קובץ: `src/components/editor/TiptapEditor.tsx` שורה ~226
- ה-FontSize extension כבר ב-priority 1000
- לבדוק אם ה-TextStyle extension מתנגש

---

## Phase 2: כפתור "נקה עיצוב"

הוספת כפתור לסרגל הכלים להסרת כל העיצוב.

### Tasks

- [ ] הוספת כפתור "נקה עיצוב" לסרגל הכלים
- [ ] מימוש פונקציית clearFormatting שמסירה marks ו-nodes

### Technical Details

**קובץ לעריכה:** `src/components/editor/TiptapEditor.tsx`

**כפתור בסרגל הכלים:**
```tsx
// Add to toolbar buttons section (around line 600+)
<Button
  variant="ghost"
  size="icon"
  onClick={() => {
    editor.chain()
      .focus()
      .unsetAllMarks()  // Remove bold, italic, color, etc.
      .clearNodes()      // Convert special nodes to paragraphs
      .run();
  }}
  title="נקה עיצוב"
>
  <RemoveFormatting className="h-4 w-4" />
</Button>
```

**Import needed:**
```typescript
import { RemoveFormatting } from 'lucide-react';
```

**מיקום בסרגל:** אחרי כפתורי הצבע/highlight, לפני הטבלאות

---

## Phase 3: פיצול אוטומטי ל-Bullets

שיפור התנהגות ה-bullets כך שיפצלו טקסט מרובה שורות.

### Tasks

- [ ] שינוי לוגיקת toggle bullets לפיצול אוטומטי לפי שורות
- [ ] עדכון ColoredBulletButtons.tsx עם הלוגיקה החדשה

### Technical Details

**קובץ לעריכה:** `src/components/editor/ColoredBulletButtons.tsx`

**לוגיקת פיצול:**
```typescript
const applyBulletWithSplit = (editor: Editor, bulletCommand: string) => {
  const { state } = editor;
  const { from, to } = state.selection;

  // Get selected text
  const selectedText = state.doc.textBetween(from, to, '\n');

  // Check if text contains newlines
  if (selectedText.includes('\n')) {
    const lines = selectedText.split('\n').filter(line => line.trim());

    // Delete selected content first
    editor.commands.deleteSelection();

    // Insert each line as a separate bullet
    lines.forEach((line, index) => {
      if (index > 0) {
        editor.commands.enter();
      }
      editor.commands.insertContent(line);
      editor.commands[bulletCommand]();
    });
  } else {
    // No newlines - apply bullet normally
    editor.commands[bulletCommand]();
  }
};
```

**עדכון הכפתורים:**
```tsx
// Update button onClick handlers
onClick={() => applyBulletWithSplit(editor, 'toggleBlueBullet')}
```

---

## Phase 4: POC עם Lexical [complex]

בניית עורך חדש עם Lexical להשוואה.

### Tasks

- [ ] התקנת Lexical packages
- [ ] יצירת LexicalEditor.tsx component
  - [ ] הגדרת RTL ועברית
  - [ ] הוספת toolbar בסיסי (bold, italic, underline)
  - [ ] הוספת צבעי טקסט
  - [ ] הוספת יישור (ימין, מרכז, שמאל)
  - [ ] הוספת רשימות (bullets, numbers)
- [ ] יצירת דף השוואה EditorDemo.tsx
- [ ] הוספת route `/editor-demo`

### Technical Details

**התקנת packages:**
```bash
npm install lexical @lexical/react @lexical/rich-text @lexical/list @lexical/selection @lexical/utils
```

**קבצים ליצירה:**
- `src/components/editor/LexicalEditor.tsx`
- `src/pages/EditorDemo.tsx`

**LexicalEditor.tsx Structure:**
```tsx
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import LexicalErrorBoundary from '@lexical/react/LexicalErrorBoundary';

const initialConfig = {
  namespace: 'TicoVisionEditor',
  theme: {
    rtl: 'text-right',
    paragraph: 'mb-2',
    text: {
      bold: 'font-bold',
      italic: 'italic',
      underline: 'underline',
    },
  },
  onError: (error: Error) => console.error(error),
};

export function LexicalEditor({ value, onChange }: Props) {
  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className="editor-container" dir="rtl">
        <ToolbarPlugin />
        <RichTextPlugin
          contentEditable={<ContentEditable className="editor-input" />}
          placeholder={<div className="editor-placeholder">הקלד כאן...</div>}
          ErrorBoundary={LexicalErrorBoundary}
        />
        <HistoryPlugin />
        <ListPlugin />
      </div>
    </LexicalComposer>
  );
}
```

**EditorDemo.tsx:**
```tsx
export function EditorDemo() {
  const [tiptapContent, setTiptapContent] = useState('');
  const [lexicalContent, setLexicalContent] = useState('');

  return (
    <div className="grid grid-cols-2 gap-4 p-4" dir="rtl">
      <div>
        <h2 className="text-xl font-bold mb-2">TipTap (נוכחי)</h2>
        <TiptapEditor value={tiptapContent} onChange={setTiptapContent} />
      </div>
      <div>
        <h2 className="text-xl font-bold mb-2">Lexical (חדש)</h2>
        <LexicalEditor value={lexicalContent} onChange={setLexicalContent} />
      </div>
    </div>
  );
}
```

**Route addition in App.tsx:**
```tsx
import { EditorDemo } from '@/pages/EditorDemo';

// Add to routes
<Route path="/editor-demo" element={<EditorDemo />} />
```

---

## Verification

### לאחר Phase 1-3 (TipTap fixes):
1. פתח Universal Letters builder (`/letters/universal`)
2. העתק טקסט מ-Word עם bold וצבעים
3. הדבק - וודא שהפונט נשאר David Libre
4. נסה Ctrl+Shift+V - וודא שמדביק טקסט נקי
5. הפעל bold - וודא שהפונט לא משתנה
6. בחר טקסט מעוצב ולחץ "נקה עיצוב" - וודא שהעיצוב נמחק
7. כתוב 3 שורות עם Enter, בחר הכל, לחץ bullet - וודא ש-3 bullets נוצרו

### לאחר Phase 4 (Lexical POC):
1. נווט ל-`/editor-demo`
2. בדוק ששני העורכים מוצגים side-by-side
3. נסה paste מ-Word בשניהם
4. השווה התנהגות RTL, bold, colors
5. בדוק ביצועים עם טקסט ארוך
