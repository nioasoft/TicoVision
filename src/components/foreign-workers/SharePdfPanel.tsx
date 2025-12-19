import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Download, Mail, Copy, Share2, Loader2, Check, ArrowRight, Plus, X, FileText, Code } from 'lucide-react';
import { toast } from 'sonner';
import { supabase } from '@/lib/supabase';
import TenantContactService from '@/services/tenant-contact.service';
import { fileUploadService } from '@/services/file-upload.service';
import type { FileCategory } from '@/types/file-attachment.types';
import { cn } from '@/lib/utils';

interface SharePdfPanelProps {
  show: boolean;
  onHide?: () => void;
  pdfUrl: string;
  pdfName: string;
  clientName: string;
  clientId?: string;
  htmlContent?: string;
  letterId?: string;
  defaultSubject?: string;
  onEmailSent?: () => void;
  defaultEmail?: string;
  defaultEmailType?: 'pdf' | 'html';
  savePdfToFolder?: boolean;
  fileCategory?: string;
}

export function SharePdfPanel({
  show,
  onHide,
  pdfUrl,
  pdfName,
  clientName,
  clientId,
  htmlContent,
  letterId,
  defaultSubject,
  onEmailSent,
  defaultEmail,
  defaultEmailType = 'pdf',
  savePdfToFolder = false,
  fileCategory,
}: SharePdfPanelProps) {
  const [showEmailInput, setShowEmailInput] = useState(false);
  const [sending, setSending] = useState(false);
  const [copied, setCopied] = useState(false);

  const [emailType, setEmailType] = useState<'pdf' | 'html'>('pdf');
  const [emailSubject, setEmailSubject] = useState('');

  const [clientEmails, setClientEmails] = useState<string[]>([]);
  const [loadingEmails, setLoadingEmails] = useState(false);
  const [selectedEmails, setSelectedEmails] = useState<Set<string>>(new Set());

  const [additionalEmails, setAdditionalEmails] = useState<string[]>([]);
  const [showAddEmail, setShowAddEmail] = useState(false);

  const [legacyEmail, setLegacyEmail] = useState('');

  const canShare = typeof navigator !== 'undefined' && !!navigator.share;
  const panelRef = useRef<HTMLDivElement>(null);

  // Scroll to panel when it becomes visible
  useEffect(() => {
    if (show && panelRef.current) {
      setTimeout(() => {
        panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 100); // Small delay to allow animation to start
    }
  }, [show]);

  useEffect(() => {
    if (show && clientId && !defaultEmail) {
      loadClientEmails();
    }
    if (show && defaultSubject && !emailSubject) {
      setEmailSubject(defaultSubject);
    }
    if (show && defaultEmailType) {
      setEmailType(defaultEmailType);
    }
    if (show && defaultEmail && !legacyEmail) {
      setLegacyEmail(defaultEmail);
    }
    if (!show) {
      setShowEmailInput(false);
      setSelectedEmails(new Set());
      setAdditionalEmails([]);
      setShowAddEmail(false);
      setEmailType(defaultEmailType || 'pdf');
      setEmailSubject('');
      setLegacyEmail('');
    }
  }, [show, clientId, defaultSubject, defaultEmailType, defaultEmail]);

  const loadClientEmails = async () => {
    if (!clientId) return;
    setLoadingEmails(true);
    try {
      const emails = await TenantContactService.getClientEmails(clientId, 'all');
      setClientEmails(emails);
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
      if ((error as Error).name !== 'AbortError') {
        console.error('Share error:', error);
        toast.error('שגיאה בשיתוף');
      }
    }
  };

  const savePdfToFileManager = async () => {
    if (!savePdfToFolder || !clientId || !pdfUrl) return;

    try {
      const response = await fetch(pdfUrl);
      if (!response.ok) throw new Error('Failed to fetch PDF');

      const blob = await response.blob();
      const file = new File([blob], pdfName, { type: 'application/pdf' });

      const category: FileCategory = (fileCategory as FileCategory) || 'letters';

      const { error } = await fileUploadService.uploadFileToCategory(
        file,
        clientId,
        category,
        defaultSubject || pdfName.replace('.pdf', '')
      );

      if (error) {
        console.error('Error saving PDF to folder:', error);
      }
    } catch (error) {
      console.error('Error saving PDF to folder:', error);
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
      if (emailType === 'html' && htmlContent) {
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
        await savePdfToFileManager();
        setShowEmailInput(false);
        setSelectedEmails(new Set());
        setAdditionalEmails([]);
        setShowAddEmail(false);
        setEmailType(defaultEmailType || 'pdf');
        setEmailSubject('');
        onEmailSent?.();
      } else if (successCount > 0 && errorCount > 0) {
        toast.warning(`נשלח ל-${successCount} נמענים, נכשל עבור ${errorCount}`);
        await savePdfToFileManager();
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

  const handleLegacySendEmail = async () => {
    if (!legacyEmail || !legacyEmail.includes('@')) {
      toast.error('נא להזין כתובת מייל תקינה');
      return;
    }

    const subject = emailSubject || defaultSubject || `מסמך - ${clientName}`;

    setSending(true);
    try {
      if (emailType === 'html' && htmlContent) {
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
      await savePdfToFileManager();
      setShowEmailInput(false);
      setLegacyEmail('');
      setEmailType(defaultEmailType || 'pdf');
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
    setEmailType(defaultEmailType || 'pdf');
    setEmailSubject('');
    onHide?.();
  };

  const totalSelectedCount = selectedEmails.size + additionalEmails.filter(e => e.trim() && isValidEmail(e.trim())).length;

  if (!show) return null;

  return (
    <div
      ref={panelRef}
      className={cn(
        "overflow-hidden transition-all duration-300 ease-in-out",
        show ? "max-h-[800px] opacity-100 mt-4" : "max-h-0 opacity-0"
      )}
    >
      <Card className="border-green-200 bg-green-50/50" dir="rtl">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Check className="h-5 w-5 text-green-600" />
              <CardTitle className="text-lg text-right">המסמך מוכן!</CardTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={handleClose}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          <CardDescription className="text-right">
            {clientName} - {pdfName}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {!showEmailInput ? (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <Button
                onClick={handleDownload}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white hover:bg-gray-50"
              >
                <Download className="h-6 w-6" />
                <span>הורד למחשב</span>
              </Button>

              <Button
                onClick={() => setShowEmailInput(true)}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white hover:bg-gray-50"
              >
                <Mail className="h-6 w-6" />
                <span>שלח למייל</span>
              </Button>

              <Button
                onClick={handleCopyLink}
                variant="outline"
                className="h-20 flex flex-col items-center justify-center gap-2 bg-white hover:bg-gray-50"
              >
                {copied ? (
                  <Check className="h-6 w-6 text-green-600" />
                ) : (
                  <Copy className="h-6 w-6" />
                )}
                <span>{copied ? 'הועתק!' : 'העתק לינק'}</span>
              </Button>

              {canShare && (
                <Button
                  onClick={handleShare}
                  variant="outline"
                  className="h-20 flex flex-col items-center justify-center gap-2 bg-white hover:bg-gray-50"
                >
                  <Share2 className="h-6 w-6" />
                  <span>שתף</span>
                </Button>
              )}
            </div>
          ) : clientId && clientEmails.length > 0 ? (
            <div className="space-y-4">
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
                  {htmlContent && (
                    <div className="space-y-2 border-b pb-3">
                      <Label className="text-right block font-medium">סוג שליחה:</Label>
                      <RadioGroup
                        value={emailType}
                        onValueChange={(v) => setEmailType(v as 'pdf' | 'html')}
                        className="flex gap-4"
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="pdf" id="panel-email-pdf" />
                          <Label htmlFor="panel-email-pdf" className="cursor-pointer flex items-center gap-1">
                            <FileText className="h-4 w-4" />
                            PDF כצרופה
                          </Label>
                        </div>
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value="html" id="panel-email-html" />
                          <Label htmlFor="panel-email-html" className="cursor-pointer flex items-center gap-1">
                            <Code className="h-4 w-4" />
                            HTML בגוף המייל
                          </Label>
                        </div>
                      </RadioGroup>
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="panel-email-subject" className="text-right block font-medium">נושא המייל:</Label>
                    <Input
                      id="panel-email-subject"
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={defaultSubject || `מסמך - ${clientName}`}
                      className="text-right bg-white"
                      disabled={sending}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-right block font-medium">בחר נמענים:</Label>
                    <div className="space-y-2 max-h-48 overflow-y-auto border rounded-md p-3 bg-white">
                      {clientEmails.map((email) => (
                        <div key={email} className="flex items-center gap-2">
                          <Checkbox
                            id={`panel-email-${email}`}
                            checked={selectedEmails.has(email)}
                            onCheckedChange={() => toggleEmailSelection(email)}
                          />
                          <label
                            htmlFor={`panel-email-${email}`}
                            className="text-sm cursor-pointer flex-1 text-left"
                            dir="ltr"
                          >
                            {email}
                          </label>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-2 border-t pt-3">
                    {additionalEmails.map((email, index) => (
                      <div key={index} className="flex gap-2">
                        <Input
                          type="email"
                          value={email}
                          onChange={(e) => updateAdditionalEmail(index, e.target.value)}
                          dir="ltr"
                          className="text-left flex-1 bg-white"
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
                      className="w-full bg-white"
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
            <div className="space-y-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setShowEmailInput(false)}
                className="mb-2"
              >
                <ArrowRight className="ml-1 h-4 w-4" />
                חזור
              </Button>

              {htmlContent && (
                <div className="space-y-2 border-b pb-3">
                  <Label className="text-right block font-medium">סוג שליחה:</Label>
                  <RadioGroup
                    value={emailType}
                    onValueChange={(v) => setEmailType(v as 'pdf' | 'html')}
                    className="flex gap-4"
                  >
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="pdf" id="panel-legacy-email-pdf" />
                      <Label htmlFor="panel-legacy-email-pdf" className="cursor-pointer flex items-center gap-1">
                        <FileText className="h-4 w-4" />
                        PDF כצרופה
                      </Label>
                    </div>
                    <div className="flex items-center gap-2">
                      <RadioGroupItem value="html" id="panel-legacy-email-html" />
                      <Label htmlFor="panel-legacy-email-html" className="cursor-pointer flex items-center gap-1">
                        <Code className="h-4 w-4" />
                        HTML בגוף המייל
                      </Label>
                    </div>
                  </RadioGroup>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="panel-legacy-email-subject" className="text-right block">
                  נושא המייל
                </Label>
                <Input
                  id="panel-legacy-email-subject"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={defaultSubject || `מסמך - ${clientName}`}
                  className="text-right bg-white"
                  disabled={sending}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="panel-email" className="text-right block">
                  כתובת מייל
                </Label>
                <Input
                  id="panel-email"
                  type="email"
                  value={legacyEmail}
                  onChange={(e) => setLegacyEmail(e.target.value)}
                  dir="ltr"
                  className="text-left bg-white"
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
        </CardContent>
      </Card>
    </div>
  );
}
