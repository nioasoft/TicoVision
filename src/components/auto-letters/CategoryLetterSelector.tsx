/**
 * CategoryLetterSelector - Compact sidebar selector
 * Replaces accordion with a scrollable sidebar design
 */

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
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
  ChevronLeft,
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

  // Track which category is expanded - start with all closed
  const [expandedCategory, setExpandedCategory] = useState<AutoLetterCategory | null>(null);
  const isInitialMount = useRef(true);

  // When selection changes externally (after initial mount), expand the relevant category
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }
    if (selectedCategory) {
      setExpandedCategory(selectedCategory);
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

  const handleCategoryClick = (categoryId: AutoLetterCategory) => {
    if (expandedCategory === categoryId) {
      setExpandedCategory(null);
    } else {
      setExpandedCategory(categoryId);
    }
  };

  const getCategoryLetterTypes = (categoryId: AutoLetterCategory): LetterTypeConfig[] => {
    return getLetterTypesForCategory(categoryId);
  };

  return (
    <Card className="h-fit sticky top-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-right text-base">בחירת סוג מכתב</CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <ScrollArea className="h-[calc(100vh-200px)]">
          <div className="px-4 pb-4 space-y-1">
            {enabledCategories.map((category) => {
              const letterTypes = getCategoryLetterTypes(category.id);
              const isExpanded = expandedCategory === category.id;
              const hasSelection = selectedCategory === category.id && selectedLetterTypeId !== null;
              const selectedType = letterTypes.find(t => t.id === selectedLetterTypeId);

              return (
                <div key={category.id} className="space-y-1">
                  {/* Category Header */}
                  <button
                    onClick={() => handleCategoryClick(category.id)}
                    disabled={disabled}
                    className={cn(
                      "w-full flex items-center gap-2 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-right",
                      "hover:bg-muted",
                      hasSelection && "bg-primary/10 text-primary",
                      disabled && "opacity-50 cursor-not-allowed"
                    )}
                  >
                    <span className={cn(
                      "text-muted-foreground",
                      hasSelection && "text-primary"
                    )}>
                      {getIcon(category.icon)}
                    </span>
                    <span className="flex-1 text-right">{category.label}</span>
                    <ChevronLeft className={cn(
                      "h-4 w-4 transition-transform text-muted-foreground",
                      isExpanded && "rotate-90"
                    )} />
                  </button>

                  {/* Letter Types - Expanded */}
                  {isExpanded && (
                    <div className="pr-6 space-y-1">
                      {letterTypes.length > 0 ? (
                        letterTypes.map((letterType) => {
                          const isSelected = selectedLetterTypeId === letterType.id && selectedCategory === category.id;

                          return (
                            <button
                              key={letterType.id}
                              onClick={() => handleLetterTypeSelect(category.id, letterType.id)}
                              disabled={disabled}
                              className={cn(
                                "w-full text-right px-3 py-2 rounded-md text-sm transition-colors",
                                isSelected
                                  ? "bg-primary text-primary-foreground font-medium hover:bg-primary/90"
                                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
                                disabled && "opacity-50 cursor-not-allowed"
                              )}
                            >
                              {letterType.label}
                            </button>
                          );
                        })
                      ) : (
                        <div className="text-xs text-muted-foreground text-right px-3 py-2">
                          אין סוגי מכתבים זמינים
                        </div>
                      )}
                    </div>
                  )}

                  {/* Show selected type when collapsed */}
                  {!isExpanded && hasSelection && selectedType && (
                    <div className="pr-6 text-xs text-muted-foreground text-right px-3">
                      נבחר: {selectedType.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
}
