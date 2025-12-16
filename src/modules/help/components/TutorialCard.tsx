/**
 * TutorialCard Component
 * A collapsible card that displays a tutorial
 */

import React from 'react';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { cn } from '@/lib/utils';
import { TutorialSteps } from './TutorialSteps';
import type { Tutorial } from '../types/help.types';
import * as LucideIcons from 'lucide-react';

interface TutorialCardProps {
  tutorial: Tutorial;
  isOpen: boolean;
  onToggle: () => void;
}

// Get icon component by name
function getIconComponent(iconName: string): React.ElementType {
  const icons = LucideIcons as Record<string, React.ElementType>;
  return icons[iconName] || LucideIcons.FileText;
}

export const TutorialCard: React.FC<TutorialCardProps> = ({
  tutorial,
  isOpen,
  onToggle,
}) => {
  const Icon = getIconComponent(tutorial.icon);

  return (
    <Collapsible open={isOpen} onOpenChange={onToggle}>
      <Card className={cn(
        'transition-all duration-200',
        isOpen ? 'ring-2 ring-primary/20' : 'hover:bg-gray-50'
      )}>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer py-4">
            <div className="flex items-center gap-3 rtl:flex-row-reverse">
              {/* Icon */}
              <div className={cn(
                'flex items-center justify-center w-10 h-10 rounded-lg',
                isOpen ? 'bg-primary text-primary-foreground' : 'bg-gray-100 text-gray-600'
              )}>
                <Icon className="h-5 w-5" />
              </div>

              {/* Title and Description */}
              <div className="flex-1 rtl:text-right">
                <h3 className="font-semibold text-gray-900">{tutorial.title}</h3>
                <p className="text-sm text-gray-500">{tutorial.description}</p>
              </div>

              {/* Steps count badge */}
              <Badge variant="secondary" className="ml-2">
                {tutorial.steps.length} שלבים
              </Badge>

              {/* Expand icon */}
              <div className="text-gray-400">
                {isOpen ? (
                  <ChevronUp className="h-5 w-5" />
                ) : (
                  <ChevronDown className="h-5 w-5" />
                )}
              </div>
            </div>
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="pt-0 pb-6 border-t">
            <div className="pt-4">
              <TutorialSteps steps={tutorial.steps} />
            </div>
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
};

TutorialCard.displayName = 'TutorialCard';
