/**
 * CategorySelector - Tab-based category selection for Auto Letters
 */

import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Bell, Building2, Calendar, ClipboardCheck, FileCheck, FileSearch, Home, Landmark, Receipt } from 'lucide-react';
import type { AutoLetterCategory, CategoryConfig } from '@/types/auto-letters.types';
import { getEnabledCategories } from '@/types/auto-letters.types';

interface CategorySelectorProps {
  value: AutoLetterCategory;
  onChange: (category: AutoLetterCategory) => void;
  disabled?: boolean;
}

const CATEGORY_ICONS = {
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  FileCheck,
  FileSearch,
  Home,
  Landmark,
  Receipt,
} as const;

export function CategorySelector({ value, onChange, disabled }: CategorySelectorProps) {
  const enabledCategories = getEnabledCategories();

  const getIcon = (iconName: CategoryConfig['icon']) => {
    const IconComponent = CATEGORY_ICONS[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-right text-lg">קטגוריית מכתב</CardTitle>
        <CardDescription className="text-right">
          בחר את קטגוריית המכתב שברצונך ליצור
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs
          value={value}
          onValueChange={(v) => onChange(v as AutoLetterCategory)}
          dir="rtl"
          className="w-full"
        >
          <TabsList className="w-full justify-start gap-2 h-auto flex-wrap">
            {enabledCategories.map((category) => (
              <TabsTrigger
                key={category.id}
                value={category.id}
                disabled={disabled}
                className="flex items-center gap-2 px-4 py-2"
              >
                {getIcon(category.icon)}
                <span>{category.label}</span>
              </TabsTrigger>
            ))}
          </TabsList>
        </Tabs>
      </CardContent>
    </Card>
  );
}
