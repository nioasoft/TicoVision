import React, { useCallback, useEffect, useState, useRef } from 'react';
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
import { $generateHtmlFromNodes, $generateNodesFromDOM } from '@lexical/html';
import {
  $getSelection,
  $isRangeSelection,
  $getRoot,
  $createParagraphNode,
  $createTextNode,
  $isTextNode,
  FORMAT_TEXT_COMMAND,
  FORMAT_ELEMENT_COMMAND,
  UNDO_COMMAND,
  REDO_COMMAND,
  INDENT_CONTENT_COMMAND,
  OUTDENT_CONTENT_COMMAND,
  PASTE_COMMAND,
  COMMAND_PRIORITY_HIGH,
  KEY_DOWN_COMMAND,
  DecoratorNode,
} from 'lexical';
import type { EditorState, LexicalEditor as LexicalEditorType, RangeSelection, NodeKey, SerializedLexicalNode, Spread, DOMConversionMap, DOMExportOutput, LexicalNode } from 'lexical';
import {
  INSERT_ORDERED_LIST_COMMAND,
  INSERT_UNORDERED_LIST_COMMAND,
  ListNode,
  ListItemNode,
} from '@lexical/list';
import { LinkNode, $isLinkNode, TOGGLE_LINK_COMMAND } from '@lexical/link';
import { HeadingNode, $createHeadingNode, $isHeadingNode, QuoteNode } from '@lexical/rich-text';
import {
  TableNode,
  TableRowNode,
  TableCellNode,
  $isTableNode,
  $isTableCellNode,
  $isTableRowNode,
} from '@lexical/table';
import { $setBlocksType, $patchStyleText, $getSelectionStyleValueForProperty } from '@lexical/selection';
import { mergeRegister, $getNearestNodeOfType } from '@lexical/utils';
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
  ArrowUp,
  ArrowDown,
  Star,
  Table as TableIcon,
  Plus,
  Trash2,
  Palette,
  Stamp,
  PaintBucket,
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
import { LinkDialog } from './LinkDialog';

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
    ol: 'list-decimal list-outside pr-6',
    ul: 'list-disc list-outside pr-6',
    listitem: 'mb-1',
  },
  link: 'text-blue-600 underline cursor-pointer',
  code: 'font-mono bg-gray-100 p-2 rounded block my-2 text-sm overflow-x-auto',
  table: 'border-collapse w-full my-2',
  tableRow: '',
  tableCell: 'border border-gray-300 p-2 min-w-[60px] text-right align-top',
  tableCellHeader: 'border border-gray-300 p-2 min-w-[60px] text-right align-top bg-gray-100 font-bold',
};

// ========== Image Node ==========
type SerializedImageNode = Spread<
  {
    src: string;
    altText: string;
    width: number | null;
    height: number | null;
  },
  SerializedLexicalNode
>;

class ImageNode extends DecoratorNode<React.JSX.Element> {
  __src: string;
  __altText: string;
  __width: number | null;
  __height: number | null;

  static getType(): string {
    return 'image';
  }

  static clone(node: ImageNode): ImageNode {
    return new ImageNode(node.__src, node.__altText, node.__width, node.__height, node.__key);
  }

  static importJSON(serializedNode: SerializedImageNode): ImageNode {
    return $createImageNode({
      src: serializedNode.src,
      altText: serializedNode.altText,
      width: serializedNode.width ?? undefined,
      height: serializedNode.height ?? undefined,
    });
  }

  static importDOM(): DOMConversionMap | null {
    return {
      img: () => ({
        conversion: (domNode: HTMLElement) => {
          const img = domNode as HTMLImageElement;
          return {
            node: $createImageNode({
              src: img.getAttribute('src') || img.src,
              altText: img.alt || '',
              width: Number(img.getAttribute('width')) || img.width || undefined,
              height: Number(img.getAttribute('height')) || img.height || undefined,
            }),
          };
        },
        priority: 0,
      }),
    };
  }

  constructor(src: string, altText: string, width?: number | null, height?: number | null, key?: NodeKey) {
    super(key);
    this.__src = src;
    this.__altText = altText;
    this.__width = width ?? null;
    this.__height = height ?? null;
  }

  exportJSON(): SerializedImageNode {
    return {
      type: 'image',
      version: 1,
      src: this.__src,
      altText: this.__altText,
      width: this.__width,
      height: this.__height,
    };
  }

  exportDOM(): DOMExportOutput {
    const img = document.createElement('img');
    img.setAttribute('src', this.__src);
    img.setAttribute('alt', this.__altText);
    if (this.__width) img.setAttribute('width', String(this.__width));
    if (this.__height) img.setAttribute('height', String(this.__height));
    img.style.display = 'block';
    img.style.marginRight = '0';
    img.style.marginLeft = 'auto';
    return { element: img };
  }

  createDOM(): HTMLElement {
    const span = document.createElement('span');
    span.style.display = 'block';
    return span;
  }

  updateDOM(): false {
    return false;
  }

  decorate(): React.JSX.Element {
    return (
      <img
        src={this.__src}
        alt={this.__altText}
        width={this.__width ?? undefined}
        height={this.__height ?? undefined}
        style={{ display: 'block', marginRight: '0', marginLeft: 'auto', maxWidth: '100%' }}
      />
    );
  }
}

function $createImageNode({ src, altText, width, height }: { src: string; altText: string; width?: number; height?: number }): ImageNode {
  return new ImageNode(src, altText, width ?? null, height ?? null);
}

// ========== Plugins ==========

// Clean Paste Plugin - strips font-family/font-size from pasted HTML
function CleanPastePlugin() {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    // Handle Ctrl+Shift+V for plain text paste
    const removeKeyDown = editor.registerCommand(
      KEY_DOWN_COMMAND,
      (event: KeyboardEvent) => {
        if ((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'v') {
          event.preventDefault();
          navigator.clipboard.readText().then(text => {
            editor.update(() => {
              const selection = $getSelection();
              if ($isRangeSelection(selection)) {
                selection.insertRawText(text);
              }
            });
          }).catch(err => {
            console.error('Failed to read clipboard:', err);
          });
          return true;
        }
        return false;
      },
      COMMAND_PRIORITY_HIGH
    );

    // Clean pasted HTML
    const removePaste = editor.registerCommand(
      PASTE_COMMAND,
      (event: ClipboardEvent) => {
        const clipboardData = event.clipboardData;
        if (!clipboardData) return false;

        const htmlData = clipboardData.getData('text/html');
        if (!htmlData) return false; // Let default handler deal with plain text

        event.preventDefault();

        // Clean the HTML
        const doc = new DOMParser().parseFromString(htmlData, 'text/html');

        // Remove Word/Google Docs specific elements
        doc.querySelectorAll('style, meta, link, script').forEach(el => el.remove());

        // Clean inline styles - keep only basic formatting
        doc.querySelectorAll('[style]').forEach(el => {
          const style = el.getAttribute('style') || '';
          const keepStyles = style.match(/(font-weight|font-style|text-decoration):[^;]+/g);
          if (keepStyles) {
            el.setAttribute('style', keepStyles.join(';'));
          } else {
            el.removeAttribute('style');
          }
        });

        // Remove font-family and font-size from all elements
        doc.querySelectorAll('*').forEach(el => {
          if (el instanceof HTMLElement) {
            el.style.fontFamily = '';
            el.style.fontSize = '';
          }
        });

        const cleanedHtml = doc.body.innerHTML;
        if (!cleanedHtml.trim()) return false;

        // Parse cleaned HTML into Lexical nodes
        const parser = new DOMParser();
        const dom = parser.parseFromString(cleanedHtml, 'text/html');

        editor.update(() => {
          const nodes = $generateNodesFromDOM(editor, dom);
          const selection = $getSelection();
          if ($isRangeSelection(selection)) {
            selection.insertNodes(nodes);
          }
        });

        return true;
      },
      COMMAND_PRIORITY_HIGH
    );

    return () => {
      removeKeyDown();
      removePaste();
    };
  }, [editor]);

  return null;
}

/**
 * Preprocess TipTap-specific HTML to standard HTML that Lexical can parse.
 * Handles colored bullets (table-based), styled dividers, and color blocks.
 */
function preprocessTipTapHtml(html: string): string {
  let result = html;

  // 1. Convert TipTap colored bullets: <div data-type="blue-bullet"><table>...<td>content</td></table></div>
  //    → <p><span style="color: #COLOR; font-size: 12px;">◆ </span>content</p>
  const bulletColorMap: Record<string, string> = {
    'blue-bullet': '#395BF7',
    'darkred-bullet': '#BB0B0B',
    'black-bullet': '#000000',
  };

  for (const [dataType, color] of Object.entries(bulletColorMap)) {
    const bulletRegex = new RegExp(
      `<div[^>]*data-type="${dataType}"[^>]*>[\\s\\S]*?<td[^>]*>[\\s\\S]*?<img[^>]*>[\\s\\S]*?</td>[\\s\\S]*?<td[^>]*>([\\s\\S]*?)</td>[\\s\\S]*?</div>`,
      'gi'
    );
    result = result.replace(bulletRegex, (_match, content) => {
      const cleanContent = content.trim();
      return `<p><span style="color: ${color}; font-size: 12px;">◆ </span>${cleanContent}</p>`;
    });

    // Fallback: simpler bullet divs without table structure (already converted by convertBulletTablesToHtml)
    const simpleBulletRegex = new RegExp(
      `<div[^>]*data-type="${dataType}"[^>]*>([\\s\\S]*?)</div>`,
      'gi'
    );
    result = result.replace(simpleBulletRegex, (_match, content) => {
      const cleanContent = content.trim();
      // Skip if already converted (contains ◆)
      if (cleanContent.includes('◆')) return `<p>${cleanContent}</p>`;
      return `<p><span style="color: ${color}; font-size: 12px;">◆ </span>${cleanContent}</p>`;
    });
  }

  // 2. Convert TipTap styled dividers: <div data-styled-divider style="border-top: 2px solid #000;">
  //    → <p style="text-align: center;"><span style="color: #000; ...">──────</span></p>
  result = result.replace(
    /<div[^>]*data-styled-divider[^>]*(?:style="([^"]*)")?[^>]*>(?:<\/div>)?/gi,
    (_match, style) => {
      let color = '#000000';
      let thickness = '2px';
      if (style) {
        const colorMatch = style.match(/border(?:-top)?-color:\s*([^;]+)/i) || style.match(/solid\s+([#\w]+)/i);
        if (colorMatch) color = colorMatch[1].trim();
        const thickMatch = style.match(/border(?:-top)?-width:\s*([^;]+)/i) || style.match(/border-top:\s*(\d+px)/i);
        if (thickMatch) thickness = thickMatch[1].trim();
      }
      const fontSize = thickness === '4px' ? '16px' : thickness === '1px' ? '8px' : '12px';
      const line = '─'.repeat(60);
      return `<p style="text-align: center;"><span style="color: ${color}; font-size: ${fontSize}; letter-spacing: -0.1em;">${line}</span></p>`;
    }
  );

  // 3. Convert TipTap color blocks: <div data-color-block style="background-color: #EEEDD8; ...">content</div>
  //    → preserve as-is but wrapped in a standard div (Lexical will parse inner content)
  //    Since Lexical doesn't have a color block node, convert children to paragraphs with inline bg style
  result = result.replace(
    /<div[^>]*data-color-block[^>]*(?:style="([^"]*)")?[^>]*>([\s\S]*?)<\/div>/gi,
    (_match, style, content) => {
      let bgColor = '#EEEDD8';
      if (style) {
        const bgMatch = style.match(/background-color:\s*([^;]+)/i);
        if (bgMatch) bgColor = bgMatch[1].trim();
      }
      // Wrap content paragraphs with background color
      const innerHtml = content.trim();
      // If content already has <p> tags, add bg style to each
      if (innerHtml.includes('<p')) {
        return innerHtml.replace(
          /<p([^>]*)>/gi,
          (_m: string, attrs: string) => {
            if (attrs.includes('style=')) {
              return `<p${attrs.replace(/style="/, `style="background-color: ${bgColor}; padding: 8px 16px; `)}>`;
            }
            return `<p${attrs} style="background-color: ${bgColor}; padding: 8px 16px;">`;
          }
        );
      }
      // Otherwise wrap in a single paragraph
      return `<p style="background-color: ${bgColor}; padding: 8px 16px;">${innerHtml}</p>`;
    }
  );

  return result;
}

/**
 * Inline styles that Lexical's $generateNodesFromDOM does NOT import from
 * <span style="..."> elements. We preserve them after import by walking
 * the DOM and the Lexical tree in parallel.
 */
const PRESERVED_STYLE_PROPS = ['color', 'background-color', 'font-size', 'line-height', 'letter-spacing', 'text-transform'];

/**
 * Extract inline style properties we care about from a DOM element.
 * Returns a style string like "color: #BB0B0B; font-size: 18px" or empty string.
 */
function extractPreservedStyles(el: HTMLElement): string {
  const parts: string[] = [];
  for (const prop of PRESERVED_STYLE_PROPS) {
    const val = el.style.getPropertyValue(prop);
    if (val) {
      parts.push(`${prop}: ${val}`);
    }
  }
  return parts.join('; ');
}

/**
 * Pre-process HTML before Lexical import: bake inline styles from <span>
 * ancestor elements into data-attributes on leaf text wrappers, so we can
 * recover them after $generateNodesFromDOM (which ignores inline styles).
 *
 * Strategy: walk all <span> elements with relevant inline styles and add a
 * `data-lexical-style` attribute. After import, walk TextNodes and apply styles.
 */
function markStyledSpans(dom: Document): void {
  dom.querySelectorAll('span[style]').forEach(el => {
    if (el instanceof HTMLElement) {
      const styles = extractPreservedStyles(el);
      if (styles) {
        el.setAttribute('data-lexical-style', styles);
      }
    }
  });
  // Also handle <p> and <div> with background-color (color blocks)
  dom.querySelectorAll('p[style], div[style]').forEach(el => {
    if (el instanceof HTMLElement) {
      const bg = el.style.getPropertyValue('background-color');
      if (bg) {
        el.setAttribute('data-lexical-block-style', `background-color: ${bg}`);
      }
    }
  });
}

/**
 * After Lexical import, walk the root tree and apply inline styles that
 * $generateNodesFromDOM dropped. Uses a parallel DOM walk to match TextNodes
 * with their original styled spans.
 */
function $applyStylesFromDOM(root: ReturnType<typeof $getRoot>, dom: Document): void {
  // Collect all text content with styles from the DOM
  const styledRanges: Array<{ text: string; style: string }> = [];

  function walkDOM(node: Node, inheritedStyle: string) {
    if (node.nodeType === Node.ELEMENT_NODE) {
      const el = node as HTMLElement;
      let currentStyle = inheritedStyle;

      // Check for our marker attribute
      const spanStyle = el.getAttribute('data-lexical-style');
      if (spanStyle) {
        // Merge with inherited (span style takes precedence)
        const inheritedParts = inheritedStyle ? inheritedStyle.split('; ').filter(Boolean) : [];
        const spanParts = spanStyle.split('; ').filter(Boolean);
        const merged = new Map<string, string>();
        for (const part of inheritedParts) {
          const [k, v] = part.split(': ');
          if (k && v) merged.set(k.trim(), v.trim());
        }
        for (const part of spanParts) {
          const [k, v] = part.split(': ');
          if (k && v) merged.set(k.trim(), v.trim());
        }
        currentStyle = Array.from(merged.entries()).map(([k, v]) => `${k}: ${v}`).join('; ');
      }

      for (const child of Array.from(el.childNodes)) {
        walkDOM(child, currentStyle);
      }
    } else if (node.nodeType === Node.TEXT_NODE && node.textContent) {
      const text = node.textContent;
      if (text.trim() && inheritedStyle) {
        styledRanges.push({ text, style: inheritedStyle });
      }
    }
  }

  walkDOM(dom.body, '');

  if (styledRanges.length === 0) return;

  // Build a map from text content to style for quick lookup
  // Use a position-based approach: consume styled ranges as we walk TextNodes
  let rangeIdx = 0;
  let rangeOffset = 0;

  // Walk all text nodes in the Lexical tree
  function walkLexical(node: LexicalNode) {
    if ($isTextNode(node)) {
      const textContent = node.getTextContent();
      if (!textContent || rangeIdx >= styledRanges.length) return;

      // Try to match this TextNode against the current styled range
      const currentRange = styledRanges[rangeIdx];
      const remainingRangeText = currentRange.text.slice(rangeOffset);

      if (remainingRangeText.startsWith(textContent) || textContent.startsWith(remainingRangeText)) {
        // Match found - apply the style if node doesn't already have one
        const existingStyle = node.getStyle();
        if (!existingStyle && currentRange.style) {
          node.setStyle(currentRange.style);
        }

        // Advance position
        rangeOffset += textContent.length;
        if (rangeOffset >= currentRange.text.length) {
          rangeIdx++;
          rangeOffset = 0;
        }
      } else {
        // No match - try to find this text in upcoming ranges
        for (let i = rangeIdx; i < styledRanges.length; i++) {
          const range = styledRanges[i];
          if (range.text.includes(textContent)) {
            if (!node.getStyle() && range.style) {
              node.setStyle(range.style);
            }
            rangeIdx = i;
            rangeOffset = range.text.indexOf(textContent) + textContent.length;
            if (rangeOffset >= range.text.length) {
              rangeIdx++;
              rangeOffset = 0;
            }
            break;
          }
        }
      }
    } else if ('getChildren' in node && typeof node.getChildren === 'function') {
      for (const child of (node as { getChildren: () => LexicalNode[] }).getChildren()) {
        walkLexical(child);
      }
    }
  }

  walkLexical(root);
}

// Initial Value Plugin - sets editor content from HTML value prop
function InitialValuePlugin({ value, hasSetInitial }: { value?: string; hasSetInitial: React.MutableRefObject<boolean> }) {
  const [editor] = useLexicalComposerContext();

  useEffect(() => {
    if (value && !hasSetInitial.current) {
      hasSetInitial.current = true;
      editor.update(() => {
        // Preprocess TipTap-specific HTML before Lexical parses it
        const processedHtml = preprocessTipTapHtml(value);
        const parser = new DOMParser();
        const dom = parser.parseFromString(processedHtml, 'text/html');

        // Mark styled spans before import so we can recover styles after
        markStyledSpans(dom);

        const nodes = $generateNodesFromDOM(editor, dom);
        const root = $getRoot();
        root.clear();
        root.append(...nodes);

        // Recover inline styles that $generateNodesFromDOM dropped
        $applyStylesFromDOM(root, dom);
      });
    }
  }, [editor, value, hasSetInitial]);

  return null;
}

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

// Horizontal Rules Configuration (used as reference for HR style/thickness options)
// Solid: thin=1px, normal=2px, thick=4px | Dashed: 2px | Dotted: 2px | Double: 4px

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

// Color Block options (matches TipTap)
const COLOR_BLOCK_OPTIONS = [
  { value: '#EEEDD8', label: "בז'" },
  { value: '#f0f0f0', label: 'אפור בהיר' },
  { value: '#DBEAFE', label: 'כחול בהיר' },
  { value: '#FEF3C7', label: 'צהוב בהיר' },
];

// Table cell background colors (matches TipTap)
const TABLE_CELL_COLORS = [
  { value: '#f3f4f6', label: 'אפור בהיר' },
  { value: '#dbeafe', label: 'כחול בהיר' },
  { value: '#dcfce7', label: 'ירוק בהיר' },
  { value: '#fee2e2', label: 'אדום בהיר' },
  { value: '#fef9c3', label: 'צהוב בהיר' },
  { value: '#EEEDD8', label: "בז'" },
  { value: '#FFEDD5', label: 'כתום בהיר' },
  { value: '#EDE9FE', label: 'סגול בהיר' },
  { value: '#CCFBF1', label: 'טורקיז' },
];

// Helper function to get selected node
function getSelectedNode(selection: RangeSelection) {
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
function Toolbar({ stickyTop }: { stickyTop?: string }) {
  const [editor] = useLexicalComposerContext();
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [isStrikethrough, setIsStrikethrough] = useState(false);
  const [isSubscript, setIsSubscript] = useState(false);
  const [isSuperscript, setIsSuperscript] = useState(false);
  const [isLink, setIsLink] = useState(false);
  const [linkDialogOpen, setLinkDialogOpen] = useState(false);
  const [linkInitialText, setLinkInitialText] = useState('');
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

      // Get styles using proper Lexical API
      setFontSize($getSelectionStyleValueForProperty(selection, 'font-size', '16px'));
      setLineHeight($getSelectionStyleValueForProperty(selection, 'line-height', '1.5'));
      setTextColor($getSelectionStyleValueForProperty(selection, 'color', '#000000'));
      const currentBg = $getSelectionStyleValueForProperty(selection, 'background-color', '');
      setBgColor(currentBg || null);
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
        $patchStyleText(selection, { [styleProperty]: value });
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
        $patchStyleText(selection, { 'background-color': color || '' });
      }
    });
    setBgColor(color);
  };

  const insertLink = () => {
    if (!isLink) {
      // Get selected text for the dialog
      editor.getEditorState().read(() => {
        const selection = $getSelection();
        if ($isRangeSelection(selection)) {
          setLinkInitialText(selection.getTextContent());
        }
      });
      setLinkDialogOpen(true);
    } else {
      editor.dispatchCommand(TOGGLE_LINK_COMMAND, null);
    }
  };

  const handleLinkConfirm = (data: { url: string; text: string; style: 'link' | 'button' }) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const selectedText = selection.getTextContent();
        // If user changed the display text or there was no selection, insert new text
        if (data.text !== selectedText && data.text !== data.url) {
          selection.insertRawText(data.text);
        }
      }
    });
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, data.url);
  };

  // Format Painter state
  interface CopiedStyle {
    format: number; // bitmask for bold, italic, underline, etc.
    styles: Record<string, string>; // CSS properties
  }
  const [copiedStyle, setCopiedStyle] = useState<CopiedStyle | null>(null);

  const copyStyle = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const format = selection.format;
        const styles: Record<string, string> = {};

        // Read all CSS style properties from selection
        const styleProps = ['font-size', 'line-height', 'color', 'background-color', 'text-transform', 'letter-spacing'];
        for (const prop of styleProps) {
          const val = $getSelectionStyleValueForProperty(selection, prop, '');
          if (val) {
            styles[prop] = val;
          }
        }

        setCopiedStyle({ format, styles });
      }
    });
  };

  const pasteStyle = () => {
    if (!copiedStyle) return;
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Apply text format (bold, italic, underline, etc.)
        selection.setFormat(copiedStyle.format);

        // Apply CSS styles
        if (Object.keys(copiedStyle.styles).length > 0) {
          $patchStyleText(selection, copiedStyle.styles);
        }
      }
    });
  };

  const clearFormatting = () => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        // Clear inline text formatting (bold, italic, underline, etc.)
        selection.setStyle('');
        selection.setFormat(0);

        // Clear inline styles on all selected text nodes
        const nodes = selection.getNodes();
        nodes.forEach(node => {
          if (node.getType() === 'text' && 'setStyle' in node) {
            (node as { setStyle: (style: string) => void }).setStyle('');
          }
        });

        // Reset block type to paragraph (clear headings)
        $setBlocksType(selection, () => $createParagraphNode());
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
      if (!$isRangeSelection(selection)) return;

      // Collect all top-level block nodes in the selection
      const nodes = selection.getNodes();
      const blockNodes = new Set<LexicalNode>();
      nodes.forEach(node => {
        let blockNode: LexicalNode = node;
        while (blockNode.getParent() && blockNode.getParent()?.getType() !== 'root') {
          blockNode = blockNode.getParent()!;
        }
        // Only process element nodes (paragraphs, headings) - not root itself
        if (blockNode.getType() !== 'root') {
          blockNodes.add(blockNode);
        }
      });

      if (blockNodes.size > 1 || (blockNodes.size === 1 && !selection.isCollapsed())) {
        // Multi-line selection OR full single-line selection: prepend bullet to each paragraph
        blockNodes.forEach(blockNode => {
          // Check if already has a colored bullet at the start
          const firstChild = 'getFirstChild' in blockNode
            ? (blockNode as { getFirstChild: () => LexicalNode | null }).getFirstChild()
            : null;
          if (firstChild && firstChild.getType() === 'text') {
            const textContent = firstChild.getTextContent();
            if (textContent.startsWith('◆ ')) {
              // Already has a bullet - update its color
              (firstChild as { setStyle: (style: string) => void }).setStyle(`color: ${color}; font-size: 12px;`);
              return;
            }
          }

          // Insert bullet diamond at the beginning of the block
          const diamondNode = $createTextNode('◆ ');
          diamondNode.setStyle(`color: ${color}; font-size: 12px;`);

          if (firstChild) {
            firstChild.insertBefore(diamondNode);
          } else if ('append' in blockNode) {
            (blockNode as { append: (...nodes: LexicalNode[]) => void }).append(diamondNode);
          }
        });
      } else {
        // Cursor only (collapsed selection): insert a new bullet line
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

  // Insert table
  const insertTable = (rows: number, cols: number) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      const tableNode = new TableNode();
      // Header row
      const headerRow = new TableRowNode();
      for (let j = 0; j < cols; j++) {
        const cell = new TableCellNode(1); // 1 = header
        cell.append($createParagraphNode());
        headerRow.append(cell);
      }
      tableNode.append(headerRow);

      // Data rows
      for (let i = 1; i < rows; i++) {
        const row = new TableRowNode();
        for (let j = 0; j < cols; j++) {
          const cell = new TableCellNode(0); // 0 = normal
          cell.append($createParagraphNode());
          row.append(cell);
        }
        tableNode.append(row);
      }

      // Get the top-level block containing the cursor and insert table after it
      const anchorNode = selection.anchor.getNode();
      let topLevelNode = anchorNode;
      while (topLevelNode.getParent() && topLevelNode.getParent()?.getType() !== 'root') {
        topLevelNode = topLevelNode.getParent()!;
      }
      topLevelNode.insertAfter(tableNode);
      // Add a paragraph after table for continued typing
      const afterParagraph = $createParagraphNode();
      tableNode.insertAfter(afterParagraph);
    });
  };

  // Table row/column operations
  const tableAddRowAfter = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const rowNode = cellNode.getParent();
      if (!rowNode || !$isTableRowNode(rowNode)) return;
      const tableNode = rowNode.getParent();
      if (!tableNode || !$isTableNode(tableNode)) return;
      const colCount = rowNode.getChildrenSize();
      const newRow = new TableRowNode();
      for (let i = 0; i < colCount; i++) {
        const cell = new TableCellNode(0);
        cell.append($createParagraphNode());
        newRow.append(cell);
      }
      rowNode.insertAfter(newRow);
    });
  };

  const tableAddRowBefore = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const rowNode = cellNode.getParent();
      if (!rowNode || !$isTableRowNode(rowNode)) return;
      const colCount = rowNode.getChildrenSize();
      const newRow = new TableRowNode();
      for (let i = 0; i < colCount; i++) {
        const cell = new TableCellNode(0);
        cell.append($createParagraphNode());
        newRow.append(cell);
      }
      rowNode.insertBefore(newRow);
    });
  };

  const tableDeleteRow = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const rowNode = cellNode.getParent();
      if (rowNode && $isTableRowNode(rowNode)) {
        rowNode.remove();
      }
    });
  };

  const tableAddColumnAfter = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const rowNode = cellNode.getParent();
      if (!rowNode || !$isTableRowNode(rowNode)) return;
      const tableNode = rowNode.getParent();
      if (!tableNode || !$isTableNode(tableNode)) return;
      const cellIndex = rowNode.getChildren().indexOf(cellNode);
      const rows = tableNode.getChildren();
      rows.forEach(row => {
        if ($isTableRowNode(row)) {
          const cells = row.getChildren();
          const targetCell = cells[cellIndex];
          if (targetCell) {
            const isHeader = $isTableCellNode(targetCell) && targetCell.getHeaderStyles() !== 0;
            const newCell = new TableCellNode(isHeader ? 1 : 0);
            newCell.append($createParagraphNode());
            targetCell.insertAfter(newCell);
          }
        }
      });
    });
  };

  const tableAddColumnBefore = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const rowNode = cellNode.getParent();
      if (!rowNode || !$isTableRowNode(rowNode)) return;
      const tableNode = rowNode.getParent();
      if (!tableNode || !$isTableNode(tableNode)) return;
      const cellIndex = rowNode.getChildren().indexOf(cellNode);
      const rows = tableNode.getChildren();
      rows.forEach(row => {
        if ($isTableRowNode(row)) {
          const cells = row.getChildren();
          const targetCell = cells[cellIndex];
          if (targetCell) {
            const isHeader = $isTableCellNode(targetCell) && targetCell.getHeaderStyles() !== 0;
            const newCell = new TableCellNode(isHeader ? 1 : 0);
            newCell.append($createParagraphNode());
            targetCell.insertBefore(newCell);
          }
        }
      });
    });
  };

  const tableDeleteColumn = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const rowNode = cellNode.getParent();
      if (!rowNode || !$isTableRowNode(rowNode)) return;
      const tableNode = rowNode.getParent();
      if (!tableNode || !$isTableNode(tableNode)) return;
      const cellIndex = rowNode.getChildren().indexOf(cellNode);
      const rows = tableNode.getChildren();
      rows.forEach(row => {
        if ($isTableRowNode(row)) {
          const cells = row.getChildren();
          if (cells[cellIndex]) {
            cells[cellIndex].remove();
          }
        }
      });
    });
  };

  const tableDeleteTable = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const rowNode = cellNode.getParent();
      if (!rowNode) return;
      const tableNode = rowNode.getParent();
      if (tableNode && $isTableNode(tableNode)) {
        tableNode.remove();
      }
    });
  };

  const tableCellSetBgColor = (color: string | null) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const node = selection.anchor.getNode();
      const cellNode = $getNearestNodeOfType(node, TableCellNode);
      if (!cellNode) return;
      const dom = editor.getElementByKey(cellNode.getKey());
      if (dom) {
        (dom as HTMLElement).style.backgroundColor = color || '';
      }
    });
  };

  // Insert Image
  const insertImage = (src: string, alt: string, width?: number, height?: number) => {
    editor.update(() => {
      const imageNode = $createImageNode({ src, altText: alt, width, height });
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        selection.insertNodes([imageNode]);
      } else {
        $getRoot().append(imageNode);
      }
    });
  };

  // Add period at end of each line in selection
  const addPeriodToLines = () => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;
      const nodes = selection.getNodes();
      const processedParents = new Set<string>();

      nodes.forEach(node => {
        // Get the top-level block element
        let blockNode = node;
        while (blockNode.getParent() && blockNode.getParent()?.getType() !== 'root') {
          blockNode = blockNode.getParent()!;
        }
        const key = blockNode.getKey();
        if (processedParents.has(key)) return;
        processedParents.add(key);

        const text = blockNode.getTextContent().trimEnd();
        if (!text) return;
        const lastChar = text.slice(-1);
        if ('.?!:'.includes(lastChar)) return;

        // Find the last text node in this block
        const children = blockNode.getChildren ? (blockNode as { getChildren: () => LexicalNode[] }).getChildren() : [];
        const findLastTextNode = (nodes: LexicalNode[]): LexicalNode | null => {
          for (let i = nodes.length - 1; i >= 0; i--) {
            const child = nodes[i];
            if (child.getType() === 'text') return child;
            if ('getChildren' in child) {
              const found = findLastTextNode((child as { getChildren: () => LexicalNode[] }).getChildren());
              if (found) return found;
            }
          }
          return null;
        };

        const lastTextNode = findLastTextNode(children);
        if (lastTextNode && 'setTextContent' in lastTextNode && 'getTextContent' in lastTextNode) {
          const textContent = (lastTextNode as { getTextContent: () => string }).getTextContent();
          (lastTextNode as { setTextContent: (text: string) => void }).setTextContent(textContent + '.');
        }
      });
    });
  };

  // Color block - apply background color to selected paragraphs
  const applyColorBlock = (color: string | null) => {
    editor.update(() => {
      const selection = $getSelection();
      if (!$isRangeSelection(selection)) return;

      // Collect all top-level block nodes in the selection
      const nodes = selection.getNodes();
      const blockNodes = new Set<LexicalNode>();
      nodes.forEach(node => {
        let blockNode: LexicalNode = node;
        while (blockNode.getParent() && blockNode.getParent()?.getType() !== 'root') {
          blockNode = blockNode.getParent()!;
        }
        if (blockNode.getType() !== 'root') {
          blockNodes.add(blockNode);
        }
      });

      blockNodes.forEach(blockNode => {
        const dom = editor.getElementByKey(blockNode.getKey());
        if (dom) {
          if (color) {
            (dom as HTMLElement).style.backgroundColor = color;
            (dom as HTMLElement).style.padding = '8px 12px';
            (dom as HTMLElement).style.borderRadius = '4px';
          } else {
            (dom as HTMLElement).style.backgroundColor = '';
            (dom as HTMLElement).style.padding = '';
            (dom as HTMLElement).style.borderRadius = '';
          }
        }
      });
    });
  };

  // Button link dialog
  const [buttonLinkDialogOpen, setButtonLinkDialogOpen] = useState(false);
  const [buttonLinkInitialText, setButtonLinkInitialText] = useState('');

  const openButtonLinkDialog = () => {
    editor.getEditorState().read(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        setButtonLinkInitialText(selection.getTextContent());
      }
    });
    setButtonLinkDialogOpen(true);
  };

  const handleButtonLinkConfirm = (data: { url: string; text: string; style: 'link' | 'button'; buttonColor?: string }) => {
    editor.update(() => {
      const selection = $getSelection();
      if ($isRangeSelection(selection)) {
        const isOutline = data.buttonColor === 'outline';
        const bgColor = isOutline ? 'transparent' : data.buttonColor;
        const textColor = isOutline ? '#395BF7' : '#ffffff';
        const border = isOutline ? 'border: 2px solid #395BF7;' : '';

        // Create a styled link node that looks like a button
        const textNode = $createTextNode(data.text || 'לחץ כאן');
        textNode.setStyle(`
          display: inline-block;
          background-color: ${bgColor};
          color: ${textColor};
          ${border}
          padding: 10px 24px;
          border-radius: 8px;
          text-decoration: none;
          font-weight: 500;
        `.trim());
        selection.insertNodes([textNode]);
      }
    });
    // Apply link to the inserted text
    editor.dispatchCommand(TOGGLE_LINK_COMMAND, data.url);
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
    <div className="sticky z-10 border-b bg-background p-1.5" style={{ top: stickyTop ?? '0px' }}>
      {/* Row 1: Text formatting, colors */}
      <div className="flex items-center gap-1 flex-wrap">
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
            <DropdownMenuItem key={value} onClick={() => applyLineHeight(value)} className={lineHeight === value ? 'bg-accent' : ''}>
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

      </div>
      {/* Row 2: Alignment, lists, links, tables, inserts, undo/redo */}
      <div className="flex items-center gap-1 flex-wrap mt-1 pt-1 border-t border-border/40">

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

      {/* Button Link */}
      <ToolbarButton onClick={openButtonLinkDialog} title="הוסף כפתור עם קישור">
        <Square className="h-4 w-4" />
      </ToolbarButton>

      {/* Link Dialog */}
      <LinkDialog
        open={linkDialogOpen}
        onOpenChange={setLinkDialogOpen}
        onConfirm={handleLinkConfirm}
        initialText={linkInitialText}
        mode="link"
      />

      {/* Button Link Dialog */}
      <LinkDialog
        open={buttonLinkDialogOpen}
        onOpenChange={setButtonLinkDialogOpen}
        onConfirm={handleButtonLinkConfirm}
        initialText={buttonLinkInitialText}
        mode="button"
      />

      <ToolbarSeparator />

      {/* Table Menu */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="טבלה">
            <TableIcon className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56 max-h-[400px] overflow-y-auto">
          <DropdownMenuItem onClick={() => insertTable(3, 3)}>
            <Plus className="h-4 w-4 ml-2" />
            הוסף טבלה (3x3)
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={tableAddColumnBefore}>
            <ArrowRight className="h-4 w-4 ml-2" />
            הוסף עמודה מימין
          </DropdownMenuItem>
          <DropdownMenuItem onClick={tableAddColumnAfter}>
            <ArrowLeft className="h-4 w-4 ml-2" />
            הוסף עמודה משמאל
          </DropdownMenuItem>
          <DropdownMenuItem onClick={tableDeleteColumn} className="text-red-600">
            <Trash2 className="h-4 w-4 ml-2" />
            מחק עמודה
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={tableAddRowBefore}>
            <ArrowUp className="h-4 w-4 ml-2" />
            הוסף שורה מעל
          </DropdownMenuItem>
          <DropdownMenuItem onClick={tableAddRowAfter}>
            <ArrowDown className="h-4 w-4 ml-2" />
            הוסף שורה מתחת
          </DropdownMenuItem>
          <DropdownMenuItem onClick={tableDeleteRow} className="text-red-600">
            <Trash2 className="h-4 w-4 ml-2" />
            מחק שורה
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Cell Background Color */}
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Palette className="h-4 w-4 ml-2" />
              צבע רקע לתא
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent>
                <DropdownMenuItem onClick={() => tableCellSetBgColor(null)}>
                  <span className="w-4 h-4 rounded border border-gray-300 ml-2 flex items-center justify-center text-[10px]">✕</span>
                  ללא צבע
                </DropdownMenuItem>
                {TABLE_CELL_COLORS.map(({ value, label }) => (
                  <DropdownMenuItem key={value} onClick={() => tableCellSetBgColor(value)}>
                    <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: value }} />
                    {label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>

          <DropdownMenuSeparator />

          <DropdownMenuItem onClick={tableDeleteTable} className="text-red-600">
            <Trash2 className="h-4 w-4 ml-2" />
            מחק טבלה
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <ToolbarSeparator />

      {/* Color Block */}
      <DropdownMenu dir="rtl">
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="בלוק צבעוני">
            <Square className="h-4 w-4 fill-current opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="min-w-[140px]">
          {COLOR_BLOCK_OPTIONS.map(({ value, label }) => (
            <DropdownMenuItem key={value} onClick={() => applyColorBlock(value)}>
              <div className="w-4 h-4 rounded border ml-2" style={{ backgroundColor: value }} />
              {label}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onClick={() => applyColorBlock(null)}>
            <span className="w-4 h-4 rounded border border-gray-300 ml-2 flex items-center justify-center text-[10px]">✕</span>
            הסר בלוק
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Tico Stamp */}
      <ToolbarButton
        onClick={() => insertImage('/brand/tico_signature.png', 'חתימת תיקו', 228, 177)}
        title="הוסף חתימת תיקו"
      >
        <Stamp className="h-4 w-4" />
      </ToolbarButton>

      {/* Add Period */}
      <ToolbarButton onClick={addPeriodToLines} title="הוסף נקודה בסוף כל שורה">
        <span className="text-base font-bold leading-none">.</span>
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

      {/* Format Painter */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton
          onClick={copyStyle}
          title="העתק עיצוב"
          className={copiedStyle ? 'bg-blue-100 text-blue-700' : ''}
        >
          <Paintbrush className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton
          onClick={pasteStyle}
          title="הדבק עיצוב"
          disabled={!copiedStyle}
          className={!copiedStyle ? 'opacity-40' : ''}
        >
          <PaintBucket className="h-4 w-4" />
        </ToolbarButton>
      </div>

      <ToolbarSeparator />

      {/* Clear Formatting */}
      <ToolbarButton onClick={clearFormatting} title="נקה עיצוב">
        <RemoveFormatting className="h-4 w-4" />
      </ToolbarButton>

      <ToolbarSeparator />

      {/* Undo/Redo */}
      <div className="flex items-center gap-0.5">
        <ToolbarButton onClick={() => editor.dispatchCommand(UNDO_COMMAND, undefined)} title="ביטול (Ctrl+Z)">
          <Undo className="h-4 w-4" />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.dispatchCommand(REDO_COMMAND, undefined)} title="ביצוע מחדש (Ctrl+Y)">
          <Redo className="h-4 w-4" />
        </ToolbarButton>
      </div>
      </div>
    </div>
  );
}

interface LexicalEditorProps {
  value?: string;
  onChange?: (html: string) => void;
  minHeight?: string;
  className?: string;
  /** CSS top offset for sticky toolbar (e.g. "65px" to clear a sticky header) */
  stickyTop?: string;
  /** Show editor as A4 page with margins matching PDF output */
  pageView?: boolean;
}

// Named export for the component
const LexicalEditorComponent: React.FC<LexicalEditorProps> = ({
  value,
  onChange,
  minHeight = '300px',
  className,
  stickyTop,
  pageView = false,
}) => {
  const hasSetInitial = useRef(false);

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
      ImageNode,
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
      <style>{`
        [data-lexical-editor="true"] table {
          border-collapse: collapse;
          width: 100%;
          margin: 8px 0;
          table-layout: auto;
        }
        [data-lexical-editor="true"] table th,
        [data-lexical-editor="true"] table td {
          border: 1px solid #d1d5db;
          padding: 8px;
          min-width: 60px;
          text-align: right;
          vertical-align: top;
        }
        [data-lexical-editor="true"] table th {
          background-color: #f3f4f6;
          font-weight: bold;
        }
        [data-lexical-editor="true"] table td:hover,
        [data-lexical-editor="true"] table th:hover {
          background-color: #f9fafb;
        }
      `}</style>
      <div className={cn('border rounded-lg', className)} dir="rtl">
        <Toolbar stickyTop={stickyTop} />
        <div
          className={cn(
            'relative',
            pageView && 'bg-gray-200 overflow-auto py-6 px-4'
          )}
          style={pageView ? { minHeight: '600px' } : undefined}
        >
          <RichTextPlugin
            contentEditable={
              <ContentEditable
                className={cn(
                  'prose prose-sm sm:prose lg:prose-lg max-w-none focus:outline-none',
                  'rtl:text-right ltr:text-left',
                  "font-['David_Libre','Heebo','Assistant',sans-serif]",
                  'text-base leading-[1.5]',
                  pageView
                    ? 'bg-white mx-auto shadow-[0_1px_3px_rgba(0,0,0,0.12),0_1px_2px_rgba(0,0,0,0.08)]'
                    : 'p-4'
                )}
                style={pageView ? {
                  width: 'min(900px, calc(100% - 48px))',  // Responsive: fills space, caps at 900px
                  minHeight: '1272px',   // Proportionally scaled A4 height (900/794 * 1123)
                  paddingTop: '28px',    // Content area (header is in the template, not editor)
                  paddingBottom: '68px',  // ~15mm bottom margin (scaled)
                  paddingLeft: '38px',   // ~9mm (scaled)
                  paddingRight: '38px',  // ~9mm (scaled)
                } : { minHeight }}
              />
            }

            ErrorBoundary={LexicalErrorBoundary}
          />
        </div>
        <HistoryPlugin />
        <ListPlugin />
        <LinkPlugin />
        <TablePlugin />
        <CleanPastePlugin />
        <InitialValuePlugin value={value} hasSetInitial={hasSetInitial} />
        <OnChangePlugin onChange={handleChange} />
      </div>
    </LexicalComposer>
  );
};

// Export with the expected name
export { LexicalEditorComponent as LexicalEditor };
