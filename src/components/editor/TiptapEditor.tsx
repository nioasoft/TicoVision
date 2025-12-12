import React, { useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';

// Custom Image extension with width/height support and text alignment
const ResizableImage = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      width: {
        default: null,
        parseHTML: element => element.getAttribute('width'),
        renderHTML: attributes => {
          if (!attributes.width) return {};
          return { width: attributes.width };
        },
      },
      height: {
        default: null,
        parseHTML: element => element.getAttribute('height'),
        renderHTML: attributes => {
          if (!attributes.height) return {};
          return { height: attributes.height };
        },
      },
      textAlign: {
        default: 'right',
        parseHTML: element => element.getAttribute('data-text-align') || element.style.textAlign || 'right',
        renderHTML: attributes => {
          if (!attributes.textAlign) return {};
          return { 'data-text-align': attributes.textAlign };
        },
      },
      style: {
        default: null,
        parseHTML: element => element.getAttribute('style'),
        renderHTML: attributes => {
          const styles: string[] = ['display: block'];
          if (attributes.width) styles.push(`width: ${attributes.width}px`);
          if (attributes.height) styles.push(`height: ${attributes.height}px`);
          // Apply text alignment as margin for block images
          if (attributes.textAlign === 'center') {
            styles.push('margin-left: auto', 'margin-right: auto');
          } else if (attributes.textAlign === 'left') {
            styles.push('margin-left: 0', 'margin-right: auto');
          } else {
            // right (default for RTL)
            styles.push('margin-left: auto', 'margin-right: 0');
          }
          return { style: styles.join('; ') };
        },
      },
    };
  },
});
import { Bold, Italic, UnderlineIcon, List, ListOrdered, Heading1, Heading2, Undo, Redo, Minus, Palette, Highlighter, Type, AlignLeft, AlignCenter, AlignRight, Stamp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BlueBullet, DarkRedBullet, BlackBullet } from './extensions/ColoredBullet';
import { ColoredBulletButtons } from './ColoredBulletButtons';

// Import ProseMirror CSS for proper white-space handling
import 'prosemirror-view/style/prosemirror.css';

// Custom FontSize extension - simple inline style setter
const FontSize = Extension.create({
  name: 'fontSize',

  addGlobalAttributes() {
    return [
      {
        types: ['textStyle'],
        attributes: {
          fontSize: {
            default: null,
            parseHTML: element => element.style.fontSize || null,
            renderHTML: attributes => {
              if (!attributes.fontSize) {
                return {};
              }
              return {
                style: `font-size: ${attributes.fontSize}`,
              };
            },
          },
        },
      },
    ];
  },

  addCommands() {
    return {
      setFontSize: (fontSize: string) => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize })
          .run();
      },
      unsetFontSize: () => ({ chain }) => {
        return chain()
          .setMark('textStyle', { fontSize: null })
          .removeEmptyTextStyle()
          .run();
      },
    };
  },

  // CRITICAL: Priority ensures fontSize works with bold/italic marks
  // Higher priority = applied later in mark stack = renders as outer wrapper
  priority: 1000,
});

interface TiptapEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  minHeight?: string;
  className?: string;
}

export const TiptapEditor: React.FC<TiptapEditorProps> = ({
  value,
  onChange,
  minHeight = '300px',
  className
}) => {
  // Memoize extensions to prevent duplicate extension warning in React Strict Mode
  const extensions = useMemo(() => [
    StarterKit.configure({
      heading: {
        levels: [1, 2, 3],
      },
      horizontalRule: true, // Enable horizontal rule
      paragraph: {
        HTMLAttributes: {
          style: 'margin-bottom: 1em; min-height: 1em;', // Preserve spacing + min height for empty paragraphs
        },
      },
      hardBreak: {
        keepMarks: true, // Preserve formatting across line breaks
      },
      strike: false, // Disable strike (we don't use it, reduces extensions)
    }),
    TextAlign.configure({
      types: ['paragraph', 'image'], // Apply to paragraphs and images
      alignments: ['left', 'center', 'right'],
      defaultAlignment: 'right', // RTL default
    }),
    Color,
    TextStyle,
    FontSize, // Custom font size extension
    Highlight.configure({
      multicolor: true, // Allow multiple highlight colors
    }),
    BlueBullet,
    DarkRedBullet,
    BlackBullet,
    ResizableImage.configure({
      inline: false, // Block-level for text alignment to work
      allowBase64: false,
      HTMLAttributes: {
        style: 'display: block;',
      },
    }),
  ], []); // Empty dependency array - extensions never change

  const editor = useEditor({
    extensions,
    content: value,
    editorProps: {
      attributes: {
        class: cn(
          'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none',
          'rtl:text-right ltr:text-left',
          'font-[\'David_Libre\',\'Heebo\',\'Assistant\',sans-serif]',
          'text-base leading-relaxed',
          'p-4'
        ),
        dir: 'rtl',
        style: `min-height: ${minHeight}; white-space: pre-line;`, // Preserve line breaks
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  // Sync editor content when value prop changes externally (e.g., loading a saved template)
  React.useEffect(() => {
    if (editor && value !== editor.getHTML()) {
      editor.commands.setContent(value);
    }
  }, [editor, value]);

  if (!editor) {
    return null;
  }

  return (
    <div className={cn('border rounded-lg', className)} dir="rtl">
      {/* Toolbar - sticky for long letters */}
      <div className="sticky top-0 z-10 border-b bg-muted/50 p-2 flex items-center gap-1 flex-wrap rtl:flex-row-reverse">
        {/* Text formatting */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBold().run()}
            title="מודגש (Ctrl+B)"
          >
            <Bold className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            title="נטוי (Ctrl+I)"
          >
            <Italic className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('underline') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleUnderline().run()}
            title="קו תחתון (Ctrl+U)"
          >
            <UnderlineIcon className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Headings */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant={editor.isActive('heading', { level: 1 }) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
            title="כותרת 1"
          >
            <Heading1 className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            title="כותרת 2"
          >
            <Heading2 className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Text Alignment */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'right' }) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('right').run()}
            title="יישור לימין"
          >
            <AlignRight className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'center' }) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('center').run()}
            title="מרכוז"
          >
            <AlignCenter className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive({ textAlign: 'left' }) ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setTextAlign('left').run()}
            title="יישור לשמאל"
          >
            <AlignLeft className="h-4 w-4" />
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Font Size */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant={editor.getAttributes('textStyle').fontSize === '16px' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setFontSize('16px').run()}
            title="גודל רגיל (16px)"
          >
            <Type className="h-4 w-4" />
            <span className="text-xs mr-0.5">רגיל</span>
          </Button>

          <Button
            type="button"
            variant={editor.getAttributes('textStyle').fontSize === '19px' ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().setFontSize('19px').run()}
            title="גודל גדול (19px)"
          >
            <Type className="h-4 w-4" />
            <span className="text-xs mr-0.5">גדול</span>
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            title="רשימה עם תבליטים"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            title="רשימה ממוספרת"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          {/* Colored Bullets (Blue, Dark Red, Black) */}
          <ColoredBulletButtons editor={editor} />

          {/* Horizontal Rule */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="קו מפריד אופקי"
          >
            <Minus className="h-4 w-4" />
          </Button>

          {/* Tico Signature/Stamp */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              editor.chain().focus().setImage({
                src: '/brand/tico_signature.png',
                alt: 'חתימת תיקו',
                width: '88',
                height: '39',
              }).run();
            }}
            title="הוסף חתימת תיקו"
          >
            <Stamp className="h-4 w-4" />
          </Button>

          {/* Add period at end of each line (preserves formatting) */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const { state } = editor;
              const { from, to } = state.selection;

              // Find all text nodes in selection and add period at end of each block
              const tr = state.tr;
              let offset = 0;

              state.doc.nodesBetween(from, to, (node, pos) => {
                // Only process text-containing blocks (paragraphs, bullets, etc.)
                if (node.isBlock && node.textContent) {
                  const text = node.textContent.trimEnd();
                  const lastChar = text.slice(-1);

                  // Skip if already ends with punctuation
                  if (text && !'.?!:'.includes(lastChar)) {
                    // Find the actual end position of text in this node
                    const nodeEnd = pos + node.nodeSize - 1;
                    const textEnd = pos + 1 + node.textContent.length;

                    // Insert period at end of text content
                    tr.insertText('.', textEnd + offset);
                    offset += 1;
                  }
                }
                return true;
              });

              if (offset > 0) {
                editor.view.dispatch(tr);
              }
            }}
            title="הוסף נקודה בסוף כל שורה"
          >
            <span className="text-base font-bold leading-none">.</span>
          </Button>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Colors */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          {/* Text Color */}
          <div className="flex items-center gap-0.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setColor('#000000').run()}
              title="שחור"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#000000' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setColor('#395BF7').run()}
              title="כחול"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#395BF7' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setColor('#DC2626').run()}
              title="אדום"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#DC2626' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().setColor('#16A34A').run()}
              title="ירוק"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#16A34A' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().unsetColor().run()}
              title="ביטול צבע"
              className="w-6 h-6 p-0"
            >
              <Palette className="h-3 w-3" />
            </Button>
          </div>

          {/* Background/Highlight Color */}
          <div className="flex items-center gap-0.5 mr-1">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#FEF08A' }).run()}
              title="הדגשה צהובה"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#FEF08A' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#BBF7D0' }).run()}
              title="הדגשה ירוקה"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#BBF7D0' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#BFDBFE' }).run()}
              title="הדגשה כחולה"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#BFDBFE' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().toggleHighlight({ color: '#E5E5E5' }).run()}
              title="הדגשה אפורה"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#E5E5E5' }} />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => editor.chain().focus().unsetHighlight().run()}
              title="ביטול הדגשה"
              className="w-6 h-6 p-0"
            >
              <Highlighter className="h-3 w-3" />
            </Button>
          </div>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Undo/Redo */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().undo().run()}
            disabled={!editor.can().undo()}
            title="ביטול (Ctrl+Z)"
          >
            <Undo className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => editor.chain().focus().redo().run()}
            disabled={!editor.can().redo()}
            title="ביצוע מחדש (Ctrl+Y)"
          >
            <Redo className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Editor content */}
      <EditorContent editor={editor} />
    </div>
  );
};
