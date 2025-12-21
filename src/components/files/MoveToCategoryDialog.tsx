/**
 * MoveToCategoryDialog Component
 * Allows user to select a target category to move file(s) to
 */

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { FolderInput, Loader2, X } from 'lucide-react';
import { fileUploadService } from '@/services/file-upload.service';
import {
  type FileCategory,
  getAllCategories,
  getCategoryLabel,
} from '@/types/file-attachment.types';

export interface MoveToCategoryDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fileIds: string[];
  currentCategory: FileCategory;
  fileNames?: string[];
  onSuccess?: () => void;
}

export function MoveToCategoryDialog({
  open,
  onOpenChange,
  fileIds,
  currentCategory,
  fileNames = [],
  onSuccess,
}: MoveToCategoryDialogProps) {
  const [isMoving, setIsMoving] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState<FileCategory | ''>('');

  const isBulkMove = fileIds.length > 1;

  // Filter out current category from options
  const availableCategories = getAllCategories().filter(
    (cat) => cat.key !== currentCategory
  );

  const handleMove = async () => {
    if (!selectedCategory) {
      toast.error('יש לבחור קטגוריה יעד');
      return;
    }

    try {
      setIsMoving(true);

      if (isBulkMove) {
        const result = await fileUploadService.bulkMoveFilesToCategory(
          fileIds,
          selectedCategory
        );

        if (result.error) {
          throw result.error;
        }

        const { moved, errors } = result.data!;
        if (moved > 0) {
          toast.success(`${moved} קבצים הועברו בהצלחה`);
        }
        if (errors.length > 0) {
          toast.info(errors[0]);
        }
      } else {
        const result = await fileUploadService.moveFileToCategory(
          fileIds[0],
          selectedCategory
        );

        if (result.error) {
          throw result.error;
        }

        toast.success('הקובץ הועבר בהצלחה');
      }

      onOpenChange(false);
      setSelectedCategory('');
      onSuccess?.();
    } catch (error) {
      console.error('Error moving file(s):', error);
      toast.error('שגיאה בהעברת הקובץ');
    } finally {
      setIsMoving(false);
    }
  };

  const handleCancel = () => {
    onOpenChange(false);
    setSelectedCategory('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader className="rtl:text-right ltr:text-left">
          <DialogTitle className="flex items-center gap-2 rtl:flex-row-reverse">
            <FolderInput className="h-5 w-5 text-primary" />
            {isBulkMove ? 'העברת קבצים לקטגוריה' : 'העברת קובץ לקטגוריה'}
          </DialogTitle>
          <DialogDescription className="rtl:text-right ltr:text-left">
            {isBulkMove ? (
              <>
                העברת <span className="font-medium">{fileIds.length}</span> קבצים
                מקטגוריית "{getCategoryLabel(currentCategory)}" לקטגוריה אחרת
              </>
            ) : (
              <>
                בחר את הקטגוריה אליה להעביר את הקובץ
                {fileNames[0] && (
                  <>
                    <br />
                    <span className="font-medium">{fileNames[0]}</span>
                  </>
                )}
              </>
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          <Select
            value={selectedCategory}
            onValueChange={(val) => setSelectedCategory(val as FileCategory)}
            disabled={isMoving}
          >
            <SelectTrigger className="rtl:text-right">
              <SelectValue placeholder="בחר קטגוריה יעד" />
            </SelectTrigger>
            <SelectContent>
              {availableCategories.map((category) => (
                <SelectItem key={category.key} value={category.key}>
                  {category.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DialogFooter className="sm:justify-start rtl:space-x-reverse gap-2">
          <Button
            variant="outline"
            onClick={handleCancel}
            disabled={isMoving}
          >
            <X className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2" />
            ביטול
          </Button>
          <Button
            onClick={handleMove}
            disabled={isMoving || !selectedCategory}
          >
            {isMoving ? (
              <Loader2 className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2 animate-spin" />
            ) : (
              <FolderInput className="h-4 w-4 ml-2 rtl:ml-0 rtl:mr-2" />
            )}
            {isMoving ? 'מעביר...' : 'העבר'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
