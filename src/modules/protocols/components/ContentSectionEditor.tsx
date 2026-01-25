/**
 * ContentSectionEditor
 * Component for managing free-text content sections:
 * - Announcements (הכרזות)
 * - Background Stories (סיפורי רקע)
 * - Recommendations (המלצות)
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import {
  Plus,
  Pencil,
  Trash2,
  Megaphone,
  BookOpen,
  Lightbulb,
} from 'lucide-react';
import {
  CONTENT_SECTION_TYPES,
  getContentSectionTypeInfo,
} from '../types/protocol.types';
import type { CreateContentSectionDto, ContentSectionType, ItemStyle } from '../types/protocol.types';
import { StyleToolbar, getContentClasses, getContentStyle } from './StyleToolbar';
import { cn } from '@/lib/utils';

interface ContentSectionEditorProps {
  sections: CreateContentSectionDto[];
  onChange: (sections: CreateContentSectionDto[]) => void;
}

interface SectionFormState {
  section_type: ContentSectionType;
  content: string;
  style: ItemStyle;
}

export function ContentSectionEditor({ sections, onChange }: ContentSectionEditorProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [formState, setFormState] = useState<SectionFormState>({
    section_type: 'announcement',
    content: '',
    style: {},
  });

  // Get icon for section type
  const getSectionIcon = (type: ContentSectionType) => {
    switch (type) {
      case 'announcement':
        return <Megaphone className="h-4 w-4" />;
      case 'background_story':
        return <BookOpen className="h-4 w-4" />;
      case 'recommendation':
        return <Lightbulb className="h-4 w-4" />;
    }
  };

  // Group sections by type
  const groupedSections = CONTENT_SECTION_TYPES.map((typeInfo) => ({
    ...typeInfo,
    sections: sections
      .map((s, index) => ({ ...s, originalIndex: index }))
      .filter((s) => s.section_type === typeInfo.type),
  }));

  // Reset form
  const resetForm = () => {
    setFormState({
      section_type: 'announcement',
      content: '',
      style: {},
    });
    setEditIndex(null);
  };

  // Open dialog for new section
  const handleAdd = (type?: ContentSectionType) => {
    resetForm();
    if (type) {
      setFormState((prev) => ({ ...prev, section_type: type }));
    }
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (index: number) => {
    const section = sections[index];
    setFormState({
      section_type: section.section_type,
      content: section.content,
      style: section.style || {},
    });
    setEditIndex(index);
    setDialogOpen(true);
  };

  // Delete section
  const handleDelete = (index: number) => {
    const newSections = [...sections];
    newSections.splice(index, 1);
    onChange(newSections);
  };

  // Save section
  const handleSave = () => {
    const newSection: CreateContentSectionDto = {
      section_type: formState.section_type,
      content: formState.content.trim(),
      style: formState.style,
    };

    if (editIndex !== null) {
      // Update existing
      const newSections = [...sections];
      newSections[editIndex] = newSection;
      onChange(newSections);
    } else {
      // Add new
      onChange([...sections, newSection]);
    }

    setDialogOpen(false);
    resetForm();
  };

  // Handle field change
  const handleFieldChange = <K extends keyof SectionFormState>(
    field: K,
    value: SectionFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="space-y-4">
      {/* Section Type Buttons */}
      <div className="flex items-center gap-2 flex-row-reverse flex-wrap justify-end" dir="rtl">
        {CONTENT_SECTION_TYPES.map((type) => (
          <Button
            key={type.type}
            variant="outline"
            size="sm"
            onClick={() => handleAdd(type.type)}
            className="flex items-center gap-2 flex-row-reverse"
          >
            {getSectionIcon(type.type)}
            <Plus className="h-3 w-3" />
            {type.label}
          </Button>
        ))}
      </div>

      {/* Sections by Type */}
      {sections.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <BookOpen className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>לא נוסף תוכן נוסף</p>
          <p className="text-sm">השתמש בכפתורים למעלה להוספת הכרזות, סיפורי רקע או המלצות</p>
        </div>
      ) : (
        <Accordion type="multiple" defaultValue={CONTENT_SECTION_TYPES.map((t) => t.type)}>
          {groupedSections.map((group) => {
            if (group.sections.length === 0) return null;

            const typeInfo = getContentSectionTypeInfo(group.type);

            return (
              <AccordionItem key={group.type} value={group.type}>
                <AccordionTrigger className="hover:no-underline">
                  <div className="flex items-center gap-2">
                    {getSectionIcon(group.type)}
                    <span className="font-semibold">{typeInfo.labelPlural}</span>
                    <Badge variant="secondary">{group.sections.length}</Badge>
                  </div>
                </AccordionTrigger>
                <AccordionContent>
                  <div className="space-y-3 pt-2">
                    {group.sections.map((section) => (
                      <div
                        key={section.originalIndex}
                        className="bg-gray-50 rounded-lg p-4 border"
                      >
                        <div className="flex items-start justify-between flex-row-reverse">
                          <div className="flex items-center gap-1 flex-row-reverse flex-shrink-0 ml-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleEdit(section.originalIndex)}
                            >
                              <Pencil className="h-3 w-3" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-red-500 hover:text-red-600"
                              onClick={() => handleDelete(section.originalIndex)}
                            >
                              <Trash2 className="h-3 w-3" />
                            </Button>
                          </div>
                          <p
                            className={cn('text-sm text-right whitespace-pre-wrap flex-1', getContentClasses(section.style))}
                            style={getContentStyle(section.style)}
                          >
                            {section.content}
                          </p>
                        </div>
                      </div>
                    ))}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleAdd(group.type)}
                      className="w-full flex items-center gap-2 flex-row-reverse text-gray-500"
                    >
                      <Plus className="h-3 w-3" />
                      הוסף {typeInfo.label}
                    </Button>
                  </div>
                </AccordionContent>
              </AccordionItem>
            );
          })}
        </Accordion>
      )}

      {/* Add/Edit Section Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editIndex !== null ? 'עריכת תוכן' : 'הוספת תוכן'}
            </DialogTitle>
            <DialogDescription className="text-right">
              הוסף הכרזה, סיפור רקע או המלצה לפרוטוקול
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Section Type */}
            <div className="space-y-2">
              <Label className="text-right block">סוג התוכן</Label>
              <Select
                value={formState.section_type}
                onValueChange={(v) => handleFieldChange('section_type', v as ContentSectionType)}
                dir="rtl"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTENT_SECTION_TYPES.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      <div className="flex items-center gap-2 flex-row-reverse">
                        {getSectionIcon(type.type)}
                        {type.label}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-right block">
                תוכן
              </Label>
              <Textarea
                id="content"
                value={formState.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}

                className="text-right min-h-[120px]"
                dir="rtl"
              />
              <StyleToolbar
                style={formState.style}
                onChange={(style) => handleFieldChange('style', style)}
              />
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <Button onClick={handleSave} disabled={!formState.content.trim()}>
              {editIndex !== null ? 'עדכון' : 'הוספה'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
