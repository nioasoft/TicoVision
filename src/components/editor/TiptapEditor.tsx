import React, { useMemo, useState, useCallback } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { Color } from '@tiptap/extension-color';
import { TextStyle } from '@tiptap/extension-text-style';
import { Extension } from '@tiptap/core';
import Highlight from '@tiptap/extension-highlight';
import Image from '@tiptap/extension-image';
import Link from '@tiptap/extension-link';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableCell from '@tiptap/extension-table-cell';
import TableHeader from '@tiptap/extension-table-header';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";

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

// Custom TableCell extension with background color and width support
const CustomTableCell = TableCell.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      backgroundColor: {
        default: null,
        parseHTML: element => element.getAttribute('data-background-color'),
        renderHTML: attributes => {
          if (!attributes.backgroundColor) {
            return {};
          }
          return {
            'data-background-color': attributes.backgroundColor,
          };
        },
      },
      colwidth: {
        default: null,
        parseHTML: element => {
          const colwidth = element.getAttribute('colwidth');
          return colwidth ? colwidth.split(',').map(Number) : null;
        },
        renderHTML: attributes => {
          if (!attributes.colwidth) {
            return {};
          }
          return {
            colwidth: attributes.colwidth.join(','),
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const style: string[] = [];
    if (HTMLAttributes.backgroundColor) {
      style.push(`background-color: ${HTMLAttributes.backgroundColor}`);
    }
    if (HTMLAttributes.colwidth) {
      const widths = Array.isArray(HTMLAttributes.colwidth) ? HTMLAttributes.colwidth : [HTMLAttributes.colwidth];
      if (widths[0]) {
        style.push(`width: ${widths[0]}px`);
        style.push(`min-width: ${widths[0]}px`);
      }
    }
    return ['td', { ...HTMLAttributes, style: style.join('; ') || undefined }, 0];
  },
});

// Custom TableHeader extension with width support
const CustomTableHeader = TableHeader.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      colwidth: {
        default: null,
        parseHTML: element => {
          const colwidth = element.getAttribute('colwidth');
          return colwidth ? colwidth.split(',').map(Number) : null;
        },
        renderHTML: attributes => {
          if (!attributes.colwidth) {
            return {};
          }
          return {
            colwidth: attributes.colwidth.join(','),
          };
        },
      },
    };
  },
  renderHTML({ HTMLAttributes }) {
    const style: string[] = [];
    if (HTMLAttributes.colwidth) {
      const widths = Array.isArray(HTMLAttributes.colwidth) ? HTMLAttributes.colwidth : [HTMLAttributes.colwidth];
      if (widths[0]) {
        style.push(`width: ${widths[0]}px`);
        style.push(`min-width: ${widths[0]}px`);
      }
    }
    return ['th', { ...HTMLAttributes, style: style.join('; ') || undefined }, 0];
  },
});

import {
  Bold, Italic, UnderlineIcon, List, ListOrdered, Heading1, Heading2,
  Undo, Redo, Minus, Palette, Highlighter, Type, AlignLeft, AlignCenter,
  AlignRight, Stamp, Table as TableIcon, Trash2, Plus, Split, Merge,
  ArrowDown, ArrowUp, ArrowLeft, ArrowRight, PanelTop, PanelLeft, BoxSelect,
  Link as LinkIcon, Square, Unlink, MoveHorizontal, Columns, Equal,
  RemoveFormatting
} from 'lucide-react';
import { LinkDialog } from './LinkDialog';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { BlueBullet, DarkRedBullet, BlackBullet } from './extensions/ColoredBullet';
import { ColoredBulletButtons } from './ColoredBulletButtons';
import { LineHeight } from './extensions/LineHeight';
import { StyledDivider } from './extensions/StyledDivider';
import { ColorBlock } from './extensions/ColorBlock';

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
          style: 'margin-bottom: 0.3em; min-height: 1em;', // Small gap between paragraphs + min height for empty paragraphs
        },
      },
      hardBreak: {
        keepMarks: true, // Preserve formatting across line breaks
      },
      strike: false, // Disable strike (we don't use it, reduces extensions)
      link: false, // Disable - we use custom Link extension below
    }),
    TextAlign.configure({
      types: ['paragraph', 'image', 'bulletList', 'orderedList'], // Include list types for proper toggle support
      alignments: ['left', 'center', 'right'],
      defaultAlignment: 'right', // RTL default
    }),
    Color,
    TextStyle,
    FontSize, // Custom font size extension
    LineHeight, // Line spacing extension
    StyledDivider, // Colored dividers
    ColorBlock, // Background color blocks
    Highlight.configure({
      multicolor: true, // Allow multiple highlight colors
    }),
    BlueBullet,
    DarkRedBullet,
    BlackBullet,
    Link.extend({
      addAttributes() {
        return {
          ...this.parent?.(),
          style: {
            default: null,
            parseHTML: element => element.getAttribute('style'),
            renderHTML: attributes => {
              if (!attributes.style) return {};
              return { style: attributes.style };
            },
          },
          'data-button': {
            default: null,
            parseHTML: element => element.getAttribute('data-button'),
            renderHTML: attributes => {
              if (!attributes['data-button']) return {};
              return { 'data-button': attributes['data-button'] };
            },
          },
        };
      },
    }).configure({
      openOnClick: false, // Don't open links on click in editor
      HTMLAttributes: {
        target: '_blank',
        rel: 'noopener noreferrer',
      },
    }),
    ResizableImage.configure({
      inline: false, // Block-level for text alignment to work
      allowBase64: false,
      HTMLAttributes: {
        style: 'display: block;',
      },
    }),
    Table.configure({
      resizable: true,
      HTMLAttributes: {
        class: 'border-collapse table-auto w-full',
      },
    }),
    TableRow,
    CustomTableHeader, // Use CustomTableHeader for width support
    CustomTableCell, // Use CustomTableCell for background color and width
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
          'text-base leading-[1.2]',
          'p-4'
        ),
        dir: 'rtl',
        style: `min-height: ${minHeight}; white-space: pre-line;`, // Preserve line breaks
      },
      // Clean up pasted HTML - remove font-family and font-size, keep basic formatting
      transformPastedHTML(html: string) {
        const doc = new DOMParser().parseFromString(html, 'text/html');

        // Remove unwanted inline styles while keeping bold/italic/underline
        doc.querySelectorAll('[style]').forEach(el => {
          const style = el.getAttribute('style') || '';
          // Keep only basic formatting (font-weight for bold, font-style for italic, text-decoration for underline)
          const keepStyles = style.match(/(font-weight|font-style|text-decoration):[^;]+/g);
          if (keepStyles) {
            el.setAttribute('style', keepStyles.join(';'));
          } else {
            el.removeAttribute('style');
          }
        });

        // Also remove font-family and font-size from computed styles
        doc.querySelectorAll('*').forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.fontFamily = '';
            el.style.fontSize = '';
          }
        });

        // Remove Word/Google Docs specific elements that can cause issues
        doc.querySelectorAll('style, meta, link, script').forEach(el => el.remove());

        return doc.body.innerHTML;
      },
      // Handle Ctrl+Shift+V for paste as plain text
      handleKeyDown(view, event) {
        // Ctrl+Shift+V or Cmd+Shift+V = paste as plain text
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'v') {
          event.preventDefault();
          navigator.clipboard.readText().then(text => {
            // Insert plain text without any formatting
            const { state, dispatch } = view;
            const tr = state.tr.insertText(text);
            dispatch(tr);
          }).catch(err => {
            console.error('Failed to read clipboard:', err);
          });
          return true;
        }
        return false;
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

  // Link dialog state
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkDialogMode, setLinkDialogMode] = useState<'link' | 'button'>('link');
  const [linkInitialText, setLinkInitialText] = useState('');

  // Open link dialog
  const openLinkDialog = useCallback((mode: 'link' | 'button') => {
    if (!editor) return;

    // Get selected text
    const { from, to } = editor.state.selection;
    const selectedText = editor.state.doc.textBetween(from, to, ' ');

    setLinkDialogMode(mode);
    setLinkInitialText(selectedText);
    setLinkDialogOpen(true);
  }, [editor]);

  // Handle link dialog confirm
  const handleLinkConfirm = useCallback((data: { url: string; text: string; style: 'link' | 'button'; buttonColor?: string }) => {
    if (!editor) return;

    const { from, to } = editor.state.selection;
    const hasSelection = from !== to;

    if (data.style === 'link') {
      // Simple text link
      if (hasSelection) {
        // Apply link to selected text
        editor.chain().focus().setLink({ href: data.url }).run();
      } else {
        // Insert new link with text
        editor
          .chain()
          .focus()
          .insertContent(`<a href="${data.url}" target="_blank" rel="noopener noreferrer">${data.text}</a>`)
          .run();
      }
    } else {
      // Styled button - all styles on one line for PDF compatibility
      const isOutline = data.buttonColor === 'outline';
      const bgColor = isOutline ? 'transparent' : data.buttonColor;
      const textColor = isOutline ? '#395BF7' : '#ffffff';
      const border = isOutline ? 'border: 2px solid #395BF7;' : '';

      const buttonStyle = `display: inline-block; background-color: ${bgColor}; color: ${textColor}; ${border} padding: 10px 24px; border-radius: 8px; text-decoration: none; font-weight: 500;`;

      const buttonHtml = `<a href="${data.url}" target="_blank" rel="noopener noreferrer" data-button="true" style="${buttonStyle}">${data.text}</a>`;

      editor.chain().focus().insertContent(buttonHtml).run();
    }
  }, [editor]);

  // Remove link from selected text
  const removeLink = useCallback(() => {
    if (!editor) return;
    editor.chain().focus().unsetLink().run();
  }, [editor]);

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

        {/* Font Size Dropdown */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <select
            className="h-8 px-2 text-sm border rounded bg-background hover:bg-accent cursor-pointer"
            value={editor.getAttributes('textStyle').fontSize || '16px'}
            onChange={(e) => {
              const size = e.target.value;
              if (size === '16px') {
                editor.chain().focus().unsetFontSize().run();
              } else {
                editor.chain().focus().setFontSize(size).run();
              }
            }}
            title="גודל טקסט"
          >
            <option value="12px">12 קטן מאוד</option>
            <option value="14px">14 קטן</option>
            <option value="16px">16 רגיל</option>
            <option value="18px">18 בינוני</option>
            <option value="20px">20 גדול</option>
            <option value="24px">24 כותרת משנה</option>
            <option value="28px">28 כותרת</option>
          </select>
        </div>

        {/* Line Spacing Dropdown */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <select
            className="h-8 px-2 text-sm border rounded bg-background hover:bg-accent cursor-pointer"
            value={editor.getAttributes('paragraph').lineHeight || '1.2'}
            onChange={(e) => {
              const height = e.target.value;
              editor.chain().focus().setLineHeight(height).run();
            }}
            title="רווח בין שורות"
          >
            <option value="1">צפוף</option>
            <option value="1.2">רגיל</option>
            <option value="1.6">מרווח</option>
            <option value="2">מאוד מרווח</option>
          </select>
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Lists */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleList('bulletList', 'listItem').run()}
            title="רשימה עם תבליטים"
          >
            <List className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => editor.chain().focus().toggleList('orderedList', 'listItem').run()}
            title="רשימה ממוספרת"
          >
            <ListOrdered className="h-4 w-4" />
          </Button>

          {/* Colored Bullets (Blue, Dark Red, Black) */}
          <ColoredBulletButtons editor={editor} />
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Links & Buttons */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <Button
            type="button"
            variant={editor.isActive('link') ? 'secondary' : 'ghost'}
            size="sm"
            onClick={() => openLinkDialog('link')}
            title="הוסף קישור"
          >
            <LinkIcon className="h-4 w-4" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => openLinkDialog('button')}
            title="הוסף כפתור עם קישור"
          >
            <Square className="h-4 w-4" />
          </Button>

          {editor.isActive('link') && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={removeLink}
              title="הסר קישור"
              className="text-red-500 hover:text-red-600"
            >
              <Unlink className="h-4 w-4" />
            </Button>
          )}
        </div>

        <div className="h-6 w-px bg-border mx-1" />

        {/* Table Menu */}
        <div className="flex items-center gap-1 rtl:flex-row-reverse">
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('table') ? 'secondary' : 'ghost'}
                size="sm"
                title="טבלה"
              >
                <TableIcon className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="start">
              <DropdownMenuItem onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}>
                <Plus className="h-4 w-4 ml-2" />
                הוסף טבלה (3x3)
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => editor.chain().focus().addColumnBefore().run()} disabled={!editor.can().addColumnBefore()}>
                <ArrowRight className="h-4 w-4 ml-2" />
                הוסף עמודה מימין
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().addColumnAfter().run()} disabled={!editor.can().addColumnAfter()}>
                <ArrowLeft className="h-4 w-4 ml-2" />
                הוסף עמודה משמאל
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteColumn().run()} disabled={!editor.can().deleteColumn()} className="text-red-600">
                <Trash2 className="h-4 w-4 ml-2" />
                מחק עמודה
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => editor.chain().focus().addRowBefore().run()} disabled={!editor.can().addRowBefore()}>
                <ArrowUp className="h-4 w-4 ml-2" />
                הוסף שורה מעל
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().addRowAfter().run()} disabled={!editor.can().addRowAfter()}>
                <ArrowDown className="h-4 w-4 ml-2" />
                הוסף שורה מתחת
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteRow().run()} disabled={!editor.can().deleteRow()} className="text-red-600">
                <Trash2 className="h-4 w-4 ml-2" />
                מחק שורה
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />

              {/* Advanced Properties */}
              <DropdownMenuLabel>מאפיינים</DropdownMenuLabel>
              
              {/* Cell Background Color */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <Palette className="h-4 w-4 ml-2" />
                  צבע רקע לתא
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', null).run()}>
                    <span className="w-4 h-4 rounded border border-gray-300 mr-2 flex items-center justify-center text-[10px]">❌</span>
                    ללא צבע
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#f3f4f6').run()}>
                    <div className="w-4 h-4 rounded border bg-gray-100 ml-2" />
                    אפור בהיר
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#dbeafe').run()}>
                    <div className="w-4 h-4 rounded border bg-blue-100 ml-2" />
                    כחול בהיר
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#dcfce7').run()}>
                    <div className="w-4 h-4 rounded border bg-green-100 ml-2" />
                    ירוק בהיר
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#fee2e2').run()}>
                    <div className="w-4 h-4 rounded border bg-red-100 ml-2" />
                    אדום בהיר
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#fef9c3').run()}>
                    <div className="w-4 h-4 rounded border bg-yellow-100 ml-2" />
                    צהוב בהיר
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#EEEDD8').run()}>
                    <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#EEEDD8' }} />
                    בז'
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#FFEDD5').run()}>
                    <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#FFEDD5' }} />
                    כתום בהיר
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#EDE9FE').run()}>
                    <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#EDE9FE' }} />
                    סגול בהיר
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('backgroundColor', '#CCFBF1').run()}>
                    <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#CCFBF1' }} />
                    טורקיז
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              {/* Column Width */}
              <DropdownMenuSub>
                <DropdownMenuSubTrigger>
                  <MoveHorizontal className="h-4 w-4 ml-2" />
                  רוחב עמודה
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('colwidth', [60]).run()}>
                    <span className="w-4 text-center ml-2 text-xs">60</span>
                    צר (60px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('colwidth', [100]).run()}>
                    <span className="w-4 text-center ml-2 text-xs">100</span>
                    רגיל (100px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('colwidth', [150]).run()}>
                    <span className="w-4 text-center ml-2 text-xs">150</span>
                    בינוני (150px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('colwidth', [200]).run()}>
                    <span className="w-4 text-center ml-2 text-xs">200</span>
                    רחב (200px)
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('colwidth', [300]).run()}>
                    <span className="w-4 text-center ml-2 text-xs">300</span>
                    רחב מאוד (300px)
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => editor.chain().focus().setCellAttribute('colwidth', null).run()}>
                    <Equal className="h-4 w-4 ml-2" />
                    רוחב אוטומטי
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>

              <DropdownMenuSeparator />

              {/* Header Toggles */}
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderRow().run()} disabled={!editor.can().toggleHeaderRow()}>
                <PanelTop className="h-4 w-4 ml-2" />
                הפוך שורה לכותרת
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderColumn().run()} disabled={!editor.can().toggleHeaderColumn()}>
                <PanelLeft className="h-4 w-4 ml-2" />
                הפוך עמודה לכותרת
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleHeaderCell().run()} disabled={!editor.can().toggleHeaderCell()}>
                <BoxSelect className="h-4 w-4 ml-2" />
                הפוך תא לכותרת
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => editor.chain().focus().mergeCells().run()} disabled={!editor.can().mergeCells()}>
                <Merge className="h-4 w-4 ml-2" />
                מזג תאים
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().splitCell().run()} disabled={!editor.can().splitCell()}>
                <Split className="h-4 w-4 ml-2" />
                פצל תאים
              </DropdownMenuItem>
              
              <DropdownMenuSeparator />
              
              <DropdownMenuItem onClick={() => editor.chain().focus().deleteTable().run()} disabled={!editor.can().deleteTable()} className="text-red-600">
                <Trash2 className="h-4 w-4 ml-2" />
                מחק טבלה
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Styled Dividers Dropdown */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                title="קו מפריד"
              >
                <Minus className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-48" align="start">
              <DropdownMenuLabel>עובי קו</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => editor.chain().focus().setStyledDivider({ thickness: '1px', color: '#000000' }).run()}>
                <div className="w-full h-[1px] bg-black ml-2" />
                דק (1px)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setStyledDivider({ thickness: '2px', color: '#000000' }).run()}>
                <div className="w-full h-[2px] bg-black ml-2" />
                בינוני (2px)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setStyledDivider({ thickness: '4px', color: '#000000' }).run()}>
                <div className="w-full h-[4px] bg-black ml-2" />
                עבה (4px)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuLabel>קו צבעוני</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => editor.chain().focus().setStyledDivider({ thickness: '2px', color: '#395BF7' }).run()}>
                <div className="w-full h-[2px] ml-2" style={{ backgroundColor: '#395BF7' }} />
                כחול
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setStyledDivider({ thickness: '2px', color: '#DC2626' }).run()}>
                <div className="w-full h-[2px] ml-2" style={{ backgroundColor: '#DC2626' }} />
                אדום
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setStyledDivider({ thickness: '2px', color: '#71717a' }).run()}>
                <div className="w-full h-[2px] ml-2" style={{ backgroundColor: '#71717a' }} />
                אפור
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().setStyledDivider({ thickness: '2px', color: '#16A34A' }).run()}>
                <div className="w-full h-[2px] ml-2" style={{ backgroundColor: '#16A34A' }} />
                ירוק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

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
              onClick={() => editor.chain().focus().setColor('#71717a').run()}
              title="אפור"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#71717a' }} />
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
              onClick={() => editor.chain().focus().setColor('#BB0B0B').run()}
              title="אדום כהה"
              className="w-6 h-6 p-0"
            >
              <div className="w-4 h-4 rounded-full border" style={{ backgroundColor: '#BB0B0B' }} />
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
            {/* Color Picker */}
            <div className="relative">
              <input
                type="color"
                className="absolute opacity-0 w-6 h-6 cursor-pointer"
                value={editor.getAttributes('textStyle').color || '#000000'}
                onChange={(e) => editor.chain().focus().setColor(e.target.value).run()}
                title="בחר צבע מותאם"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 pointer-events-none"
                title="בחר צבע מותאם"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
                  }}
                />
              </Button>
            </div>
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
            {/* Highlight Color Picker */}
            <div className="relative">
              <input
                type="color"
                className="absolute opacity-0 w-6 h-6 cursor-pointer"
                value={editor.getAttributes('highlight').color || '#FEF08A'}
                onChange={(e) => editor.chain().focus().toggleHighlight({ color: e.target.value }).run()}
                title="בחר צבע הדגשה מותאם"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-6 h-6 p-0 pointer-events-none"
                title="בחר צבע הדגשה מותאם"
              >
                <div
                  className="w-4 h-4 rounded-full border-2 border-dashed border-gray-400"
                  style={{
                    background: 'conic-gradient(red, yellow, lime, aqua, blue, magenta, red)'
                  }}
                />
              </Button>
            </div>
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

          {/* Color Block Dropdown */}
          <DropdownMenu dir="rtl">
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant={editor.isActive('colorBlock') ? 'secondary' : 'ghost'}
                size="sm"
                title="בלוק צבעוני"
              >
                <Square className="h-4 w-4 fill-current opacity-50" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-40" align="start">
              <DropdownMenuLabel>בלוק צבעוני</DropdownMenuLabel>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleColorBlock({ backgroundColor: '#EEEDD8' }).run()}>
                <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#EEEDD8' }} />
                בז'
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleColorBlock({ backgroundColor: '#f0f0f0' }).run()}>
                <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#f0f0f0' }} />
                אפור בהיר
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleColorBlock({ backgroundColor: '#DBEAFE' }).run()}>
                <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#DBEAFE' }} />
                כחול בהיר
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => editor.chain().focus().toggleColorBlock({ backgroundColor: '#FEF3C7' }).run()}>
                <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: '#FEF3C7' }} />
                צהוב בהיר
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => editor.chain().focus().unsetColorBlock().run()}
                disabled={!editor.isActive('colorBlock')}
              >
                <span className="w-4 h-4 rounded border border-gray-300 mr-2 flex items-center justify-center text-[10px]">❌</span>
                הסר בלוק
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Clear Formatting Button */}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              editor.chain()
                .focus()
                .unsetAllMarks()  // Remove bold, italic, color, highlight, etc.
                .clearNodes()     // Convert special nodes (bullets, headings) to paragraphs
                .run();
            }}
            title="נקה עיצוב"
          >
            <RemoveFormatting className="h-4 w-4" />
          </Button>
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

      {/* Link Dialog */}
      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onConfirm={handleLinkConfirm}
        initialText={linkInitialText}
        mode={linkDialogMode}
      />
    </div>
  );
};
