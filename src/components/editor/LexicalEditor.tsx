import React, { useCallback, useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $getRoot,
} from 'lexical';
import type { EditorState } from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  ListItemNode,
} from '@lexical/list';
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Undo,
  Redo,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Theme configuration for Lexical
const theme = {
  ltr: 'ltr',
  rtl: 'rtl text-right',
  paragraph: 'mb-2 text-right',
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
  },
  list: {
    nested: {
      listitem: 'list-none',
    },
    ol: 'list-decimal list-inside mr-4',
    ul: 'list-disc list-inside mr-4',
    listitem: 'mb-1',
  },
};

// Error handler
function onError(error: Error) {
  console.error('Lexical Error:', error);
}

// Toolbar component
function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);

  // Update toolbar state based on selection
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
    }
  }, []);

  useEffect(() => {
    return editor.registerUpdateListener(({ editorState }) => {
      editorState.read(() => {
        updateToolbar();
      });
    });
  }, [editor, updateToolbar]);

  return (
    <div className="sticky top-0 z-10 border-b bg-muted/50 p-2 flex items-center gap-1 flex-wrap rtl:flex-row-reverse">
      {/* Text formatting */}
      <div className="flex items-center gap-1 rtl:flex-row-reverse">
        <Button
          type="button"
          variant={isBold ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold');
          }}
          title="מודגש (Ctrl+B)"
        >
          <Bold className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isItalic ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic');
          }}
          title="נטוי (Ctrl+I)"
        >
          <Italic className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant={isUnderline ? 'secondary' : 'ghost'}
          size="sm"
          onClick={() => {
            editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline');
          }}
          title="קו תחתון (Ctrl+U)"
        >
          <Underline className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Text Alignment */}
      <div className="flex items-center gap-1 rtl:flex-row-reverse">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right');
          }}
          title="יישור לימין"
        >
          <AlignRight className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center');
          }}
          title="מרכוז"
        >
          <AlignCenter className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left');
          }}
          title="יישור לשמאל"
        >
          <AlignLeft className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Lists */}
      <div className="flex items-center gap-1 rtl:flex-row-reverse">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined);
          }}
          title="רשימה עם תבליטים"
        >
          <List className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined);
          }}
          title="רשימה ממוספרת"
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
      </div>

      <div className="h-6 w-px bg-border mx-1" />

      {/* Undo/Redo */}
      <div className="flex items-center gap-1 rtl:flex-row-reverse">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.dispatchCommand(UNDO_COMMAND, undefined);
          }}
          title="ביטול (Ctrl+Z)"
        >
          <Undo className="h-4 w-4" />
        </Button>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => {
            editor.dispatchCommand(REDO_COMMAND, undefined);
          }}
          title="ביצוע מחדש (Ctrl+Y)"
        >
          <Redo className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

interface LexicalEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export const LexicalEditor: React.FC<LexicalEditorProps> = ({
  onChange,
  placeholder = 'הקלד כאן...',
  minHeight = '300px',
  className,
}) => {
  const initialConfig = {
    namespace: 'TicoVisionEditor',
    theme,
    onError,
    nodes: [ListNode, ListItemNode],
  };

  const handleChange = useCallback(
    (editorState: EditorState) => {
      editorState.read(() => {
        // For now, just serialize to JSON - we can add HTML export later
        const root = $getRoot();
        const textContent = root.getTextContent();
        onChange?.(textContent);
      });
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('border rounded-lg', className)} dir="rtl">
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none',
                  'rtl:text-right ltr:text-left',
                  "font-['David_Libre','Heebo','Assistant',sans-serif]",
                  'text-base leading-[1.2]',
                  'p-4'
                )}
                style={{ minHeight }}
              />
            }
            placeholder={
              <div className="absolute top-4 right-4 text-gray-400 pointer-events-none">
                {placeholder}
              </div>
            }
            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <OnChangePlugin onChange={handleChange} />
      </div>
    </LexicalComposer>
  );
};
