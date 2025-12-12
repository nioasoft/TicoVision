/**
 * SignatureUpload Component
 * Upload and crop signature/stamp images
 * Features: Drag & drop, image cropping with react-easy-crop, PNG output
 */

import { useState, useCallback, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import Cropper from 'react-easy-crop';
import type { Area, Point } from 'react-easy-crop';
import { Upload, Trash2, Loader2, ZoomIn, ZoomOut, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { cn } from '@/lib/utils';
import { fileUploadService } from '@/services/file-upload.service';

interface SignatureUploadProps {
  currentSignaturePath: string | null;
  onUpload: (file: File) => Promise<void>;
  onDelete: () => Promise<void>;
  disabled?: boolean;
  label?: string;
}

// Helper: Create image element from URL
function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener('load', () => resolve(image));
    image.addEventListener('error', (error) => reject(error));
    image.crossOrigin = 'anonymous';
    image.src = url;
  });
}

// Helper: Get cropped image as PNG blob
async function getCroppedImg(
  imageSrc: string,
  pixelCrop: Area
): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement('canvas');
  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Could not get canvas context');
  }

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Canvas toBlob failed'));
        }
      },
      'image/png',
      1.0
    );
  });
}

export function SignatureUpload({
  currentSignaturePath,
  onUpload,
  onDelete,
  disabled = false,
  label = 'חתימה',
}: SignatureUploadProps) {
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Crop state
  const [showCropDialog, setShowCropDialog] = useState(false);
  const [imageToCrop, setImageToCrop] = useState<string | null>(null);
  const [crop, setCrop] = useState<Point>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);

  // Load preview URL when signature path changes
  useEffect(() => {
    if (currentSignaturePath) {
      setIsLoadingPreview(true);
      fileUploadService
        .getFileUrl(currentSignaturePath)
        .then((result) => {
          if (result.data) {
            setPreviewUrl(result.data);
          }
        })
        .finally(() => {
          setIsLoadingPreview(false);
        });
    } else {
      setPreviewUrl(null);
    }
  }, [currentSignaturePath]);

  // Handle file drop
  const onDrop = useCallback(
    (acceptedFiles: File[]) => {
      const file = acceptedFiles[0];
      if (!file) return;

      // Validate file type (any image for cropping)
      if (!file.type.startsWith('image/')) {
        setError('יש להעלות קובץ תמונה');
        return;
      }

      // Validate initial size (10MB max for processing)
      if (file.size > 10 * 1024 * 1024) {
        setError('הקובץ גדול מדי. מקסימום 10MB');
        return;
      }

      setError(null);

      // Read file and open crop dialog
      const reader = new FileReader();
      reader.onload = () => {
        setImageToCrop(reader.result as string);
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setShowCropDialog(true);
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.png', '.jpg', '.jpeg', '.gif', '.webp', '.bmp'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB for initial file
    multiple: false,
    disabled: disabled || isUploading,
  });

  // Handle crop complete
  const onCropComplete = useCallback((_: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  // Handle save cropped image
  const handleSaveCrop = async () => {
    if (!imageToCrop || !croppedAreaPixels) return;

    setIsUploading(true);
    try {
      // Get cropped image as PNG blob
      const croppedBlob = await getCroppedImg(imageToCrop, croppedAreaPixels);

      // Check final size
      if (croppedBlob.size > 500 * 1024) {
        setError(`התמונה גדולה מדי (${Math.round(croppedBlob.size / 1024)}KB). נסה לבחור אזור קטן יותר. מקסימום: 500KB`);
        setIsUploading(false);
        return;
      }

      // Create File from Blob
      const croppedFile = new File([croppedBlob], 'signature.png', {
        type: 'image/png',
      });

      // Upload
      await onUpload(croppedFile);

      // Close dialog and reset
      setShowCropDialog(false);
      setImageToCrop(null);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'שגיאה בחיתוך התמונה');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle delete
  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onDelete();
      setPreviewUrl(null);
    } finally {
      setIsDeleting(false);
      setShowDeleteConfirm(false);
    }
  };

  // Handle cancel crop
  const handleCancelCrop = () => {
    setShowCropDialog(false);
    setImageToCrop(null);
    setCrop({ x: 0, y: 0 });
    setZoom(1);
  };

  return (
    <>
      <div className="space-y-2" dir="rtl">
        <Label className="text-right block">{label}</Label>

        {isLoadingPreview ? (
          <div className="flex items-center justify-center p-4 bg-gray-50 rounded-lg">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : previewUrl ? (
          // Show current signature with delete option
          <div className="flex items-center gap-4 p-3 bg-gray-50 rounded-lg border">
            <img
              src={previewUrl}
              alt={label}
              className="h-16 w-auto border rounded bg-white"
            />
            <Button
              variant="destructive"
              size="sm"
              onClick={() => setShowDeleteConfirm(true)}
              disabled={isDeleting || disabled}
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : (
                <Trash2 className="h-4 w-4 ml-1" />
              )}
              מחק
            </Button>
          </div>
        ) : (
          // Upload zone
          <div
            {...getRootProps()}
            className={cn(
              'border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors',
              isDragActive
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-300 hover:border-gray-400',
              disabled && 'opacity-50 cursor-not-allowed'
            )}
          >
            <input {...getInputProps()} />
            <Upload className="h-6 w-6 mx-auto text-gray-400 mb-2" />
            <p className="text-sm text-gray-600">
              <span className="text-blue-600 font-medium">לחץ להעלאה</span> או
              גרור תמונה
            </p>
            <p className="text-xs text-gray-400 mt-1">
              כל סוגי התמונות נתמכים. אפשרות לחתוך לפני שמירה
            </p>
          </div>
        )}

        {error && (
          <Alert variant="destructive" className="py-2">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}
      </div>

      {/* Crop Dialog */}
      <Dialog open={showCropDialog} onOpenChange={setShowCropDialog}>
        <DialogContent className="max-w-2xl" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">חיתוך {label}</DialogTitle>
          </DialogHeader>

          <div className="relative h-[400px] bg-gray-900 rounded-lg overflow-hidden">
            {imageToCrop && (
              <Cropper
                image={imageToCrop}
                crop={crop}
                zoom={zoom}
                aspect={undefined} // Free aspect ratio
                onCropChange={setCrop}
                onCropComplete={onCropComplete}
                onZoomChange={setZoom}
              />
            )}
          </div>

          {/* Zoom controls */}
          <div className="flex items-center gap-4 px-4">
            <ZoomOut className="h-4 w-4 text-gray-500" />
            <Slider
              value={[zoom]}
              min={0.5}
              max={3}
              step={0.1}
              onValueChange={(values) => setZoom(values[0])}
              className="flex-1"
            />
            <ZoomIn className="h-4 w-4 text-gray-500" />
          </div>

          {error && (
            <Alert variant="destructive" className="py-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <DialogFooter className="gap-2 rtl:space-x-reverse">
            <Button
              variant="outline"
              onClick={handleCancelCrop}
              disabled={isUploading}
            >
              ביטול
            </Button>
            <Button onClick={handleSaveCrop} disabled={isUploading}>
              {isUploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin ml-2" />
                  שומר...
                </>
              ) : (
                'שמור'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">מחיקת {label}</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              האם אתה בטוח שברצונך למחוק את ה{label}? פעולה זו לא ניתנת לביטול.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="rtl:space-x-reverse gap-2">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <Loader2 className="h-4 w-4 animate-spin ml-1" />
              ) : null}
              מחק
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
