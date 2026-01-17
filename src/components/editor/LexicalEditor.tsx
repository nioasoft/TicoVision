import React, { useCallback, useEffect, useState } from 'react';
import { LexicalComposer } from '@lexical/react/LexicalComposer';
import { RichTextPlugin } from '@lexical/react/LexicalRichTextPlugin';
import { ContentEditable } from '@lexical/react/LexicalContentEditable';
import { HistoryPlugin } from '@lexical/react/LexicalHistoryPlugin';
import { ListPlugin } from '@lexical/react/LexicalListPlugin';
import { LinkPlugin } from '@lexical/react/LexicalLinkPlugin';
import { TablePlugin } from '@lexical/react/LexicalTablePlugin';
import { LexicalErrorBoundary } from '@lexical/react/LexicalErrorBoundary';
import { useLexicalComposerContext } from '@lexical/react/LexicalComposerContext';
import { OnChangePlugin } from '@lexical/react/LexicalOnChangePlugin';
import { $generateHtmlFromNodes } from '@lexical/html';
import {
  $getSelection,
  $isRangeSelection,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  $createParagraphNode,
  $createTextNode,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
} from 'lexical';
import type { EditorState, LexicalEditor as LexicalEditorType, RangeSelection } from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  ListItemNode,
} from '@lexical/list';
import { LinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { HeadingNode, $createHeadingNode, $isHeadingNode, QuoteNode } from '@lexical/rich-text';
import { TableNode, TableRowNode, TableCellNode } from '@lexical/table';
import { $setBlocksType } from '@lexical/selection';
import { mergeRegister } from '@lexical/utils';
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Undo,
  Redo,
  Link as LinkIcon,
  Unlink,
  RemoveFormatting,
  ChevronDown,
  Type,
  Subscript,
  Superscript,
  Quote,
  Minus,
  Diamond,
  Paintbrush,
  Highlighter,
  Code,
  IndentIncrease,
  IndentDecrease,
  CaseSensitive,
  Info,
  AlertTriangle,
  CheckCircle,
  XCircle,
  Square,
  FileText,
  ArrowRight,
  ArrowLeft,
  Check,
  X,
  Star,
  Circle,
  MoreHorizontal,
  Grip,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';

// Theme configuration for Lexical
const theme = {
  ltr: 'ltr',
  rtl: 'rtl text-right',
  paragraph: 'mb-2 text-right',
  quote: 'border-r-4 border-gray-300 pr-4 italic text-gray-600 my-4',
  heading: {
    h1: 'text-3xl font-bold mb-4 text-right',
    h2: 'text-2xl font-bold mb-3 text-right',
    h3: 'text-xl font-semibold mb-2 text-right',
    h4: 'text-lg font-semibold mb-2 text-right',
    h5: 'text-base font-semibold mb-2 text-right',
    h6: 'text-sm font-semibold mb-1 text-right',
  },
  text: {
    bold: 'font-bold',
    italic: 'italic',
    underline: 'underline',
    strikethrough: 'line-through',
    subscript: 'text-[0.7em] align-sub',
    superscript: 'text-[0.7em] align-super',
    code: 'font-mono bg-gray-100 px-1 py-0.5 rounded text-sm text-red-600',
  },
  list: {
    nested: { listitem: 'list-none' },
    ol: 'list-decimal list-inside mr-4',
    ul: 'list-disc list-inside mr-4',
    listitem: 'mb-1',
  },
  link: 'text-blue-600 underline cursor-pointer',
  code: 'font-mono bg-gray-100 p-2 rounded block my-2 text-sm overflow-x-auto',
};

// Error handler
function onError(error: Error) {
  console.error('Lexical Error:', error);
}

// Configuration arrays
const FONT_SIZES = [
  { value: '12px', label: '12' },
  { value: '14px', label: '14' },
  { value: '16px', label: '16' },
  { value: '18px', label: '18' },
  { value: '20px', label: '20' },
  { value: '24px', label: '24' },
  { value: '28px', label: '28' },
  { value: '32px', label: '32' },
];

const LINE_HEIGHTS = [
  { value: '1', label: 'צפוף' },
  { value: '1.15', label: 'קומפקטי' },
  { value: '1.5', label: 'רגיל' },
  { value: '2', label: 'מרווח' },
  { value: '2.5', label: 'מרווח מאוד' },
];

const TEXT_COLORS = [
  { value: '#000000', label: 'שחור', className: 'bg-black' },
  { value: '#374151', label: 'אפור כהה', className: 'bg-gray-700' },
  { value: '#6B7280', label: 'אפור', className: 'bg-gray-500' },
  { value: '#395BF7', label: 'כחול', className: 'bg-blue-500' },
  { value: '#2563EB', label: 'כחול כהה', className: 'bg-blue-600' },
  { value: '#DC2626', label: 'אדום', className: 'bg-red-600' },
  { value: '#BB0B0B', label: 'אדום כהה', className: 'bg-red-800' },
  { value: '#16A34A', label: 'ירוק', className: 'bg-green-600' },
  { value: '#CA8A04', label: 'צהוב כהה', className: 'bg-yellow-600' },
  { value: '#9333EA', label: 'סגול', className: 'bg-purple-600' },
];

const HIGHLIGHT_COLORS = [
  { value: '#FEF08A', label: 'צהוב', className: 'bg-yellow-200' },
  { value: '#BBF7D0', label: 'ירוק', className: 'bg-green-200' },
  { value: '#BFDBFE', label: 'כחול', className: 'bg-blue-200' },
  { value: '#FECACA', label: 'אדום', className: 'bg-red-200' },
  { value: '#E9D5FF', label: 'סגול', className: 'bg-purple-200' },
  { value: '#E5E7EB', label: 'אפור', className: 'bg-gray-200' },
];

const COLORED_BULLETS = [
  { color: '#395BF7', label: 'כחול' },
  { color: '#BB0B0B', label: 'אדום כהה' },
  { color: '#000000', label: 'שחור' },
];

// Horizontal Rules Configuration
const HORIZONTAL_RULES = {
  solid: {
    thin: { label: 'דק', height: '1px', style: 'solid' },
    normal: { label: 'רגיל', height: '2px', style: 'solid' },
    thick: { label: 'עבה', height: '4px', style: 'solid' },
  },
  dashed: {
    normal: { label: 'מקווקו', height: '2px', style: 'dashed' },
  },
  dotted: {
    normal: { label: 'מנוקד', height: '2px', style: 'dotted' },
  },
  double: {
    normal: { label: 'כפול', height: '4px', style: 'double' },
  },
};

const HR_COLORS = [
  { value: '#000000', label: 'שחור' },
  { value: '#6B7280', label: 'אפור' },
  { value: '#395BF7', label: 'כחול' },
  { value: '#DC2626', label: 'אדום' },
  { value: '#16A34A', label: 'ירוק' },
  { value: '#CA8A04', label: 'זהב' },
  { value: '#9333EA', label: 'סגול' },
];

// Callout Box Types
const CALLOUT_TYPES = [
  { type: 'info', label: 'מידע', bgColor: '#DBEAFE', borderColor: '#3B82F6', icon: Info },
  { type: 'success', label: 'הצלחה', bgColor: '#D1FAE5', borderColor: '#10B981', icon: CheckCircle },
  { type: 'warning', label: 'אזהרה', bgColor: '#FEF3C7', borderColor: '#F59E0B', icon: AlertTriangle },
  { type: 'error', label: 'שגיאה', bgColor: '#FEE2E2', borderColor: '#EF4444', icon: XCircle },
];

// Special Symbols
const SPECIAL_SYMBOLS = [
  { symbol: '✓', label: 'סימון וי' },
  { symbol: '✗', label: 'סימון איקס' },
  { symbol: '★', label: 'כוכב מלא' },
  { symbol: '☆', label: 'כוכב ריק' },
  { symbol: '●', label: 'עיגול מלא' },
  { symbol: '○', label: 'עיגול ריק' },
  { symbol: '■', label: 'ריבוע מלא' },
  { symbol: '□', label: 'ריבוע ריק' },
  { symbol: '→', label: 'חץ ימינה' },
  { symbol: '←', label: 'חץ שמאלה' },
  { symbol: '↑', label: 'חץ למעלה' },
  { symbol: '↓', label: 'חץ למטה' },
  { symbol: '•', label: 'נקודה' },
  { symbol: '–', label: 'מקף בינוני' },
  { symbol: '—', label: 'מקף ארוך' },
  { symbol: '…', label: 'שלוש נקודות' },
  { symbol: '©', label: 'זכויות יוצרים' },
  { symbol: '®', label: 'סימן מסחרי' },
  { symbol: '™', label: 'טריידמארק' },
  { symbol: '₪', label: 'שקל' },
  { symbol: '$', label: 'דולר' },
  { symbol: '€', label: 'יורו' },
  { symbol: '§', label: 'סעיף' },
  { symbol: '¶', label: 'פסקה' },
];

// Letter Spacing Options
const LETTER_SPACING = [
  { value: '-0.05em', label: 'צפוף מאוד' },
  { value: '-0.025em', label: 'צפוף' },
  { value: 'normal', label: 'רגיל' },
  { value: '0.025em', label: 'מרווח' },
  { value: '0.05em', label: 'מרווח מאוד' },
  { value: '0.1em', label: 'פזור' },
];

// Border/Frame Styles
const BORDER_STYLES = [
  { label: 'מסגרת דקה', style: '1px solid #d1d5db', padding: '12px' },
  { label: 'מסגרת עבה', style: '2px solid #374151', padding: '12px' },
  { label: 'מסגרת כפולה', style: '4px double #374151', padding: '12px' },
  { label: 'מסגרת מקווקוות', style: '2px dashed #6b7280', padding: '12px' },
  { label: 'מסגרת מנוקדת', style: '2px dotted #6b7280', padding: '12px' },
  { label: 'מסגרת צבעונית כחולה', style: '3px solid #3b82f6', padding: '12px' },
  { label: 'מסגרת צבעונית אדומה', style: '3px solid #ef4444', padding: '12px' },
  { label: 'מסגרת צבעונית ירוקה', style: '3px solid #10b981', padding: '12px' },
];

// Helper function to get selected node
function getSelectedNode(selection: RangeSelection) {
  const anchor = selection.anchor;
  const focus = selection.focus;
  const anchorNode = selection.anchor.getNode();
  const focusNode = selection.focus.getNode();
  if (anchorNode === focusNode) {
    return anchorNode;
  }
  const isBackward = selection.isBackward();
  return isBackward ? focusNode : anchorNode;
}

// Toolbar Button with Tooltip
function ToolbarButton({
  onClick,
  active,
  disabled,
  title,
  children,
  className,
}: {
  onClick: () => void;
  active?: boolean;
  disabled?: boolean;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <TooltipProvider delayDuration={300}>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            type="button"
            variant={active ? 'secondary' : 'ghost'}
            size="sm"
            onClick={onClick}
            disabled={disabled}
            className={cn('h-8 w-8 p-0', className)}
          >
            {children}
          </Button>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="text-xs">
          {title}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// Separator component
function ToolbarSeparator() {
  return <div className="h-6 w-px bg-border mx-1" />;
}

// Main Toolbar component
function Toolbar() {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [blockType, setBlockType] = useState('paragraph');
  const [fontSize, setFontSize] = useState('16px');
  const [lineHeight, setLineHeight] = useState('1.5');
  const [textColor, setTextColor] = useState('#000000');
  const [bgColor, setBgColor] = useState<string | null>(null);

  // Update toolbar state based on selection
  const updateToolbar = useCallback(() => {
    const selection = $getSelection();
    if ($isRangeSelection(selection)) {
      setIsBold(selection.hasFormat('bold'));
      setIsItalic(selection.hasFormat('italic'));
      setIsUnderline(selection.hasFormat('underline'));
      setIsStrikethrough(selection.hasFormat('strikethrough'));
      setIsSubscript(selection.hasFormat('subscript'));
      setIsSuperscript(selection.hasFormat('superscript'));

      // Check for link
      const node = getSelectedNode(selection);
      const parent = node.getParent();
      setIsLink($isLinkNode(parent) || $isLinkNode(node));

      // Check block type
      const anchorNode = selection.anchor.getNode();
      const element = anchorNode.getKey() === 'root'
        ? anchorNode
        : anchorNode.getTopLevelElementOrThrow();

      if ($isHeadingNode(element)) {
        setBlockType(element.getTag());
      } else if (element.getType() === 'paragraph') {
        setBlockType('paragraph');
      }

      // Get styles
      const style = selection.style || '';
      const fontSizeMatch = style.match(/font-size:\s*(\d+px)/);
      setFontSize(fontSizeMatch ? fontSizeMatch[1] : '16px');

      const lineHeightMatch = style.match(/line-height:\s*([\d.]+)/);
      setLineHeight(lineHeightMatch ? lineHeightMatch[1] : '1.5');

      const colorMatch = style.match(/(?:^|;)\s*color:\s*([^;]+)/);
      setTextColor(colorMatch ? colorMatch[1].trim() : '#000000');

      const bgMatch = style.match(/background-color:\s*([^;]+)/);
      setBgColor(bgMatch ? bgMatch[1].trim() : null);
    }
  }, []);

  useEffect(() => {
    return mergeRegister(
      editor.registerUpdateListener(({ editorState }) => {
        editorState.read(() => updateToolbar());
      })
    );
  }, [editor, updateToolbar]);

  // Format functions
  const formatHeading = (headingTag: 'h1' | 'h2' | 'h3' | 'h4' | 'h5' | 'h6' | 'paragraph') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        if (headingTag === 'paragraph') {
          $setBlocksType(selection, () => $createParagraphNode());
        } else {
          $setBlocksType(selection, () => $createHeadingNode(headingTag));
        }
      }
    });
  };

  const applyStyle = (styleProperty: string, value: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const currentStyle = selection.style || '';
        // Remove existing property
        const cleanedStyle = currentStyle.replace(new RegExp(`${styleProperty}:[^;]+;?\\s*`, 'g'), '');
        // Add new value
        const newStyle = cleanedStyle + `${styleProperty}: ${value};`;
        selection.setStyle(newStyle.trim());
      }
    });
  };

  const applyFontSize = (size: string) => {
    applyStyle('font-size', size);
    setFontSize(size);
  };

  const applyLineHeight = (height: string) => {
    applyStyle('line-height', height);
    setLineHeight(height);
  };

  const applyTextColor = (color: string) => {
    applyStyle('color', color);
    setTextColor(color);
  };

  const applyBgColor = (color: string | null) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const currentStyle = selection.style || '';
        const cleanedStyle = currentStyle.replace(/background-color:[^;]+;?\s*/g, '');
        if (color) {
          selection.setStyle(cleanedStyle + `background-color: ${color};`);
        } else {
          selection.setStyle(cleanedStyle);
        }
      }
    });
    setBgColor(color);
  };

  const insertLink = () => {
    if (!isLink) {
      const url = prompt('הכנס כתובת URL:');
      if (url) {
        editor.dispatchCommand(TOGGLE_LINK_COMMAND, url);
      }
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.setStyle('');
        selection.setFormat(0);
      }
    });
  };

  const insertHorizontalRule = (color: string, borderStyle: string = 'solid', height: string = '2px') => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const hr = $createParagraphNode();
        const textNode = $createTextNode('\u200B'); // Zero-width space
        hr.append(textNode);
        hr.setFormat('center');
        // We'll use a div with border for the HR effect
        const hrDiv = $createParagraphNode();
        const hrText = $createTextNode('');
        hrText.setStyle(`display: block; border-bottom: ${height} ${borderStyle} ${color}; width: 100%; margin: 8px 0;`);
        hrDiv.append(hrText);
        selection.insertNodes([hrDiv]);
      }
    });
  };

  // Insert styled horizontal rule using HTML-compatible div
  const insertStyledHR = (color: string, style: string, thickness: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Create a line using border-bottom that works in HTML/PDF
        const hrParagraph = $createParagraphNode();
        hrParagraph.setFormat('center');
        // Use a special character sequence that will render as a line
        let lineChar = '─';
        if (style === 'dashed') lineChar = '┄';
        else if (style === 'dotted') lineChar = '┈';
        else if (style === 'double') lineChar = '═';

        const textNode = $createTextNode(lineChar.repeat(60));
        textNode.setStyle(`color: ${color}; font-size: ${thickness === '4px' ? '16px' : thickness === '1px' ? '8px' : '12px'}; letter-spacing: -0.1em;`);
        hrParagraph.append(textNode);
        selection.insertNodes([hrParagraph]);
      }
    });
  };

  // Insert callout box
  const insertCalloutBox = (type: string, bgColor: string, borderColor: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const callout = $createParagraphNode();
        const textNode = $createTextNode('הקלד כאן...');
        textNode.setStyle(`
          display: block;
          background-color: ${bgColor};
          border-right: 4px solid ${borderColor};
          padding: 12px 16px;
          border-radius: 4px;
        `);
        callout.append(textNode);
        selection.insertNodes([callout]);
        textNode.select();
      }
    });
  };

  // Insert symbol
  const insertSymbol = (symbol: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const textNode = $createTextNode(symbol);
        selection.insertNodes([textNode]);
      }
    });
  };

  // Apply letter spacing
  const applyLetterSpacing = (spacing: string) => {
    applyStyle('letter-spacing', spacing);
  };

  // Apply text transform
  const applyTextTransform = (transform: string) => {
    applyStyle('text-transform', transform);
  };

  // Insert framed/bordered text
  const insertFramedText = (borderStyle: string, padding: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const framedParagraph = $createParagraphNode();
        const textNode = $createTextNode('הקלד טקסט כאן...');
        textNode.setStyle(`
          display: block;
          border: ${borderStyle};
          padding: ${padding};
          border-radius: 4px;
        `);
        framedParagraph.append(textNode);
        selection.insertNodes([framedParagraph]);
        textNode.select();
      }
    });
  };

  // Insert page break marker (for PDF)
  const insertPageBreak = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const pageBreak = $createParagraphNode();
        pageBreak.setFormat('center');
        const textNode = $createTextNode('─── מעבר עמוד ───');
        textNode.setStyle(`
          display: block;
          color: #9ca3af;
          font-size: 12px;
          border-top: 1px dashed #d1d5db;
          border-bottom: 1px dashed #d1d5db;
          padding: 8px 0;
          margin: 16px 0;
          page-break-after: always;
        `);
        pageBreak.append(textNode);
        selection.insertNodes([pageBreak]);
      }
    });
  };

  // Toggle code format
  const toggleCode = () => {
    editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'code');
  };

  const insertColoredBullet = (color: string) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const bulletParagraph = $createParagraphNode();
        const diamondNode = $createTextNode('◆ ');
        diamondNode.setStyle(`color: ${color}; font-size: 12px;`);
        const textNode = $createTextNode('');
        bulletParagraph.append(diamondNode);
        bulletParagraph.append(textNode);
        selection.insertNodes([bulletParagraph]);
        textNode.select();
      }
    });
  };

  const getBlockTypeLabel = () => {
    switch (blockType) {
      case 'h1': return 'כותרת 1';
      case 'h2': return 'כותרת 2';
      case 'h3': return 'כותרת 3';
      case 'h4': return 'כותרת 4';
      case 'h5': return 'כותרת 5';
      case 'h6': return 'כותרת 6';
      default: return 'פסקה';
    }
  };

  return (
    <div className="sticky top-0 z-10 border-b bg-muted/50 p-1.5 flex items-center gap-0.5 flex-wrap rtl:flex-row-reverse">
      {/* Block Type Dropdown */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 min-w-[80px] justify-between">
            <span className="text-xs">{getBlockTypeLabel()}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[120px] max-h-[300px] overflow-y-auto">
          <DropdownMenuItem onClick={() => formatHeading('paragraph')}>
            <Type className="h-4 w-4 ml-2" />
            פסקה
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => formatHeading('h1')}>
            <span className="font-bold text-2xl ml-2">H1</span>
            כותרת 1
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h2')}>
            <span className="font-bold text-xl ml-2">H2</span>
            כותרת 2
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h3')}>
            <span className="font-bold text-lg ml-2">H3</span>
            כותרת 3
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h4')}>
            <span className="font-bold text-base ml-2">H4</span>
            כותרת 4
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h5')}>
            <span className="font-semibold text-sm ml-2">H5</span>
            כותרת 5
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => formatHeading('h6')}>
            <span className="font-semibold text-xs ml-2">H6</span>
            כותרת 6
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      {/* Font Size Dropdown */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2 min-w-[55px] justify-between">
            <span className="text-xs">{fontSize.replace('px', '')}</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[80px]">
          {FONT_SIZES.map(({ value, label }) => (
            <DropdownMenuItem key={value} onClick={() => applyFontSize(value)}>
              <span style={{ fontSize: value }}>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Line Height Dropdown */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2" title="רווח שורות">
            <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="3" y1="6" x2="21" y2="6" />
              <line x1="3" y1="12" x2="21" y2="12" />
              <line x1="3" y1="18" x2="21" y2="18" />
            </svg>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[100px]">
          {LINE_HEIGHTS.map(({ value, label }) => (
            <DropdownMenuItem key={value} onClick={() => applyLineHeight(value)}>
              {label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      {/* Basic Formatting */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'bold')} active={isBold} title="מודגש (Ctrl+B)">
          <Bold className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'italic')} active={isItalic} title="נטוי (Ctrl+I)">
          <Italic className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'underline')} active={isUnderline} title="קו תחתון (Ctrl+U)">
          <Underline className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'strikethrough')} active={isStrikethrough} title="קו חוצה">
          <Strikethrough className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'subscript')} active={isSubscript} title="כתב תחתי">
          <Subscript className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_TEXT_COMMAND, 'superscript')} active={isSuperscript} title="כתב עילי">
          <Superscript className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={toggleCode} title="קוד (מונוספייס)">
          <Code className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Text Transform Dropdown */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-1.5" title="המרת טקסט">
            <CaseSensitive className="h-4 w-4" />
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[120px]">
          <DropdownMenuItem onClick={() => applyTextTransform('uppercase')}>
            <span className="ml-2 font-mono">AA</span>
            אותיות גדולות
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyTextTransform('lowercase')}>
            <span className="ml-2 font-mono">aa</span>
            אותיות קטנות
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => applyTextTransform('capitalize')}>
            <span className="ml-2 font-mono">Aa</span>
            אות ראשונה גדולה
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => applyTextTransform('none')}>
            <span className="ml-2">⊘</span>
            ללא שינוי
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Letter Spacing Dropdown */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-1.5" title="מרווח אותיות">
            <span className="text-xs font-mono">A⟷A</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[120px]">
          {LETTER_SPACING.map(({ value, label }) => (
            <DropdownMenuItem key={value} onClick={() => applyLetterSpacing(value)}>
              <span style={{ letterSpacing: value }}>{label}</span>
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      {/* Text Color Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" title="צבע טקסט">
            <Paintbrush className="h-4 w-4" />
            <div
              className="absolute bottom-0.5 left-1 right-1 h-1 rounded-sm"
              style={{ backgroundColor: textColor }}
            />
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-5 gap-1">
            {TEXT_COLORS.map(({ value, label, className }) => (
              <button
                key={value}
                onClick={() => applyTextColor(value)}
                className={cn(
                  'w-6 h-6 rounded border border-gray-300 hover:scale-110 transition-transform',
                  className,
                  textColor === value && 'ring-2 ring-primary ring-offset-1'
                )}
                title={label}
              />
            ))}
          </div>
          <div className="mt-2 flex items-center gap-2">
            <input
              type="color"
              value={textColor}
              onChange={(e) => applyTextColor(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer"
            />
            <span className="text-xs text-muted-foreground">צבע מותאם</span>
          </div>
        </PopoverContent>
      </Popover>

      {/* Highlight Color Popover */}
      <Popover>
        <PopoverTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 relative" title="הדגשת רקע">
            <Highlighter className="h-4 w-4" />
            {bgColor && (
              <div
                className="absolute bottom-0.5 left-1 right-1 h-1 rounded-sm"
                style={{ backgroundColor: bgColor }}
              />
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <div className="grid grid-cols-3 gap-1">
            {HIGHLIGHT_COLORS.map(({ value, label, className }) => (
              <button
                key={value}
                onClick={() => applyBgColor(value)}
                className={cn(
                  'w-8 h-8 rounded border border-gray-300 hover:scale-110 transition-transform',
                  className,
                  bgColor === value && 'ring-2 ring-primary ring-offset-1'
                )}
                title={label}
              />
            ))}
          </div>
          <button
            onClick={() => applyBgColor(null)}
            className="mt-2 text-xs text-muted-foreground hover:text-foreground w-full text-center"
          >
            הסר הדגשה
          </button>
        </PopoverContent>
      </Popover>

      <ToolbarSeparator />

      {/* Text Alignment */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'right')} title="יישור לימין">
          <AlignRight className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'center')} title="מרכוז">
          <AlignCenter className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'left')} title="יישור לשמאל">
          <AlignLeft className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(FORMAT_ELEMENT_COMMAND, 'justify')} title="יישור לשני הצדדים">
          <AlignJustify className="h-4 w-4" />
        </ToolbarButton>
      </div>

      {/* Indentation */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.dispatchCommand(INDENT_CONTENT_COMMAND, undefined)} title="הגדל הזחה">
          <IndentIncrease className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(OUTDENT_CONTENT_COMMAND, undefined)} title="הקטן הזחה">
          <IndentDecrease className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Lists and Bullets */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_UNORDERED_LIST_COMMAND, undefined)} title="רשימה עם תבליטים">
          <List className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(INSERT_ORDERED_LIST_COMMAND, undefined)} title="רשימה ממוספרת">
          <ListOrdered className="h-4 w-4" />
        </ToolbarButton>

        {/* Colored Bullets Dropdown */}
        <DropdownMenu dir="rtl">
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 gap-0.5 px-1.5">
              <Diamond className="h-4 w-4 fill-blue-500 text-blue-500" />
              <ChevronDown className="h-3 w-3" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[120px]">
            {COLORED_BULLETS.map(({ color, label }) => (
              <DropdownMenuItem key={color} onClick={() => insertColoredBullet(color)}>
                <Diamond className="h-4 w-4 ml-2" style={{ fill: color, color }} />
                {label}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <ToolbarSeparator />

      {/* Link */}
      <ToolbarButton onClick={insertLink} active={isLink} title={isLink ? 'הסר קישור' : 'הוסף קישור'}>
        {isLink ? <Unlink className="h-4 w-4" /> : <LinkIcon className="h-4 w-4" />}
      </ToolbarButton>

      {/* Insert Dropdown - Expanded */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 gap-1 px-2">
            <span className="text-xs">הוסף</span>
            <ChevronDown className="h-3 w-3" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[180px] max-h-[400px] overflow-y-auto">
          {/* Horizontal Rules - Advanced */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Minus className="h-4 w-4 ml-2" />
              קו מפריד
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[200px]">
                {/* Solid Lines */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>קו רציף</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {HR_COLORS.map(({ value, label }) => (
                        <DropdownMenuItem key={`solid-${value}`} onClick={() => insertStyledHR(value, 'solid', '2px')}>
                          <div className="w-16 h-0.5 ml-2" style={{ backgroundColor: value }} />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                {/* Dashed Lines */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>קו מקווקו</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {HR_COLORS.map(({ value, label }) => (
                        <DropdownMenuItem key={`dashed-${value}`} onClick={() => insertStyledHR(value, 'dashed', '2px')}>
                          <div className="w-16 ml-2 border-b-2 border-dashed" style={{ borderColor: value }} />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                {/* Dotted Lines */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>קו מנוקד</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {HR_COLORS.map(({ value, label }) => (
                        <DropdownMenuItem key={`dotted-${value}`} onClick={() => insertStyledHR(value, 'dotted', '2px')}>
                          <div className="w-16 ml-2 border-b-2 border-dotted" style={{ borderColor: value }} />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                {/* Double Lines */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>קו כפול</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      {HR_COLORS.map(({ value, label }) => (
                        <DropdownMenuItem key={`double-${value}`} onClick={() => insertStyledHR(value, 'double', '4px')}>
                          <div className="w-16 ml-2 border-b-4 border-double" style={{ borderColor: value }} />
                          {label}
                        </DropdownMenuItem>
                      ))}
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
                <DropdownMenuSeparator />
                {/* Thickness Options */}
                <DropdownMenuSub>
                  <DropdownMenuSubTrigger>עובי קו</DropdownMenuSubTrigger>
                  <DropdownMenuPortal>
                    <DropdownMenuSubContent>
                      <DropdownMenuItem onClick={() => insertStyledHR('#000000', 'solid', '1px')}>
                        <div className="w-16 h-px bg-black ml-2" />
                        דק
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => insertStyledHR('#000000', 'solid', '2px')}>
                        <div className="w-16 h-0.5 bg-black ml-2" />
                        רגיל
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => insertStyledHR('#000000', 'solid', '4px')}>
                        <div className="w-16 h-1 bg-black ml-2" />
                        עבה
                      </DropdownMenuItem>
                    </DropdownMenuSubContent>
                  </DropdownMenuPortal>
                </DropdownMenuSub>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Quote */}
          <DropdownMenuItem onClick={() => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                const quote = $createParagraphNode();
                quote.setFormat('right');
                const textNode = $createTextNode('הקלד ציטוט כאן...');
                textNode.setStyle('border-right: 4px solid #d1d5db; padding-right: 16px; font-style: italic; color: #6b7280; display: block;');
                quote.append(textNode);
                selection.insertNodes([quote]);
                textNode.select();
              }
            });
          }}>
            <Quote className="h-4 w-4 ml-2" />
            ציטוט
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Callout Boxes */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Info className="h-4 w-4 ml-2" />
              תיבת הודעה
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                {CALLOUT_TYPES.map(({ type, label, bgColor, borderColor, icon: Icon }) => (
                  <DropdownMenuItem key={type} onClick={() => insertCalloutBox(type, bgColor, borderColor)}>
                    <Icon className="h-4 w-4 ml-2" style={{ color: borderColor }} />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          {/* Framed Text */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Square className="h-4 w-4 ml-2" />
              מסגרת
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[180px]">
                {BORDER_STYLES.map(({ label, style, padding }) => (
                  <DropdownMenuItem key={label} onClick={() => insertFramedText(style, padding)}>
                    <div className="w-6 h-4 ml-2" style={{ border: style }} />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Special Symbols */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Star className="h-4 w-4 ml-2" />
              סמלים מיוחדים
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent className="min-w-[200px] max-h-[300px] overflow-y-auto">
                <div className="grid grid-cols-6 gap-1 p-2">
                  {SPECIAL_SYMBOLS.map(({ symbol, label }) => (
                    <button
                      key={symbol}
                      onClick={() => insertSymbol(symbol)}
                      className="w-8 h-8 flex items-center justify-center text-lg hover:bg-muted rounded transition-colors"
                      title={label}
                    >
                      {symbol}
                    </button>
                  ))}
                </div>
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          {/* Page Break */}
          <DropdownMenuItem onClick={insertPageBreak}>
            <FileText className="h-4 w-4 ml-2" />
            מעבר עמוד (PDF)
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      {/* Clear Formatting */}
      <ToolbarButton onClick={clearFormatting} title="נקה עיצוב">
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5 mr-auto">
        <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="ביטול (Ctrl+Z)">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="ביצוע מחדש (Ctrl+Y)">
          <Redo className="h-4 w-4" />
        </ToolbarButton>
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

// Named export for the component
const LexicalEditorComponent: React.FC<LexicalEditorProps> = ({
  onChange,
  placeholder = 'הקלד כאן...',
  minHeight = '300px',
  className,
}) => {
  const initialConfig = {
    namespace: 'TicoVisionEditor',
    theme,
    onError,
    nodes: [
      HeadingNode,
      QuoteNode,
      ListNode,
      ListItemNode,
      LinkNode,
      TableNode,
      TableRowNode,
      TableCellNode,
    ],
  };

  const handleChange = useCallback(
    (editorState: EditorState, editor: LexicalEditorType) => {
      editorState.read(() => {
        const html = $generateHtmlFromNodes(editor, null);
        onChange?.(html);
      });
    },
    [onChange]
  );

  return (
    <LexicalComposer initialConfig={initialConfig}>
      <div className={cn('border rounded-lg overflow-hidden', className)} dir="rtl">
        <Toolbar />
        <div className="relative">
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none',
                  'rtl:text-right ltr:text-left',
                  "font-['David_Libre','Heebo','Assistant',sans-serif]",
                  'text-base leading-[1.5]',
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
        <LinkPlugin />
        <TablePlugin />
        <OnChangePlugin onChange={handleChange} />
      </div>
    </LexicalComposer>
  );
};

// Export with the expected name
export { LexicalEditorComponent as LexicalEditor };
