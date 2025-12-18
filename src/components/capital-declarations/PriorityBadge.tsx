/**
 * Priority Badge Component
 * Displays and allows changing declaration priority with colored badges
 */

import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AlertTriangle, Flame, Minus, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DeclarationPriority } from '@/types/capital-declaration.types';
import {
  PRIORITY_LABELS,
  PRIORITY_COLORS,
} from '@/types/capital-declaration.types';

interface PriorityBadgeProps {
  priority: DeclarationPriority;
  onPriorityChange?: (priority: DeclarationPriority) => void;
  editable?: boolean;
  size?: 'sm' | 'default';
  compact?: boolean;
}

const PRIORITY_ICONS: Record<DeclarationPriority, React.ReactNode> = {
  normal: <Minus className="h-3 w-3" />,
  urgent: <AlertTriangle className="h-3 w-3" />,
  critical: <Flame className="h-3 w-3" />,
};

const PRIORITY_ICONS_COMPACT: Record<DeclarationPriority, React.ReactNode> = {
  normal: <Minus className="h-2.5 w-2.5" />,
  urgent: <AlertTriangle className="h-2.5 w-2.5" />,
  critical: <Flame className="h-2.5 w-2.5" />,
};

export function PriorityBadge({
  priority,
  onPriorityChange,
  editable = false,
  size = 'default',
  compact = false,
}: PriorityBadgeProps) {
  const icons = compact ? PRIORITY_ICONS_COMPACT : PRIORITY_ICONS;

  const badge = (
    <Badge
      variant="outline"
      className={cn(
        'gap-0.5 cursor-default transition-colors',
        PRIORITY_COLORS[priority],
        editable && 'cursor-pointer hover:opacity-80',
        size === 'sm' && 'text-xs px-1.5 py-0.5',
        compact && 'text-[10px] px-1 py-0 h-5',
        priority === 'normal' && 'bg-gray-50 text-gray-600 border-gray-200'
      )}
    >
      {icons[priority]}
      <span>{PRIORITY_LABELS[priority]}</span>
      {editable && <ChevronDown className={cn('opacity-50', compact ? 'h-2.5 w-2.5' : 'h-3 w-3')} />}
    </Badge>
  );

  if (!editable || !onPriorityChange) {
    return badge;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>{badge}</DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="rtl:text-right">
        {(['normal', 'urgent', 'critical'] as DeclarationPriority[]).map((p) => (
          <DropdownMenuItem
            key={p}
            onClick={() => onPriorityChange(p)}
            className={cn(
              'gap-2 rtl:flex-row-reverse',
              priority === p && 'bg-accent'
            )}
          >
            {PRIORITY_ICONS[p]}
            <span>{PRIORITY_LABELS[p]}</span>
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
