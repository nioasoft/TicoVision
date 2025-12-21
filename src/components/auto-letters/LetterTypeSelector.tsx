/**
 * LetterTypeSelector - Dropdown for selecting letter type within a category
 */

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FileText } from 'lucide-react';
import type { AutoLetterCategory } from '@/types/auto-letters.types';
import { getLetterTypesForCategory, getCategoryById } from '@/types/auto-letters.types';

interface LetterTypeSelectorProps {
  category: AutoLetterCategory;
  value: string | null;
  onChange: (letterTypeId: string) => void;
  disabled?: boolean;
}

export function LetterTypeSelector({
  category,
  value,
  onChange,
  disabled,
}: LetterTypeSelectorProps) {
  const letterTypes = getLetterTypesForCategory(category);
  const categoryConfig = getCategoryById(category);

  if (letterTypes.length === 0) {
    return (
      <Card className="mb-6">
        <CardContent className="py-8 text-center text-gray-500">
          אין סוגי מכתבים זמינים בקטגוריה זו
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="mb-6">
      <CardHeader className="pb-3">
        <CardTitle className="text-right text-lg">סוג מכתב</CardTitle>
        <CardDescription className="text-right">
          {categoryConfig?.description || 'בחר את סוג המכתב'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Select
          value={value || ''}
          onValueChange={onChange}
          disabled={disabled}
          dir="rtl"
        >
          <SelectTrigger className="w-full text-right" dir="rtl">
            <SelectValue placeholder="בחר סוג מכתב..." />
          </SelectTrigger>
          <SelectContent dir="rtl">
            {letterTypes.map((letterType) => (
              <SelectItem
                key={letterType.id}
                value={letterType.id}
                className="text-right"
              >
                <div className="flex items-center gap-2">
                  <FileText className="h-4 w-4 text-muted-foreground" />
                  <div className="flex flex-col items-start">
                    <span className="font-medium">{letterType.label}</span>
                    <span className="text-xs text-muted-foreground">
                      {letterType.description}
                    </span>
                  </div>
                </div>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </CardContent>
    </Card>
  );
}
