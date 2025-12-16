/**
 * TipBox Component
 * Displays tips, warnings, and info boxes in tutorials
 */

import React from 'react';
import { cn } from '@/lib/utils';
import { AlertTriangle, Info, Lightbulb } from 'lucide-react';
import type { TipType } from '../types/help.types';

interface TipBoxProps {
  type: TipType;
  content: string;
  className?: string;
}

const tipConfig: Record<TipType, { icon: React.ElementType; bgColor: string; borderColor: string; iconColor: string; label: string }> = {
  info: {
    icon: Info,
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    iconColor: 'text-blue-500',
    label: 'מידע',
  },
  warning: {
    icon: AlertTriangle,
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    iconColor: 'text-amber-500',
    label: 'שים לב',
  },
  tip: {
    icon: Lightbulb,
    bgColor: 'bg-green-50',
    borderColor: 'border-green-200',
    iconColor: 'text-green-500',
    label: 'טיפ',
  },
};

export const TipBox: React.FC<TipBoxProps> = ({ type, content, className }) => {
  const config = tipConfig[type];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        'flex gap-3 p-4 rounded-lg border rtl:flex-row-reverse',
        config.bgColor,
        config.borderColor,
        className
      )}
    >
      <div className={cn('flex-shrink-0', config.iconColor)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="flex-1 rtl:text-right">
        <p className="text-sm font-medium text-gray-800 mb-1">{config.label}</p>
        <p className="text-sm text-gray-600">{content}</p>
      </div>
    </div>
  );
};

TipBox.displayName = 'TipBox';
