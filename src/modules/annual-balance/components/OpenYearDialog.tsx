/**
 * OpenYearDialog - Confirmation dialog for opening a new balance year
 * Shows preview of how many clients will be loaded, warns if year exists
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AlertTriangle, Loader2 } from 'lucide-react';
import { annualBalanceService } from '../services/annual-balance.service';
import { openYearSchema } from '../types/validation';

interface OpenYearDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const OpenYearDialog: React.FC<OpenYearDialogProps> = ({
  open,
  onOpenChange,
  onSuccess,
}) => {
  const currentYear = new Date().getFullYear();
  const [selectedYear, setSelectedYear] = useState(currentYear - 1);
  const [preview, setPreview] = useState<{ clientCount: number; yearExists: boolean } | null>(null);
  const [loadingPreview, setLoadingPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number } | null>(null);

  const yearOptions = Array.from({ length: 6 }, (_, i) => currentYear - i);

  const fetchPreview = useCallback(async (year: number) => {
    setLoadingPreview(true);
    setError(null);
    setResult(null);
    try {
      const response = await annualBalanceService.getOpenYearPreview(year);
      if (response.error) {
        setError(response.error.message);
      } else {
        setPreview(response.data);
      }
    } catch {
      setError('שגיאה בטעינת תצוגה מקדימה');
    }
    setLoadingPreview(false);
  }, []);

  useEffect(() => {
    if (open) {
      setResult(null);
      setError(null);
      fetchPreview(selectedYear);
    }
  }, [open, selectedYear, fetchPreview]);

  const handleYearChange = (value: string) => {
    const year = Number(value);
    setSelectedYear(year);
  };

  const handleSubmit = async () => {
    // Zod validation
    const validation = openYearSchema.safeParse({ year: selectedYear });
    if (!validation.success) {
      setError(validation.error.issues[0].message);
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const response = await annualBalanceService.openYear(selectedYear);
      if (response.error) {
        setError(response.error.message);
      } else if (response.data) {
        setResult({ created: response.data.created });
      }
    } catch {
      setError('שגיאה בפתיחת שנה');
    }
    setSubmitting(false);
  };

  const handleClose = () => {
    if (result) {
      onSuccess();
    }
    onOpenChange(false);
    setResult(null);
    setPreview(null);
    setError(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right">פתיחת שנת מאזנים</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Year selector */}
          <div className="flex items-center gap-3">
            <label className="text-sm font-medium">שנה:</label>
            <Select
              value={String(selectedYear)}
              onValueChange={handleYearChange}
              disabled={submitting || !!result}
            >
              <SelectTrigger className="w-[120px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {yearOptions.map((year) => (
                  <SelectItem key={year} value={String(year)}>
                    {year}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Preview info */}
          {loadingPreview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              <span>טוען נתונים...</span>
            </div>
          )}

          {preview && !loadingPreview && !result && (
            <div className="space-y-3">
              {preview.yearExists && (
                <div className="flex items-start gap-2 rounded-md border border-yellow-200 bg-yellow-50 p-3">
                  <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-yellow-800">
                    <p className="font-medium">שנת {selectedYear} כבר פתוחה</p>
                    <p>לא ניתן לפתוח שנה שכבר קיימת במערכת.</p>
                  </div>
                </div>
              )}

              {!preview.yearExists && (
                <div className="rounded-md border bg-slate-50 p-3">
                  <p className="text-sm">
                    פתיחת מאזני <strong>{selectedYear}</strong> עבור{' '}
                    <strong>{preview.clientCount}</strong> לקוחות (חברות ושותפויות פעילות).
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    כל התיקים ייפתחו בסטטוס &quot;טרם התקבל חומר לידנו&quot;.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Result */}
          {result && (
            <div className="rounded-md border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-800 font-medium">
                נפתחו {result.created} תיקים לשנת {selectedYear}
              </p>
            </div>
          )}

          {/* Error */}
          {error && !result && (
            <div className="rounded-md border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}
        </div>

        <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
          {result ? (
            <Button onClick={handleClose}>סגור</Button>
          ) : (
            <>
              <Button variant="outline" onClick={handleClose} disabled={submitting}>
                ביטול
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || loadingPreview || !preview || preview.yearExists}
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin ml-2" />}
                פתח שנה
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
