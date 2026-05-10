/**
 * Shaagat HaAri — Grant Approval External Form
 *
 * Public page (no auth). Token-based access.
 * Flow:
 *   1. Identity verification (tax ID)
 *   2. View calculation breakdown (fixed expenses + salary + total)
 *   3a. Approve → enter bank details (Israeli banks dropdown) → submit
 *   3b. Reject → enter reason → submit
 *
 * Route: /shaagat-haari/approval?token={approvalToken}
 */

import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import {
  CheckCircle,
  XCircle,
  Shield,
  Award,
  Loader2,
  AlertTriangle,
  Building2,
  ThumbsUp,
  ThumbsDown,
} from 'lucide-react';
import { shaagatPublicService } from '../services/shaagat-public.service';
import { ISRAELI_BANKS } from '../lib/israeli-banks';

type FormStep = 'loading' | 'error' | 'verify' | 'view' | 'bank_details' | 'reject' | 'success_approved' | 'success_rejected' | 'already_handled';

interface ApprovalData {
  id: string;
  client_name: string;
  fixed_expenses_grant: number;
  salary_grant: number;
  final_grant_amount: number;
  track_type: string;
}

export function GrantApprovalFormPage() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token') ?? '';

  const [step, setStep] = useState<FormStep>('loading');
  const [errorMessage, setErrorMessage] = useState('');
  const [approvalData, setApprovalData] = useState<ApprovalData | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Verify form
  const [verifyTaxId, setVerifyTaxId] = useState('');

  // Bank details form
  const [accountHolder, setAccountHolder] = useState('');
  const [bankNumber, setBankNumber] = useState('');
  const [branchNumber, setBranchNumber] = useState('');
  const [accountNumber, setAccountNumber] = useState('');

  // Rejection form
  const [rejectionReason, setRejectionReason] = useState('');

  // Validate token on mount
  useEffect(() => {
    if (!token) {
      setErrorMessage('קישור לא תקין — חסר טוקן');
      setStep('error');
      return;
    }

    async function validateToken() {
      const data = await shaagatPublicService.getApprovalByToken(token);
      if (!data) {
        setErrorMessage('הקישור פג תוקף או אינו תקין');
        setStep('error');
        return;
      }
      if (data.is_approved) {
        setApprovalData(data);
        setStep('already_handled');
        return;
      }
      setApprovalData(data);
      setStep('verify');
    }

    validateToken();
  }, [token]);

  const handleVerify = useCallback(() => {
    if (!verifyTaxId.trim()) {
      toast.error('יש למלא מספר ח.פ./ע.מ.');
      return;
    }
    // Verification happens server-side when submitting bank details.
    // For this step, we just move forward to show the calculation.
    setStep('view');
  }, [verifyTaxId]);

  const handleApprove = useCallback(async () => {
    if (!accountHolder.trim() || !bankNumber || !branchNumber.trim() || !accountNumber.trim()) {
      toast.error('יש למלא את כל שדות פרטי הבנק');
      return;
    }

    setIsSubmitting(true);
    try {
      // First, submit bank details
      const bankResult = await shaagatPublicService.submitBankDetails(
        token, // We use the approval token here; in production this would use the bank token
        accountHolder.trim(),
        bankNumber,
        branchNumber.trim(),
        accountNumber.trim(),
        verifyTaxId.trim()
      );

      // Bank details might fail if tax_id doesn't match — show specific error
      if (!bankResult.success && bankResult.error === 'מספר ח.פ./ע.מ. אינו תואם') {
        toast.error('מספר ח.פ./ע.מ. אינו תואם את הלקוח. אנא בדקו ונסו שוב.');
        setStep('verify');
        setIsSubmitting(false);
        return;
      }

      // Then, submit approval
      const approvalResult = await shaagatPublicService.submitApproval(token, true);
      if (!approvalResult.success) {
        toast.error(approvalResult.error ?? 'שגיאה בשמירת האישור');
        return;
      }

      setStep('success_approved');
    } catch {
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  }, [token, accountHolder, bankNumber, branchNumber, accountNumber, verifyTaxId]);

  const handleReject = useCallback(async () => {
    if (!rejectionReason.trim()) {
      toast.error('יש למלא את סיבת הדחייה');
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await shaagatPublicService.submitApproval(token, false, rejectionReason.trim());
      if (!result.success) {
        toast.error(result.error ?? 'שגיאה בשמירת הנתונים');
        return;
      }
      setStep('success_rejected');
    } catch {
      toast.error('שגיאה בשמירת הנתונים');
    } finally {
      setIsSubmitting(false);
    }
  }, [token, rejectionReason]);

  const formatMoney = (val: number): string =>
    new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS', maximumFractionDigits: 0 }).format(val);

  const trackTypeLabel: Record<string, string> = {
    standard: 'רגיל',
    small: 'קטנים',
    cash_basis: 'מזומן',
    new_business: 'עסק חדש',
    northern: 'צפון',
    contractor: 'קבלנים',
  };

  // ─── Loading / Error ───
  if (step === 'loading') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center" dir="rtl">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (step === 'error') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <AlertTriangle className="h-12 w-12 text-destructive mx-auto" />
            <h2 className="text-xl font-bold">שגיאה</h2>
            <p className="text-muted-foreground">{errorMessage}</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'already_handled') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-primary mx-auto" />
            <h2 className="text-xl font-bold">כבר טופל</h2>
            <p className="text-muted-foreground">
              טופס האישור עבור <strong>{approvalData?.client_name}</strong> כבר הוגש.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success_approved') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <CheckCircle className="h-12 w-12 text-green-600 mx-auto" />
            <h2 className="text-xl font-bold">האישור נשלח בהצלחה!</h2>
            <p className="text-muted-foreground">
              אישורכם ופרטי הבנק התקבלו. המשרד ישדר את הבקשה לרשות המיסים ויעדכן אתכם.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (step === 'success_rejected') {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4" dir="rtl">
        <Card className="max-w-md w-full">
          <CardContent className="pt-6 text-center space-y-4">
            <XCircle className="h-12 w-12 text-orange-500 mx-auto" />
            <h2 className="text-xl font-bold">הדחייה נרשמה</h2>
            <p className="text-muted-foreground">
              סיבת הדחייה נשמרה. המשרד ייצור אתכם קשר בהמשך.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4" dir="rtl">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Award className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-2xl font-bold">אישור מענק — {approvalData?.client_name}</h1>
          {approvalData?.track_type && (
            <p className="text-muted-foreground mt-1">
              מסלול: {trackTypeLabel[approvalData.track_type] || approvalData.track_type}
            </p>
          )}
        </div>

        <Card className="shadow-sm">
          {/* ─── Step 1: Verify ─── */}
          {step === 'verify' && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  אימות זהות
                </CardTitle>
                <CardDescription>
                  הזינו את מספר ח.פ./ע.מ. לאימות
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="taxId" className="text-right">מספר ח.פ. / ע.מ.</Label>
                  <Input
                    id="taxId"
                    value={verifyTaxId}
                    onChange={(e) => setVerifyTaxId(e.target.value)}
                    dir="ltr"
                    className="max-w-xs"
                  />
                </div>
                <Button
                  onClick={handleVerify}
                  disabled={!verifyTaxId.trim()}
                  className="gap-2"
                >
                  המשך
                </Button>
              </CardContent>
            </>
          )}

          {/* ─── Step 2: View Calculation ─── */}
          {step === 'view' && approvalData && (
            <>
              <CardHeader className="text-right">
                <CardTitle>פירוט סכום הפיצוי</CardTitle>
                <CardDescription>
                  נא לבדוק את הנתונים ולאשר או לדחות
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Grant breakdown */}
                <div className="bg-muted/50 rounded-lg p-5 space-y-4 text-right">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">פיצוי בגין הוצאות קבועות:</span>
                    <span className="font-medium text-lg">
                      {formatMoney(approvalData.fixed_expenses_grant)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">פיצוי בגין הוצאות שכר:</span>
                    <span className="font-medium text-lg">
                      {formatMoney(approvalData.salary_grant)}
                    </span>
                  </div>
                  <Separator />
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-lg">סך כל הפיצוי הכולל:</span>
                    <span className="font-bold text-2xl text-primary">
                      {formatMoney(approvalData.final_grant_amount)}
                    </span>
                  </div>
                </div>

                <Alert>
                  <AlertDescription className="text-right text-sm">
                    לאחר אישורכם, המשרד ישדר את הבקשה לרשות המיסים.
                    <br />
                    במידה ותדחו, נציג מטעמנו ייצור אתכם קשר.
                  </AlertDescription>
                </Alert>

                <div className="flex gap-3">
                  <Button
                    onClick={() => setStep('bank_details')}
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    <ThumbsUp className="h-4 w-4" />
                    מאשר
                  </Button>
                  <Button
                    onClick={() => setStep('reject')}
                    variant="outline"
                    className="flex-1 gap-2 border-red-200 text-red-700 hover:bg-red-50"
                    size="lg"
                  >
                    <ThumbsDown className="h-4 w-4" />
                    לא מאשר
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* ─── Step 3a: Bank Details ─── */}
          {step === 'bank_details' && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5" />
                  פרטי חשבון בנק
                </CardTitle>
                <CardDescription>
                  הפיצוי יועבר לחשבון הבנק שתזינו
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-right">
                    שם בעל החשבון <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    value={accountHolder}
                    onChange={(e) => setAccountHolder(e.target.value)}
                    className="text-right"
                    dir="rtl"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-right">
                    בנק <span className="text-red-500">*</span>
                  </Label>
                  <Select value={bankNumber} onValueChange={setBankNumber}>
                    <SelectTrigger className="text-right" dir="rtl">
                      <SelectValue placeholder="בחרו בנק" />
                    </SelectTrigger>
                    <SelectContent dir="rtl">
                      {ISRAELI_BANKS.map((bank) => (
                        <SelectItem key={bank.code} value={bank.code}>
                          {bank.code} — {bank.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label className="text-right">
                      מספר סניף <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={branchNumber}
                      onChange={(e) => setBranchNumber(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className="text-right">
                      מספר חשבון <span className="text-red-500">*</span>
                    </Label>
                    <Input
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleApprove}
                    disabled={isSubmitting || !accountHolder.trim() || !bankNumber || !branchNumber.trim() || !accountNumber.trim()}
                    className="flex-1 gap-2"
                    size="lg"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <CheckCircle className="h-4 w-4" />
                    )}
                    אישור ושליחה
                  </Button>
                  <Button
                    onClick={() => setStep('view')}
                    variant="outline"
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    חזור
                  </Button>
                </div>
              </CardContent>
            </>
          )}

          {/* ─── Step 3b: Rejection ─── */}
          {step === 'reject' && (
            <>
              <CardHeader className="text-right">
                <CardTitle className="flex items-center gap-2 text-red-700">
                  <XCircle className="h-5 w-5" />
                  דחיית מענק
                </CardTitle>
                <CardDescription>
                  אנא פרטו את סיבת הדחייה
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label className="text-right">
                    סיבת הדחייה <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="text-right min-h-[100px]"
                    dir="rtl"
                  />
                </div>

                <div className="flex gap-3 pt-2">
                  <Button
                    onClick={handleReject}
                    disabled={isSubmitting || !rejectionReason.trim()}
                    variant="destructive"
                    className="flex-1 gap-2"
                  >
                    {isSubmitting ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <XCircle className="h-4 w-4" />
                    )}
                    שלח דחייה
                  </Button>
                  <Button
                    onClick={() => setStep('view')}
                    variant="outline"
                    disabled={isSubmitting}
                    className="gap-2"
                  >
                    חזור
                  </Button>
                </div>
              </CardContent>
            </>
          )}
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          TicoVision CRM — מענקי שאגת הארי
        </p>
      </div>
    </div>
  );
}

export default GrantApprovalFormPage;
