/**
 * CategoryLetterSelector - Accordion-based unified category & letter type selector
 * Replaces the separate CategorySelector + LetterTypeSelector components
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '@/components/ui/accordion';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  Banknote,
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  FileCheck,
  FileSearch,
  Home,
  Landmark,
  Receipt,
  Check
} from 'lucide-react';
import type { AutoLetterCategory, CategoryConfig, LetterTypeConfig } from '@/types/auto-letters.types';
import { getEnabledCategories, getLetterTypesForCategory } from '@/types/auto-letters.types';

interface CategoryLetterSelectorProps {
  selectedCategory: AutoLetterCategory | null;
  selectedLetterTypeId: string | null;
  onSelectionChange: (category: AutoLetterCategory, letterTypeId: string) => void;
  disabled?: boolean;
}

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Banknote,
  Bell,
  Building2,
  Calendar,
  ClipboardCheck,
  FileCheck,
  FileSearch,
  Home,
  Landmark,
  Receipt,
};

export function CategoryLetterSelector({
  selectedCategory,
  selectedLetterTypeId,
  onSelectionChange,
  disabled = false,
}: CategoryLetterSelectorProps) {
  const enabledCategories = getEnabledCategories();

  // Track which accordion item is open
  const [openItem, setOpenItem] = useState<string | undefined>(
    selectedCategory || undefined
  );

  // When selection changes externally, open the relevant accordion
  useEffect(() => {
    if (selectedCategory) {
      setOpenItem(selectedCategory);
    }
  }, [selectedCategory]);

  const getIcon = (iconName: CategoryConfig['icon']) => {
    const IconComponent = CATEGORY_ICONS[iconName];
    return IconComponent ? <IconComponent className="h-4 w-4" /> : null;
  };

  const handleLetterTypeSelect = (category: AutoLetterCategory, letterTypeId: string) => {
    if (!disabled) {
      onSelectionChange(category, letterTypeId);
    }
  };

  const getCategoryLetterTypes = (categoryId: AutoLetterCategory): LetterTypeConfig[] => {
    return getLetterTypesForCategory(categoryId);
  };

  const isCategorySelected = (categoryId: AutoLetterCategory): boolean => {
    return selectedCategory === categoryId && selectedLetterTypeId !== null;
  };

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-right text-lg">בחירת סוג מכתב</CardTitle>
        <CardDescription className="text-right">
          בחר קטגוריה וסוג מכתב מהרשימה
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Accordion
          type="single"
          collapsible
          dir="rtl"
          value={openItem}
          onValueChange={setOpenItem}
          className="w-full"
        >
          {enabledCategories.map((category) => {
            const letterTypes = getCategoryLetterTypes(category.id);
            const isSelected = isCategorySelected(category.id);
            const selectedType = letterTypes.find(t => t.id === selectedLetterTypeId);

            return (
              <AccordionItem
                key={category.id}
                value={category.id}
                className={cn(
                  "border rounded-lg mb-2 transition-colors",
                  isSelected && "border-primary bg-primary/5",
                  disabled && "opacity-50 pointer-events-none"
                )}
              >
                <AccordionTrigger
                  className={cn(
                    "px-4 hover:no-underline hover:bg-muted/50 rounded-t-lg",
                    "[&[data-state=open]]:rounded-b-none",
                    "flex-row-reverse justify-end gap-3"
                  )}
                >
                  <div className="flex items-center gap-3 flex-1">
                    <span className="text-muted-foreground">
                      {getIcon(category.icon)}
                    </span>
                    <span className="font-medium">{category.label}</span>
                    {isSelected && selectedType && (
                      <Badge variant="secondary" className="mr-auto flex items-center gap-1">
                        <Check className="h-3 w-3" />
                        {selectedType.label}
                      </Badge>
                    )}
                  </div>
                </AccordionTrigger>
                <AccordionContent className="px-4 pb-4">
                  <div className="text-xs text-muted-foreground mb-3 text-right">
                    {category.description}
                  </div>
                  {letterTypes.length > 0 ? (
                    <RadioGroup
                      value={selectedCategory === category.id ? selectedLetterTypeId || '' : ''}
                      onValueChange={(value) => handleLetterTypeSelect(category.id, value)}
                      dir="rtl"
                      className="gap-2"
                    >
                      {letterTypes.map((letterType) => (
                        <div
                          key={letterType.id}
                          className={cn(
                            "flex items-start gap-3 p-3 rounded-lg border transition-colors cursor-pointer",
                            "hover:bg-muted/50",
                            selectedLetterTypeId === letterType.id && selectedCategory === category.id
                              ? "border-primary bg-primary/10"
                              : "border-transparent bg-muted/30"
                          )}
                          onClick={() => handleLetterTypeSelect(category.id, letterType.id)}
                        >
                          <RadioGroupItem
                            value={letterType.id}
                            id={`letter-${letterType.id}`}
                            className="mt-0.5"
                          />
                          <div className="flex-1 text-right">
                            <Label
                              htmlFor={`letter-${letterType.id}`}
                              className="font-medium cursor-pointer"
                            >
                              {letterType.label}
                            </Label>
                            <p className="text-xs text-muted-foreground mt-1">
                              {letterType.description}
                            </p>
                          </div>
                        </div>
                      ))}
                    </RadioGroup>
                  ) : (
                    <div className="text-center text-muted-foreground py-4">
                      אין סוגי מכתבים זמינים בקטגוריה זו
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      </CardContent>
    </Card>
  );
}
