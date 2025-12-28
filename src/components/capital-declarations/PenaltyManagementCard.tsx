/**
 * Penalty Management Card Component
 * Full card UI for managing penalty information on a capital declaration
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertTriangle, Save, Trash2, Receipt } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import type {
  PenaltyStatus,
  PenaltyFormData,
  PenaltyPaidBy,
  CapitalDeclaration,
} from '@/types/capital-declaration.types';
import {
  PENALTY_STATUS_LABELS,
  PENALTY_PAID_BY_LABELS,
  createEmptyPenaltyForm,
} from '@/types/capital-declaration.types';
import { PenaltyStatusBadge } from './PenaltyStatusBadge';

interface PenaltyManagementCardProps {
  declaration: CapitalDeclaration;
  onUpdate?: (updated: CapitalDeclaration) => void;
}

export function PenaltyManagementCard({
  declaration,
  onUpdate,
}: PenaltyManagementCardProps) {
  const [hasPenalty, setHasPenalty] = useState(declaration.penalty_status !== null);
  const [formData, setFormData] = useState<PenaltyFormData>(() => ({
    penalty_amount: declaration.penalty_amount,
    penalty_status: declaration.penalty_status,
    penalty_received_date: declaration.penalty_received_date,
    penalty_notes: declaration.penalty_notes,
    appeal_date: declaration.appeal_date,
    appeal_notes: declaration.appeal_notes,
    penalty_paid_date: declaration.penalty_paid_date,
    penalty_paid_amount: declaration.penalty_paid_amount,
    penalty_paid_by: declaration.penalty_paid_by,
  }));
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Track if declaration data changes
  useEffect(() => {
    setFormData({
      penalty_amount: declaration.penalty_amount,
      penalty_status: declaration.penalty_status,
      penalty_received_date: declaration.penalty_received_date,
      penalty_notes: declaration.penalty_notes,
      appeal_date: declaration.appeal_date,
      appeal_notes: declaration.appeal_notes,
      penalty_paid_date: declaration.penalty_paid_date,
      penalty_paid_amount: declaration.penalty_paid_amount,
      penalty_paid_by: declaration.penalty_paid_by,
    });
    setHasPenalty(declaration.penalty_status !== null);
    setHasChanges(false);
  }, [declaration]);

  const handleTogglePenalty = async (value: boolean) => {
    if (!value) {
      // Clear penalty
      setSaving(true);
      try {
        const { data: updated, error } = await capitalDeclarationService.clearPenalty(
          declaration.id
        );

        if (error) {
          toast.error('שגיאה במחיקת הקנס');
          return;
        }

        toast.success('הקנס נמחק');
        setHasPenalty(false);
        setFormData(createEmptyPenaltyForm());
        setHasChanges(false);
        if (updated && onUpdate) {
          onUpdate(updated);
        }
      } finally {
        setSaving(false);
      }
    } else {
      // Enable penalty - just show the form
      setHasPenalty(true);
      setFormData((prev) => ({
        ...prev,
        penalty_status: 'received',
      }));
      setHasChanges(true);
    }
  };

  const handleFieldChange = <K extends keyof PenaltyFormData>(
    field: K,
    value: PenaltyFormData[K]
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const handleSave = async () => {
    if (!formData.penalty_status) {
      toast.error('יש לבחור סטטוס קנס');
      return;
    }

    setSaving(true);
    try {
      const { data: updated, error } = await capitalDeclarationService.updatePenalty(
        declaration.id,
        formData
      );

      if (error) {
        toast.error('שגיאה בשמירת הקנס');
        return;
      }

      toast.success('הקנס נשמר בהצלחה');
      setHasChanges(false);
      if (updated && onUpdate) {
        onUpdate(updated);
      }
    } finally {
      setSaving(false);
    }
  };

  const showAppealFields = formData.penalty_status === 'appeal_submitted';
  const showPaymentFields =
    formData.penalty_status === 'paid_by_client' ||
    formData.penalty_status === 'paid_by_office';

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base flex items-center gap-2">
            <Receipt className="h-4 w-4" />
            ניהול קנס
          </CardTitle>
          <div className="flex items-center gap-2">
            <Label htmlFor="has-penalty" className="text-sm text-muted-foreground">
              יש קנס
            </Label>
            <Switch
              id="has-penalty"
              checked={hasPenalty}
              onCheckedChange={handleTogglePenalty}
              disabled={saving}
            />
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Warning banner for late submission without penalty data */}
        {declaration.was_submitted_late && !hasPenalty && (
          <Alert className="mb-4 border-orange-300 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800 rtl:text-right">
              ההצהרה הוגשה באיחור. אם התקבל קנס, יש לעדכן את הפרטים כאן.
            </AlertDescription>
          </Alert>
        )}

        {!hasPenalty ? (
          <p className="text-sm text-muted-foreground text-center py-4">
            לא רשום קנס להצהרה זו
          </p>
        ) : (
          <div className="space-y-4">
            {/* Status & Amount Row */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>סטטוס קנס</Label>
                <Select
                  value={formData.penalty_status || ''}
                  onValueChange={(v) =>
                    handleFieldChange('penalty_status', v as PenaltyStatus)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="בחר סטטוס" />
                  </SelectTrigger>
                  <SelectContent>
                    {(Object.keys(PENALTY_STATUS_LABELS) as PenaltyStatus[]).map(
                      (status) => (
                        <SelectItem key={status} value={status}>
                          {PENALTY_STATUS_LABELS[status]}
                        </SelectItem>
                      )
                    )}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>סכום קנס</Label>
                <div className="relative">
                  <Input
                    type="number"
                    value={formData.penalty_amount ?? ''}
                    onChange={(e) =>
                      handleFieldChange(
                        'penalty_amount',
                        e.target.value ? Number(e.target.value) : null
                      )
                    }
                    placeholder="0"
                    className="pr-8"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                    ₪
                  </span>
                </div>
              </div>
            </div>

            {/* Received Date */}
            <div className="space-y-2">
              <Label>תאריך קבלת הקנס</Label>
              <Input
                type="date"
                value={formData.penalty_received_date || ''}
                onChange={(e) =>
                  handleFieldChange('penalty_received_date', e.target.value || null)
                }
              />
            </div>

            {/* Notes */}
            <div className="space-y-2">
              <Label>הערות לקנס</Label>
              <Textarea
                value={formData.penalty_notes || ''}
                onChange={(e) =>
                  handleFieldChange('penalty_notes', e.target.value || null)
                }
                placeholder="הערות כלליות לגבי הקנס..."
                rows={2}
              />
            </div>

            {/* Appeal Fields */}
            {showAppealFields && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2 text-yellow-700">
                  פרטי ערעור
                </h4>

                <div className="space-y-2">
                  <Label>תאריך הגשת ערעור</Label>
                  <Input
                    type="date"
                    value={formData.appeal_date || ''}
                    onChange={(e) =>
                      handleFieldChange('appeal_date', e.target.value || null)
                    }
                  />
                </div>

                <div className="space-y-2">
                  <Label>הערות לערעור</Label>
                  <Textarea
                    value={formData.appeal_notes || ''}
                    onChange={(e) =>
                      handleFieldChange('appeal_notes', e.target.value || null)
                    }
                    placeholder="פרטים על הערעור..."
                    rows={2}
                  />
                </div>
              </div>
            )}

            {/* Payment Fields */}
            {showPaymentFields && (
              <div className="space-y-4 pt-4 border-t">
                <h4 className="text-sm font-medium flex items-center gap-2 text-green-700">
                  פרטי תשלום
                </h4>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>תאריך תשלום</Label>
                    <Input
                      type="date"
                      value={formData.penalty_paid_date || ''}
                      onChange={(e) =>
                        handleFieldChange('penalty_paid_date', e.target.value || null)
                      }
                    />
                  </div>

                  <div className="space-y-2">
                    <Label>סכום ששולם</Label>
                    <div className="relative">
                      <Input
                        type="number"
                        value={formData.penalty_paid_amount ?? ''}
                        onChange={(e) =>
                          handleFieldChange(
                            'penalty_paid_amount',
                            e.target.value ? Number(e.target.value) : null
                          )
                        }
                        placeholder="0"
                        className="pr-8"
                      />
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                        ₪
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleTogglePenalty(false)}
                disabled={saving}
                className="text-red-600 hover:text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4 ml-2" />
                מחק קנס
              </Button>

              <Button
                size="sm"
                onClick={handleSave}
                disabled={saving || !hasChanges}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 ml-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 ml-2" />
                )}
                שמור
              </Button>
            </div>

            {/* Current Status Display */}
            {formData.penalty_status && (
              <div className="flex items-center gap-2 pt-2">
                <span className="text-sm text-muted-foreground">סטטוס נוכחי:</span>
                <PenaltyStatusBadge
                  status={formData.penalty_status}
                  amount={formData.penalty_amount}
                  showAmount
                />
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
