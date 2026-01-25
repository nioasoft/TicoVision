/**
 * Component Simulator
 * Visual letter builder - mix and match letter components
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import { Eye, Save, Mail, Loader2, AlertCircle, Trash2, FileText, CheckCircle2 } from 'lucide-react';
import { ClientSelector } from '@/components/ClientSelector';
import type { Client } from '@/services/client.service';
import SimulatorService from '../services/simulator.service';
import type { SavedCombination, ComponentSelection } from '../types/simulator.types';
import { BODY_OPTIONS, PAYMENT_OPTIONS } from '../types/simulator.types';
import type { LetterVariables } from '../types/letter.types';

export function ComponentSimulator() {
  // Client selection
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);

  // Component selection
  const [selectedBody, setSelectedBody] = useState('annual-fee.html');
  const [selectedPayment, setSelectedPayment] = useState('payment-section-audit.html');
  const [amount, setAmount] = useState<number>(52000);

  // Saved combinations
  const [savedCombinations, setSavedCombinations] = useState<SavedCombination[]>([]);
  const [selectedCombinationId, setSelectedCombinationId] = useState<string>('');
  const [showSaveCombinationDialog, setShowSaveCombinationDialog] = useState(false);
  const [combinationName, setCombinationName] = useState('');
  const [saveDefaultAmount, setSaveDefaultAmount] = useState(false);

  // Preview
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewHtml, setPreviewHtml] = useState('');
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<LetterVariables | null>(null);

  // Actions
  const [isSaving, setIsSaving] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [savedLetterId, setSavedLetterId] = useState<string | null>(null);

  // Load saved combinations on mount
  useEffect(() => {
    loadSavedCombinations();
  }, []);

  // Load default amount when combination changes
  useEffect(() => {
    if (selectedCombinationId) {
      const combination = savedCombinations.find((c) => c.id === selectedCombinationId);
      if (combination) {
        setSelectedBody(combination.body_template);
        setSelectedPayment(combination.payment_template);
        if (combination.default_amount) {
          setAmount(combination.default_amount);
        }
      }
    }
  }, [selectedCombinationId, savedCombinations]);

  /**
   * Load all saved combinations
   */
  const loadSavedCombinations = async () => {
    const { data, error } = await SimulatorService.getSavedCombinations();

    if (error) {
      console.error('Error loading combinations:', error);
      return;
    }

    setSavedCombinations(data || []);
  };

  /**
   * Handle preview button click
   */
  const handlePreview = async () => {
    if (!selectedClient) {
      toast.error('יש לבחור לקוח');
      return;
    }

    setIsLoadingPreview(true);

    try {
      const { data, error } = await SimulatorService.buildLetterFromComponents(
        selectedClient.id,
        selectedBody,
        selectedPayment,
        amount
      );

      if (error) throw error;

      setPreviewHtml(data!.html);
      setPreviewVariables(data!.variables);
      setIsPreviewOpen(true);
    } catch (error) {
      console.error('Preview error:', error);
      toast.error('שגיאה ביצירת תצוגה מקדימה');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  /**
   * Save letter to database
   */
  const handleSave = async () => {
    if (!selectedClient) {
      toast.error('יש לבחור לקוח');
      return;
    }

    if (!previewHtml || !previewVariables) {
      toast.error('יש לצפות בתצוגה מקדימה קודם');
      return;
    }

    setIsSaving(true);

    try {
      const { data: letterId, error } = await SimulatorService.saveGeneratedLetter(
        selectedClient.id,
        selectedBody,
        previewHtml,
        previewVariables
      );

      if (error) throw error;

      setSavedLetterId(letterId);
      toast.success('המכתב נשמר בהצלחה');
    } catch (error) {
      console.error('Save error:', error);
      toast.error('שגיאה בשמירת המכתב');
    } finally {
      setIsSaving(false);
    }
  };

  /**
   * Send letter via email
   */
  const handleSend = async () => {
    if (!savedLetterId) {
      toast.error('יש לשמור את המכתב קודם');
      return;
    }

    setIsSending(true);

    try {
      const { error } = await SimulatorService.sendLetter(savedLetterId);

      if (error) throw error;

      toast.success('המכתב נשלח בהצלחה');
    } catch (error) {
      console.error('Send error:', error);
      toast.error('שגיאה בשליחת המכתב');
    } finally {
      setIsSending(false);
    }
  };

  /**
   * Save current selection as combination
   */
  const handleSaveCombination = async () => {
    if (!combinationName.trim()) {
      toast.error('יש להזין שם לקומבינציה');
      return;
    }

    const selection: ComponentSelection = {
      body: selectedBody,
      payment: selectedPayment,
      amount: saveDefaultAmount ? amount : 0,
    };

    const { data, error } = await SimulatorService.saveCombination(combinationName, selection);

    if (error) {
      console.error('Save combination error:', error);
      toast.error('שגיאה בשמירת הקומבינציה');
      return;
    }

    toast.success('הקומבינציה נשמרה בהצלחה');
    setShowSaveCombinationDialog(false);
    setCombinationName('');
    setSaveDefaultAmount(false);
    loadSavedCombinations();
  };

  /**
   * Delete a saved combination
   */
  const handleDeleteCombination = async (id: string) => {
    const { error } = await SimulatorService.deleteCombination(id);

    if (error) {
      console.error('Delete combination error:', error);
      toast.error('שגיאה במחיקת הקומבינציה');
      return;
    }

    toast.success('הקומבינציה נמחקה');
    setSelectedCombinationId('');
    loadSavedCombinations();
  };

  return (
    <div className="space-y-6" dir="rtl">
      <Card>
        <CardHeader>
          <CardTitle className="text-right">סימולציית מכתבים - הרכבת מכתב מרכיבים</CardTitle>
          <CardDescription className="text-right">
            בחר רכיבים שונים (Header, Body, Payment, Footer) וראה איך המכתב נראה
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Saved Combinations Section */}
          <div className="space-y-3">
            <Label className="text-right block">📌 טען/שמור קומבינציה</Label>
            <div className="grid grid-cols-2 gap-3">
              <Select value={selectedCombinationId} onValueChange={setSelectedCombinationId}>
                <SelectTrigger className="text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {savedCombinations.map((combo) => (
                    <SelectItem key={combo.id} value={combo.id}>
                      {combo.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => setShowSaveCombinationDialog(true)}
                className="w-full"
              >
                <Save className="ml-2 h-4 w-4" />
                שמור קומבינציה זו
              </Button>
            </div>

            {selectedCombinationId && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleDeleteCombination(selectedCombinationId)}
                className="text-red-600 hover:text-red-700"
              >
                <Trash2 className="ml-2 h-4 w-4" />
                מחק קומבינציה זו
              </Button>
            )}
          </div>

          {/* Client Selection */}
          <div className="space-y-2">
            <Label className="text-right block">1️⃣ בחר לקוח</Label>
            <ClientSelector
              value={selectedClient?.id || null}
              onChange={(client) => setSelectedClient(client)}
              label=""

            />
          </div>

          {/* Component Selection */}
          <div className="space-y-3">
            <Label className="text-right block">2️⃣ בחר רכיבי המכתב</Label>

            <div className="grid grid-cols-2 gap-4">
              {/* Body Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-right block">Body (תוכן המכתב) - 11 אופציות</Label>
                <Select value={selectedBody} onValueChange={setSelectedBody}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {BODY_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Payment Selection */}
              <div className="space-y-2">
                <Label className="text-sm text-right block">Payment (אזור תשלום) - 4 אופציות</Label>
                <Select value={selectedPayment} onValueChange={setSelectedPayment}>
                  <SelectTrigger className="text-right">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PAYMENT_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground text-right">
                  {PAYMENT_OPTIONS.find((o) => o.value === selectedPayment)?.description}
                </p>
              </div>
            </div>

            {/* Fixed components info */}
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-right">
                <strong>רכיבים קבועים:</strong> Header (כותרת + לוגו) ו-Footer (פרטי יצירת קשר) נטענים אוטומטית
              </AlertDescription>
            </Alert>
          </div>

          {/* Amount Input */}
          <div className="space-y-2">
            <Label className="text-right block">3️⃣ הזן סכום מקורי</Label>
            <Input
              type="number"
              value={amount}
              onChange={(e) => setAmount(Number(e.target.value))}
              className="text-right"
              dir="rtl"
            />
            <p className="text-sm text-muted-foreground text-right">
              💡 הנחות מחושבות אוטומטית: העברה בנקאית (9%), CC אחד (8%), תשלומים (4%), המחאות (0%)
            </p>
          </div>

          {/* Actions */}
          <div className="space-y-2">
            <Label className="text-right block">4️⃣ פעולות</Label>
            <div className="grid grid-cols-3 gap-3">
              <Button
                onClick={handlePreview}
                disabled={isLoadingPreview || !selectedClient}
                className="w-full"
              >
                {isLoadingPreview ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Eye className="ml-2 h-4 w-4" />
                )}
                תצוגה מקדימה
              </Button>

              <Button
                onClick={handleSave}
                disabled={isSaving || !previewHtml || !selectedClient}
                variant="outline"
                className="w-full"
              >
                {isSaving ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : savedLetterId ? (
                  <CheckCircle2 className="ml-2 h-4 w-4" />
                ) : (
                  <Save className="ml-2 h-4 w-4" />
                )}
                {savedLetterId ? 'נשמר' : 'שמור למסד נתונים'}
              </Button>

              <Button
                onClick={handleSend}
                disabled={isSending || !savedLetterId}
                variant="default"
                className="w-full"
              >
                {isSending ? (
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                ) : (
                  <Mail className="ml-2 h-4 w-4" />
                )}
                שלח
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Preview Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">תצוגה מקדימה - מכתב</DialogTitle>
            <DialogDescription className="text-right">
              מכתב שהורכב מהרכיבים שבחרת
            </DialogDescription>
          </DialogHeader>
          <div
            className="border rounded-lg p-4 bg-white"
            dangerouslySetInnerHTML={{ __html: previewHtml }}
          />
          <DialogFooter>
            <Button onClick={() => setIsPreviewOpen(false)}>סגור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Save Combination Dialog */}
      <Dialog open={showSaveCombinationDialog} onOpenChange={setShowSaveCombinationDialog}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">שמור קומבינציה</DialogTitle>
            <DialogDescription className="text-right">
              שמור את הבחירה הנוכחית (Body + Payment) לשימוש מהיר בעתיד
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-right block">שם הקומבינציה</Label>
              <Input
                value={combinationName}
                onChange={(e) => setCombinationName(e.target.value)}

                className="text-right"
                dir="rtl"
              />
            </div>
            <div className="flex items-center space-x-2 space-x-reverse">
              <input
                type="checkbox"
                id="save-amount"
                checked={saveDefaultAmount}
                onChange={(e) => setSaveDefaultAmount(e.target.checked)}
              />
              <Label htmlFor="save-amount" className="text-right cursor-pointer">
                שמור גם את הסכום כברירת מחדל ({amount.toLocaleString('he-IL')} ₪)
              </Label>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setShowSaveCombinationDialog(false)}>
              ביטול
            </Button>
            <Button onClick={handleSaveCombination}>שמור</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
