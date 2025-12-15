import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Mail, Copy, Share2, Loader2, Check, ArrowRight, Plus, X, FileText, Code } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import TenantContactService from '@/services/tenant-contact.service';

interface SharePdfDialogProps {
  open: boolean;
  onClose: () => void;
  pdfUrl: string;
  pdfName: string;
  clientName: string;
  clientId?: string;
  // New props for HTML email support
  htmlContent?: string;           // HTML content to send in email body
  letterId?: string;              // ID of the letter in generated_letters
  defaultSubject?: string;        // Default email subject
  onEmailSent?: () => void;       // Callback after email is sent
}

export function SharePdfDialog({
  open,
  onClose,
  pdfUrl,
  pdfName,
  clientName,
  clientId,
  htmlContent,
  letterId,
  defaultSubject,
  onEmailSent,
}: SharePdfDialogProps) {
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  // Email type selection (PDF attachment or HTML in body)
  const [emailType, setEmailType] = useState<'pdf' | 'html'>('pdf');
  // Email subject (editable)
  const [emailSubject, setEmailSubject] = useState('');

  // Client emails from contact system
  const [clientEmails, setClientEmails] = useState<string[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  // Additional email inputs
  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [showAddEmail, setShowAddEmail] = useState(false);

  // Check if Web Share API is available
  const canShare = typeof navigator !== 'undefined' && !!navigator.share;

  // Load client emails when dialog opens
  useEffect(() => {
    if (open && clientId) {
      loadClientEmails();
    }
    // Set default subject when dialog opens
    if (open && defaultSubject && !emailSubject) {
      setEmailSubject(defaultSubject);
    }
    // Reset state when dialog closes
    if (!open) {
      setShowEmailInput(false);
      setSelectedEmails(new Set());
      setAdditionalEmails([]);
      setShowAddEmail(false);
      setEmailType('pdf');
      setEmailSubject('');
    }
  }, [open, clientId, defaultSubject]);

  const loadClientEmails = async () => {
    if (!clientId) return;
    setLoadingEmails(true);
    try {
      const emails = await TenantContactService.getClientEmails(clientId, 'all');
      setClientEmails(emails);
      // Pre-select all emails by default
      setSelectedEmails(new Set(emails));
    } catch (error) {
      console.error('Error loading client emails:', error);
      setClientEmails([]);
    } finally {
      setLoadingEmails(false);
    }
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = pdfName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success('הקובץ הורד בהצלחה!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('שגיאה בהורדת הקובץ');
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(pdfUrl);
      setCopied(true);
      toast.success('הלינק הועתק ללוח!');
      setTimeout(() => setCopied(false), 2000);
    } catch (error) {
      console.error('Copy error:', error);
      toast.error('שגיאה בהעתקת הלינק');
    }
  };

  const handleShare = async () => {
    if (!canShare) return;

    try {
      await navigator.share({
        title: `מסמך - ${clientName}`,
        text: `מסמך עובדים זרים עבור ${clientName}`,
        url: pdfUrl,
      });
    } catch (error) {
      // User cancelled or error
      if ((error as Error).name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error('שגיאה בשיתוף');
      }
    }
  };

  const toggleEmailSelection = (email: string) => {
    setSelectedEmails(prev => {
      const newSet = new Set(prev);
      if (newSet.has(email)) {
        newSet.delete(email);
      } else {
        newSet.add(email);
      }
      return newSet;
    });
  };

  const addAdditionalEmail = () => {
    setAdditionalEmails(prev => [...prev, '']);
    setShowAddEmail(true);
  };

  const updateAdditionalEmail = (index: number, value: string) => {
    setAdditionalEmails(prev => {
      const updated = [...prev];
      updated[index] = value;
      return updated;
    });
  };

  const removeAdditionalEmail = (index: number) => {
    setAdditionalEmails(prev => prev.filter((_, i) => i !== index));
  };

  const isValidEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSendEmail = async () => {
    // Collect all selected and valid additional emails
    const allEmails = [
      ...Array.from(selectedEmails),
      ...additionalEmails.filter(e => e.trim() && isValidEmail(e.trim())),
    ];

    if (allEmails.length === 0) {
      toast.error('נא לבחור לפחות כתובת מייל אחת');
      return;
    }

    const subject = emailSubject || defaultSubject || `מסמך - ${clientName}`;

    setSending(true);
    let successCount = 0;
    let errorCount = 0;

    try {
      // Check if we're sending HTML
      if (emailType === 'html' && htmlContent) {
        // Send HTML via send-letter Edge Function
        const session = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke('send-letter', {
          body: {
            recipientEmails: allEmails,
            customText: htmlContent,
            isHtml: true,
            clientId,
            letterId,
            subject,
          },
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to send email');

        successCount = allEmails.length;
      } else {
        // Send PDF attachment via send-pdf-email Edge Function
        for (const email of allEmails) {
          try {
            const { data, error } = await supabase.functions.invoke('send-pdf-email', {
              body: {
                to: email,
                subject,
                pdfUrl,
                pdfName,
              },
            });

            if (error) throw error;
            if (!data?.success) throw new Error(data?.error || 'Failed to send email');
            successCount++;
          } catch (err) {
            console.error(`Error sending to ${email}:`, err);
            errorCount++;
          }
        }
      }

      if (successCount > 0 && errorCount === 0) {
        toast.success(`המייל נשלח בהצלחה ל-${successCount} נמענים!`);
        setShowEmailInput(false);
        setSelectedEmails(new Set());
        setAdditionalEmails([]);
        setShowAddEmail(false);
        setEmailType('pdf');
        setEmailSubject('');
        onEmailSent?.();
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`נשלח ל-${successCount} נמענים, נכשל עבור ${errorCount}`);
      } else {
        toast.error('שגיאה בשליחת המייל');
      }
    } catch (error) {
      console.error('Send email error:', error);
      toast.error('שגיאה בשליחת המייל');
    } finally {
      setSending(false);
    }
  };

  // Legacy single email send (fallback when no clientId)
  const [legacyEmail, setLegacyEmail] = useState('');

  const handleLegacySendEmail = async () => {
    if (!legacyEmail || !legacyEmail.includes('@')) {
      toast.error('נא להזין כתובת מייל תקינה');
      return;
    }

    const subject = emailSubject || defaultSubject || `מסמך - ${clientName}`;

    setSending(true);
    try {
      if (emailType === 'html' && htmlContent) {
        // Send HTML via send-letter Edge Function
        const session = await supabase.auth.getSession();

        const { data, error } = await supabase.functions.invoke('send-letter', {
          body: {
            recipientEmails: [legacyEmail],
            customText: htmlContent,
            isHtml: true,
            clientId,
            letterId,
            subject,
          },
          headers: {
            Authorization: `Bearer ${session.data.session?.access_token}`,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to send email');
      } else {
        // Send PDF attachment
        const { data, error } = await supabase.functions.invoke('send-pdf-email', {
          body: {
            to: legacyEmail,
            subject,
            pdfUrl,
            pdfName,
          },
        });

        if (error) throw error;
        if (!data?.success) throw new Error(data?.error || 'Failed to send email');
      }

      toast.success('המייל נשלח בהצלחה!');
      setShowEmailInput(false);
      setLegacyEmail('');
      setEmailType('pdf');
      setEmailSubject('');
      onEmailSent?.();
    } catch (error) {
      console.error('Send email error:', error);
      toast.error('שגיאה בשליחת המייל');
    } finally {
      setSending(false);
    }
  };

  const handleClose = () => {
    setShowEmailInput(false);
    setLegacyEmail('');
    setSelectedEmails(new Set());
    setAdditionalEmails([]);
    setShowAddEmail(false);
    setEmailType('pdf');
    setEmailSubject('');
    onClose();
  };

  const totalSelectedCount = selectedEmails.size + additionalEmails.filter(e => e.trim() && isValidEmail(e.trim())).length;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-md" dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-right text-xl">
            <Check className="inline-block ml-2 h-5 w-5 text-green-600" />
            המסמך מוכן!
          </DialogTitle>
          <DialogDescription className="text-right">
            {clientName} - {pdfName}
          </DialogDescription>
        </DialogHeader>

        {!showEmailInput ? (
          <div className="grid grid-cols-2 gap-3 mt-4">
            {/* Download */}
            <Button
              onClick={handleDownload}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Download className="h-6 w-6" />
              <span>הורד למחשב</span>
            </Button>

            {/* Email */}
            <Button
              onClick={() => setShowEmailInput(true)}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              <Mail className="h-6 w-6" />
              <span>שלח למייל</span>
            </Button>

            {/* Copy Link */}
            <Button
              onClick={handleCopyLink}
              variant="outline"
              className="h-20 flex flex-col items-center justify-center gap-2"
            >
              {copied ? (
                <Check className="h-6 w-6 text-green-600" />
              ) : (
                <Copy className="h-6 w-6" />
              )}
              <span>{copied ? 'הועתק!' : 'העתק לינק'}</span>
            </Button>

            {/* Share (if available) */}
            {canShare && (
              <Button
                onClick={handleShare}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2"
              >
                <Share2 className="h-6 w-6" />
                <span>שתף</span>
              </Button>
            )}
          </div>
        ) : clientId && clientEmails.length > 0 ? (
          // New UI with email selection from client contacts
          <div className="space-y-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmailInput(false)}
              className="mb-2"
            >
              <ArrowRight className="ml-1 h-4 w-4" />
              חזור
            </Button>

            {loadingEmails ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
                <span className="mr-2">טוען כתובות מייל...</span>
              </div>
            ) : (
              <>
                {/* Email type selection - only show if htmlContent is available */}
                {htmlContent && (
                  <div className="space-y-2 border-b pb-3">
                    <Label className="text-right block font-medium">סוג שליחה:</Label>
                    <RadioGroup
                      value={emailType}
                      onValueChange={(v) => setEmailType(v as 'pdf' | 'html')}
                      className="flex gap-4"
                    >
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="pdf" id="email-pdf" />
                        <Label htmlFor="email-pdf" className="cursor-pointer flex items-center gap-1">
                          <FileText className="h-4 w-4" />
                          PDF כצרופה
                        </Label>
                      </div>
                      <div className="flex items-center gap-2">
                        <RadioGroupItem value="html" id="email-html" />
                        <Label htmlFor="email-html" className="cursor-pointer flex items-center gap-1">
                          <Code className="h-4 w-4" />
                          HTML בגוף המייל
                        </Label>
                      </div>
                    </RadioGroup>
                  </div>
                )}

                {/* Email subject */}
                <div className="space-y-2">
                  <Label htmlFor="email-subject" className="text-right block font-medium">נושא המייל:</Label>
                  <Input
                    id="email-subject"
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    placeholder={defaultSubject || `מסמך - ${clientName}`}
                    className="text-right"
                    disabled={sending}
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-right block font-medium">בחר נמענים:</Label>
                  <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {clientEmails.map((email) => (
                      <div key={email} className="flex items-center gap-2">
                        <Checkbox
                          id={`email-${email}`}
                          checked={selectedEmails.has(email)}
                          onCheckedChange={() => toggleEmailSelection(email)}
                        />
                        <label
                          htmlFor={`email-${email}`}
                          className="text-sm cursor-pointer flex-1 text-left"
                          dir="ltr"
                        >
                          {email}
                        </label>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Additional emails section */}
                <div className="space-y-2 border-t pt-3">
                  {additionalEmails.map((email, index) => (
                    <div key={index} className="flex gap-2">
                      <Input
                        type="email"
                        placeholder="example@email.com"
                        value={email}
                        onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                        dir="ltr"
                        className="text-left flex-1"
                        disabled={sending}
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="icon"
                        onClick={() => removeAdditionalEmail(index)}
                        disabled={sending}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}

                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={addAdditionalEmail}
                    className="w-full"
                    disabled={sending}
                  >
                    <Plus className="h-4 w-4 ml-2" />
                    הוסף כתובת נוספת
                  </Button>
                </div>

                <Button
                  onClick={handleSendEmail}
                  disabled={sending || totalSelectedCount === 0}
                  className="w-full"
                >
                  {sending ? (
                    <>
                      <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                      שולח...
                    </>
                  ) : (
                    <>
                      <Mail className="ml-2 h-4 w-4" />
                      שלח מייל ({totalSelectedCount} נמענים)
                    </>
                  )}
                </Button>
              </>
            )}
          </div>
        ) : (
          // Legacy UI - single email input (when no clientId or no emails found)
          <div className="space-y-4 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEmailInput(false)}
              className="mb-2"
            >
              <ArrowRight className="ml-1 h-4 w-4" />
              חזור
            </Button>

            {/* Email type selection - only show if htmlContent is available */}
            {htmlContent && (
              <div className="space-y-2 border-b pb-3">
                <Label className="text-right block font-medium">סוג שליחה:</Label>
                <RadioGroup
                  value={emailType}
                  onValueChange={(v) => setEmailType(v as 'pdf' | 'html')}
                  className="flex gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="pdf" id="legacy-email-pdf" />
                    <Label htmlFor="legacy-email-pdf" className="cursor-pointer flex items-center gap-1">
                      <FileText className="h-4 w-4" />
                      PDF כצרופה
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="html" id="legacy-email-html" />
                    <Label htmlFor="legacy-email-html" className="cursor-pointer flex items-center gap-1">
                      <Code className="h-4 w-4" />
                      HTML בגוף המייל
                    </Label>
                  </div>
                </RadioGroup>
              </div>
            )}

            {/* Email subject */}
            <div className="space-y-2">
              <Label htmlFor="legacy-email-subject" className="text-right block">
                נושא המייל
              </Label>
              <Input
                id="legacy-email-subject"
                type="text"
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                placeholder={defaultSubject || `מסמך - ${clientName}`}
                className="text-right"
                disabled={sending}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-right block">
                כתובת מייל
              </Label>
              <Input
                id="email"
                type="email"
                value={legacyEmail}
                onChange={(e) => setLegacyEmail(e.target.value)}
                placeholder="example@email.com"
                dir="ltr"
                className="text-left"
                disabled={sending}
              />
            </div>

            <Button
              onClick={handleLegacySendEmail}
              disabled={sending || !legacyEmail}
              className="w-full"
            >
              {sending ? (
                <>
                  <Loader2 className="ml-2 h-4 w-4 animate-spin" />
                  שולח...
                </>
              ) : (
                <>
                  <Mail className="ml-2 h-4 w-4" />
                  שלח מייל
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
