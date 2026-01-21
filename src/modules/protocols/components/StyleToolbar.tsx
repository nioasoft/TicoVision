/**
 * StyleToolbar
 * Toolbar for styling protocol items with bold, underline, and color options
 */

import { Button } from '@/components/ui/button';
import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import { Bold, Underline } from 'lucide-react';
import { ITEM_STYLE_COLORS, type ItemStyle, type ItemStyleColor } from '../types/protocol.types';

interface StyleToolbarProps {
  style: ItemStyle;
  onChange: (style: ItemStyle) => void;
}

export function StyleToolbar({ style, onChange }: StyleToolbarProps) {
  const handleBoldToggle = () => {
    onChange({ ...style, bold: !style.bold });
  };

  const handleUnderlineToggle = () => {
    onChange({ ...style, underline: !style.underline });
  };

  const handleColorChange = (color: ItemStyleColor) => {
    onChange({ ...style, color: color === 'default' ? undefined : color });
  };

  const currentColor = style.color || 'default';

  return (
    <div className="flex items-center gap-3 p-2 bg-gray-50 rounded-lg border" dir="rtl">
      {/* Bold & Underline toggles */}
      <div className="flex items-center gap-1 border-l pl-3 ml-1">
        <Toggle
          pressed={style.bold || false}
          onPressedChange={handleBoldToggle}
          size="sm"
          aria-label="הדגשה"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle
          pressed={style.underline || false}
          onPressedChange={handleUnderlineToggle}
          size="sm"
          aria-label="קו תחתון"
          className="data-[state=on]:bg-primary data-[state=on]:text-primary-foreground"
        >
          <Underline className="h-4 w-4" />
        </Toggle>
      </div>

      {/* Color picker */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs text-gray-500 ml-1">צבע:</span>
        {ITEM_STYLE_COLORS.map((colorOption) => (
          <Button
            key={colorOption.value}
            type="button"
            variant="ghost"
            size="sm"
            className={cn(
              'w-6 h-6 p-0 rounded-full border-2 transition-all',
              currentColor === colorOption.value
                ? 'border-primary ring-2 ring-primary/30'
                : 'border-gray-300 hover:border-gray-400'
            )}
            onClick={() => handleColorChange(colorOption.value)}
            title={colorOption.label}
          >
            <span
              className="w-3.5 h-3.5 rounded-full"
              style={{
                backgroundColor:
                  colorOption.value === 'default' ? '#6b7280' : colorOption.hex,
              }}
            />
          </Button>
        ))}
      </div>
    </div>
  );
}

/**
 * Helper function to get inline styles for styled content
 */
export function getContentStyle(style?: ItemStyle): React.CSSProperties {
  if (!style) return {};

  const colorInfo = ITEM_STYLE_COLORS.find((c) => c.value === (style.color || 'default'));

  return {
    fontWeight: style.bold ? 'bold' : undefined,
    textDecoration: style.underline ? 'underline' : undefined,
    color: style.color && style.color !== 'default' ? colorInfo?.hex : undefined,
  };
}

/**
 * Helper function to get Tailwind classes for styled content (bold/underline only)
 */
export function getContentClasses(style?: ItemStyle): string {
  if (!style) return '';

  const classes: string[] = [];

  if (style.bold) {
    classes.push('font-bold');
  }
  if (style.underline) {
    classes.push('underline');
  }

  return classes.join(' ');
}
