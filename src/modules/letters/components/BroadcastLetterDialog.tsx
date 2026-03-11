/**
 * BroadcastLetterDialog - Send a Universal Letter to a distribution list
 * Supports two modes:
 * - General: same content to all, individual SendGrid personalizations for privacy
 * - Personalized: per-client company name in "לכבוד:" header, one call per client
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
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
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Loader2, Send, Users, Mail, AlertCircle, CheckCircle2, XCircle } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import type { DistributionList, RecipientSummary } from '@/modules/broadcast/types/broadcast.types';
import type { CustomHeaderLine, SubjectLine } from '@/modules/letters/types/letter.types';

// Dynamic imports to avoid circular dependency in production build
const getDistributionListService = () =>
  import('@/modules/broadcast/services/distribution-list.service').then(m => m.distributionListService);
const getBroadcastService = () =>
  import('@/modules/broadcast/services/broadcast.service').then(m => m.broadcastService);

interface BroadcastLetterDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  letterContent: string;
  originalBodyContent: string | null;
  hasUserEditedContent: boolean;
  emailSubject: string;
  subjectLines: SubjectLine[];
  customHeaderLines: CustomHeaderLine[];
  includesPayment: boolean;
  amount: number;
  showCommercialName: boolean;
  commercialName: string;
  showAddress: boolean;
  addressLine: string;
  calculateDiscounts: (amount: number) => Record<string, string | number>;
}

type BroadcastMode = 'general' | 'personalized';

interface SendResult {
  total: number;
  sent: number;
  failed: number;
  errors: string[];
}

export function BroadcastLetterDialog({
  open,
  onOpenChange,
  letterContent,
  originalBodyContent,
  hasUserEditedContent,
  emailSubject,
  subjectLines,
  customHeaderLines,
  includesPayment,
  amount,
  showCommercialName,
  commercialName,
  showAddress,
  addressLine,
  calculateDiscounts,
}: BroadcastLetterDialogProps) {
  // List selection
  const [lists, setLists] = useState<(DistributionList & { member_count: number; email_count: number })[]>([]);
  const [isLoadingLists, setIsLoadingLists] = useState(false);
  const [selectedListType, setSelectedListType] = useState<'all' | 'custom'>('all');
  const [selectedListId, setSelectedListId] = useState<string>('');

  // Recipients
  const [recipientSummary, setRecipientSummary] = useState<RecipientSummary | null>(null);
  const [isLoadingRecipients, setIsLoadingRecipients] = useState(false);

  // Broadcast mode
  const [broadcastMode, setBroadcastMode] = useState<BroadcastMode>('general');

  // Sending
  const [isSending, setIsSending] = useState(false);
  const [sendResult, setSendResult] = useState<SendResult | null>(null);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showConfirmation, setShowConfirmation] = useState(false);

  // Load distribution lists when dialog opens
  useEffect(() => {
    if (open) {
      loadLists();
      setSendResult(null);
      setProgress({ current: 0, total: 0 });
    }
  }, [open]);

  // Load recipients when list selection changes
  useEffect(() => {
    if (open && (selectedListType === 'all' || selectedListId)) {
      loadRecipients();
    } else {
      setRecipientSummary(null);
    }
  }, [selectedListType, selectedListId, open, loadRecipients]);

  const loadLists = async () => {
    setIsLoadingLists(true);
    try {
      const svc = await getDistributionListService();
      const { data, error } = await svc.getListsWithCounts();
      if (error) throw error;
      setLists(data || []);
    } catch (error) {
      console.error('Failed to load distribution lists:', error);
      toast.error('שגיאה בטעינת רשימות תפוצה');
    } finally {
      setIsLoadingLists(false);
    }
  };

  const loadRecipients = useCallback(async () => {
    setIsLoadingRecipients(true);
    try {
      const svc = await getBroadcastService();
      const { data, error } = await svc.resolveRecipients(
        selectedListType,
        selectedListType === 'custom' ? selectedListId : undefined
      );
      if (error) throw error;
      setRecipientSummary(data);
    } catch (error) {
      console.error('Failed to resolve recipients:', error);
      toast.error('שגיאה בטעינת נמענים');
    } finally {
      setIsLoadingRecipients(false);
    }
  }, [selectedListType, selectedListId]);

  const getUniqueEmails = useCallback((): string[] => {
    if (!recipientSummary) return [];
    const allEmails = recipientSummary.clients.flatMap(c => c.contacts.map(ct => ct.email));
    return [...new Set(allEmails)];
  }, [recipientSummary]);

  const handleSend = async () => {
    setShowConfirmation(false);

    if (!recipientSummary || recipientSummary.clients.length === 0) {
      toast.error('לא נמצאו נמענים');
      return;
    }

    const { data: { session }, error: sessionError } = await supabase.auth.getSession();
    if (sessionError || !session) {
      toast.error('לא מחובר - אנא התחבר מחדש');
      return;
    }

    const contentForEmail = (originalBodyContent && !hasUserEditedContent)
      ? originalBodyContent
      : letterContent;

    // Build header lines with address if shown
    let headerLinesForEmail = [...customHeaderLines];
    if (showAddress && addressLine) {
      headerLinesForEmail = headerLinesForEmail.filter(line => line.id !== 'address-line-auto');
      headerLinesForEmail.push({
        id: 'address-line-auto',
        type: 'text' as const,
        content: addressLine,
        formatting: { bold: true, color: 'black' as const, underline: false },
        order: headerLinesForEmail.length,
      });
    }

    setIsSending(true);
    setSendResult(null);

    if (broadcastMode === 'general') {
      await sendGeneral(contentForEmail, headerLinesForEmail, session.access_token);
    } else {
      await sendPersonalized(contentForEmail, headerLinesForEmail, session.access_token);
    }

    setIsSending(false);
  };

  const sendGeneral = async (
    content: string,
    headerLines: CustomHeaderLine[],
    accessToken: string
  ) => {
    const uniqueEmails = getUniqueEmails();
    setProgress({ current: 0, total: uniqueEmails.length });

    try {
      const variables: Record<string, string | number> = {
        company_name: '',
        commercial_name: showCommercialName ? commercialName : '',
        recipientMode: 'broadcast',
        subject: emailSubject,
      };

      if (includesPayment) {
        Object.assign(variables, calculateDiscounts(amount));
      }

      const { error } = await supabase.functions.invoke('send-letter', {
        body: {
          recipientEmails: uniqueEmails,
          recipientName: '',
          customText: content,
          variables,
          includesPayment,
          customHeaderLines: headerLines,
          subjectLines,
          isHtml: true,
          broadcastMode: true,
          clientId: null,
        },
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      });

      if (error) throw error;

      setProgress({ current: uniqueEmails.length, total: uniqueEmails.length });
      setSendResult({ total: uniqueEmails.length, sent: uniqueEmails.length, failed: 0, errors: [] });
      toast.success(`הופץ בהצלחה ל-${uniqueEmails.length} נמענים`);
    } catch (error) {
      console.error('Broadcast send error:', error);
      setSendResult({ total: uniqueEmails.length, sent: 0, failed: uniqueEmails.length, errors: [String(error)] });
      toast.error('שגיאה בהפצה');
    }
  };

  const sendPersonalized = async (
    content: string,
    headerLines: CustomHeaderLine[],
    accessToken: string
  ) => {
    if (!recipientSummary) return;

    const clients = recipientSummary.clients.filter(c => c.contacts.length > 0);
    setProgress({ current: 0, total: clients.length });

    let sent = 0;
    let failed = 0;
    let skipped = 0;
    const errors: string[] = [];
    const sentEmails = new Set<string>(); // Track sent emails to avoid duplicates

    for (const client of clients) {
      // Deduplicate: skip emails already sent to another client
      const clientEmails = client.contacts
        .map(c => c.email)
        .filter(email => !sentEmails.has(email));

      if (clientEmails.length === 0) {
        // All emails for this client were already sent to other clients
        skipped++;
        setProgress(prev => ({ ...prev, current: prev.current + 1 }));
        continue;
      }
      const clientName = client.company_name_hebrew || client.company_name;

      try {
        const variables: Record<string, string | number> = {
          company_name: clientName,
          commercial_name: showCommercialName ? commercialName : '',
          recipientMode: 'broadcast-personalized',
          subject: emailSubject,
        };

        if (includesPayment) {
          Object.assign(variables, calculateDiscounts(amount));
        }

        const { error } = await supabase.functions.invoke('send-letter', {
          body: {
            recipientEmails: clientEmails,
            recipientName: clientName,
            customText: content,
            variables,
            includesPayment,
            customHeaderLines: headerLines,
            subjectLines,
            isHtml: true,
            clientId: client.client_id,
          },
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        if (error) throw error;
        sent++;
        // Mark these emails as sent to avoid duplicates for next clients
        clientEmails.forEach(email => sentEmails.add(email));
      } catch (error) {
        failed++;
        errors.push(`${clientName}: ${error instanceof Error ? error.message : String(error)}`);
        console.error(`Failed to send to ${clientName}:`, error);
      }

      setProgress(prev => ({ ...prev, current: prev.current + 1 }));
    }

    setSendResult({
      total: clients.length,
      sent,
      failed,
      errors: skipped > 0
        ? [`${skipped} לקוחות דולגו (מיילים כפולים)`, ...errors]
        : errors,
    });

    if (failed === 0) {
      toast.success(`הופץ בהצלחה ל-${sent} לקוחות`);
    } else if (sent > 0) {
      toast.warning(`הופץ ל-${sent} לקוחות, ${failed} נכשלו`);
    } else {
      toast.error('כל השליחות נכשלו');
    }
  };

  const totalEmails = broadcastMode === 'general'
    ? getUniqueEmails().length
    : recipientSummary?.total_emails ?? 0;

  const progressPercent = progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const canSend = !isSending
    && recipientSummary
    && recipientSummary.clients.length > 0
    && emailSubject.trim()
    && letterContent.trim()
    && !sendResult;

  return (
    <>
      <Dialog open={open} onOpenChange={isSending ? undefined : onOpenChange}>
        <DialogContent dir="rtl" className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-right flex items-center gap-2 rtl:flex-row-reverse">
              <Users className="h-5 w-5 text-orange-600" />
              הפצה לרשימת תפוצה
            </DialogTitle>
            <DialogDescription className="text-right">
              שליחת המכתב לכל הנמענים ברשימה
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-5 py-2">
            {/* List Selection */}
            <div className="space-y-2">
              <Label className="text-right block font-medium">רשימת תפוצה</Label>
              <Select
                value={selectedListType === 'all' ? 'all' : selectedListId}
                onValueChange={(val) => {
                  if (val === 'all') {
                    setSelectedListType('all');
                    setSelectedListId('');
                  } else {
                    setSelectedListType('custom');
                    setSelectedListId(val);
                  }
                  setSendResult(null);
                }}
                disabled={isSending}
              >
                <SelectTrigger dir="rtl">
                  <SelectValue placeholder="בחר רשימה" />
                </SelectTrigger>
                <SelectContent dir="rtl">
                  <SelectItem value="all">כל הלקוחות (receives_letters=true)</SelectItem>
                  {isLoadingLists ? (
                    <SelectItem value="_loading" disabled>טוען...</SelectItem>
                  ) : (
                    lists.map((list) => (
                      <SelectItem key={list.id} value={list.id}>
                        {list.name} ({list.member_count} לקוחות · {list.email_count} מיילים)
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>

            {/* Broadcast Mode Toggle */}
            <div className="space-y-2">
              <Label className="text-right block font-medium">סוג הפצה</Label>
              <RadioGroup
                value={broadcastMode}
                onValueChange={(val) => {
                  setBroadcastMode(val as BroadcastMode);
                  setSendResult(null);
                }}
                className="flex gap-4 rtl:flex-row-reverse"
                disabled={isSending}
                dir="rtl"
              >
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="general" id="broadcast-general" />
                  <Label htmlFor="broadcast-general" className="cursor-pointer text-sm">
                    כללי - אותו תוכן לכולם
                  </Label>
                </div>
                <div className="flex items-center gap-2">
                  <RadioGroupItem value="personalized" id="broadcast-personalized" />
                  <Label htmlFor="broadcast-personalized" className="cursor-pointer text-sm">
                    אישי - עם שם הלקוח ב&quot;לכבוד&quot;
                  </Label>
                </div>
              </RadioGroup>
            </div>

            {/* Recipient Summary */}
            {isLoadingRecipients ? (
              <div className="flex items-center justify-center gap-2 py-4 text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm">טוען נמענים...</span>
              </div>
            ) : recipientSummary ? (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-blue-800 rtl:flex-row-reverse">
                  <Mail className="h-4 w-4" />
                  <span className="text-sm font-medium">
                    {recipientSummary.total_clients} לקוחות · {totalEmails} מיילים
                    {broadcastMode === 'general' && recipientSummary.total_emails !== totalEmails && (
                      <span className="text-xs text-blue-600 mr-1">
                        (אחרי dedup מ-{recipientSummary.total_emails})
                      </span>
                    )}
                  </span>
                </div>
                {broadcastMode === 'personalized' && (
                  <p className="text-xs text-blue-600 mt-1 text-right">
                    כל לקוח יקבל מכתב עם השם שלו בכותרת
                  </p>
                )}
              </div>
            ) : null}

            {/* Subject Preview */}
            <div className="space-y-1">
              <Label className="text-right block text-sm text-muted-foreground">נושא המייל</Label>
              <div className="text-sm bg-gray-50 rounded px-3 py-2 text-right border">
                {emailSubject || <span className="text-muted-foreground">לא הוזן נושא</span>}
              </div>
            </div>

            {/* Progress */}
            {isSending && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm text-muted-foreground rtl:flex-row-reverse">
                  <span>שולח...</span>
                  <span>{progress.current}/{progress.total}</span>
                </div>
                <Progress value={progressPercent} className="h-2" />
              </div>
            )}

            {/* Result */}
            {sendResult && (
              <div className={`rounded-lg p-3 ${sendResult.failed === 0 ? 'bg-green-50 border border-green-200' : 'bg-amber-50 border border-amber-200'}`}>
                <div className="flex items-center gap-2 rtl:flex-row-reverse">
                  {sendResult.failed === 0 ? (
                    <CheckCircle2 className="h-5 w-5 text-green-600" />
                  ) : (
                    <AlertCircle className="h-5 w-5 text-amber-600" />
                  )}
                  <span className="font-medium text-sm">
                    {sendResult.failed === 0
                      ? `הופץ בהצלחה ל-${sendResult.sent} ${broadcastMode === 'general' ? 'נמענים' : 'לקוחות'}`
                      : `${sendResult.sent} הצליחו, ${sendResult.failed} נכשלו`
                    }
                  </span>
                </div>
                {sendResult.errors.length > 0 && (
                  <div className="mt-2 max-h-24 overflow-y-auto">
                    {sendResult.errors.map((err, i) => (
                      <div key={i} className="text-xs text-red-600 flex items-start gap-1 rtl:flex-row-reverse">
                        <XCircle className="h-3 w-3 mt-0.5 shrink-0" />
                        <span>{err}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <DialogFooter className="flex gap-2 rtl:flex-row-reverse">
            {sendResult ? (
              <Button onClick={() => onOpenChange(false)}>סגור</Button>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={() => onOpenChange(false)}
                  disabled={isSending}
                >
                  ביטול
                </Button>
                <Button
                  onClick={() => setShowConfirmation(true)}
                  disabled={!canSend}
                  className="bg-orange-600 hover:bg-orange-700"
                >
                  {isSending ? (
                    <>
                      <Loader2 className="h-4 w-4 rtl:ml-2 ltr:mr-2 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4 rtl:ml-2 ltr:mr-2" />
                      הפצה ({totalEmails} מיילים)
                    </>
                  )}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Confirmation Dialog */}
      <AlertDialog open={showConfirmation} onOpenChange={setShowConfirmation}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">אישור הפצה</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              {broadcastMode === 'general'
                ? `המכתב יישלח ל-${totalEmails} נמענים. אותו תוכן לכולם.`
                : `המכתב יישלח ל-${recipientSummary?.total_clients || 0} לקוחות (${totalEmails} מיילים). כל לקוח יקבל מכתב עם השם שלו.`
              }
              <br />
              <strong>פעולה זו אינה ניתנת לביטול.</strong>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex gap-2 rtl:flex-row-reverse">
            <AlertDialogCancel>ביטול</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleSend}
              className="bg-orange-600 hover:bg-orange-700"
            >
              שלח עכשיו
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
