/**
 * Tico Tickets - Public Ticket Submission Form
 * פורטל ציבורי להגשת פניות - ללא צורך בהתחברות
 */

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';
import {
  Send,
  ArrowRight,
  ArrowLeft,
  User,
  Mail,
  Phone,
  Building2,
  FileText,
  CheckCircle,
  Ticket,
  ChevronLeft,
  ChevronRight,
  Receipt,
  FileSpreadsheet,
  Shield,
  BarChart3,
  Users,
  BookOpen,
  CreditCard,
  FileCheck,
  Lightbulb,
  Settings,
  HelpCircle,
} from 'lucide-react';
import { ticketPublicService } from '../services/ticket-public.service';
import type { CategoryWithSubcategories, PublicTicketSubmission } from '../types/ticket.types';

// Category icons mapping
const CATEGORY_ICONS: Record<string, React.ElementType> = {
  income_tax: Receipt,
  vat: FileSpreadsheet,
  bituach_leumi: Shield,
  financial_statements: BarChart3,
  payroll: Users,
  company_registry: Building2,
  bookkeeping: BookOpen,
  billing: CreditCard,
  documents: FileCheck,
  consulting: Lightbulb,
  technical: Settings,
  other: HelpCircle,
};

// Category colors
const CATEGORY_COLORS: Record<string, { bg: string; border: string; icon: string }> = {
  income_tax: { bg: 'bg-blue-50', border: 'border-blue-200 hover:border-blue-400', icon: 'text-blue-600' },
  vat: { bg: 'bg-green-50', border: 'border-green-200 hover:border-green-400', icon: 'text-green-600' },
  bituach_leumi: { bg: 'bg-purple-50', border: 'border-purple-200 hover:border-purple-400', icon: 'text-purple-600' },
  financial_statements: { bg: 'bg-indigo-50', border: 'border-indigo-200 hover:border-indigo-400', icon: 'text-indigo-600' },
  payroll: { bg: 'bg-orange-50', border: 'border-orange-200 hover:border-orange-400', icon: 'text-orange-600' },
  company_registry: { bg: 'bg-cyan-50', border: 'border-cyan-200 hover:border-cyan-400', icon: 'text-cyan-600' },
  bookkeeping: { bg: 'bg-yellow-50', border: 'border-yellow-200 hover:border-yellow-400', icon: 'text-yellow-600' },
  billing: { bg: 'bg-rose-50', border: 'border-rose-200 hover:border-rose-400', icon: 'text-rose-600' },
  documents: { bg: 'bg-teal-50', border: 'border-teal-200 hover:border-teal-400', icon: 'text-teal-600' },
  consulting: { bg: 'bg-amber-50', border: 'border-amber-200 hover:border-amber-400', icon: 'text-amber-600' },
  technical: { bg: 'bg-slate-50', border: 'border-slate-200 hover:border-slate-400', icon: 'text-slate-600' },
  other: { bg: 'bg-gray-50', border: 'border-gray-200 hover:border-gray-400', icon: 'text-gray-600' },
};

// Form steps
type FormStep = 'contact' | 'category' | 'details' | 'success';

interface FormData {
  submitter_name: string;
  submitter_email: string;
  submitter_phone: string;
  submitter_company_name: string;
  submitter_tax_id: string;
  category_id: string;
  subcategory_id: string;
  subject: string;
  description: string;
}

const initialFormData: FormData = {
  submitter_name: '',
  submitter_email: '',
  submitter_phone: '',
  submitter_company_name: '',
  submitter_tax_id: '',
  category_id: '',
  subcategory_id: '',
  subject: '',
  description: '',
};

export function PublicTicketForm() {
  const navigate = useNavigate();

  // State
  const [step, setStep] = useState<FormStep>('contact');
  const [formData, setFormData] = useState<FormData>(initialFormData);
  const [categories, setCategories] = useState<CategoryWithSubcategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successData, setSuccessData] = useState<{ ticketNumber: number; trackingUrl: string } | null>(null);

  // Load categories
  useEffect(() => {
    async function loadCategories() {
      const cats = await ticketPublicService.getCategories();
      setCategories(cats);
      setLoading(false);
    }
    loadCategories();
  }, []);

  // Get selected category
  const selectedCategory = categories.find(c => c.id === formData.category_id);

  // Validation
  const isStep1Valid = formData.submitter_name.trim() && formData.submitter_email.trim();
  const isStep2Valid = formData.category_id;
  const isStep3Valid = formData.subject.trim() && formData.description.trim();

  // Handlers
  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (categoryId: string) => {
    setFormData(prev => ({
      ...prev,
      category_id: categoryId,
      subcategory_id: '', // Reset subcategory when main category changes
    }));
  };

  const handleSubcategorySelect = (subcategoryId: string) => {
    setFormData(prev => ({ ...prev, subcategory_id: subcategoryId }));
  };

  const handleNext = () => {
    if (step === 'contact' && isStep1Valid) {
      setStep('category');
    } else if (step === 'category' && isStep2Valid) {
      setStep('details');
    }
  };

  const handleBack = () => {
    if (step === 'category') {
      setStep('contact');
    } else if (step === 'details') {
      setStep('category');
    }
  };

  const handleSubmit = async () => {
    if (!isStep3Valid) return;

    setSubmitting(true);
    try {
      const submission: PublicTicketSubmission = {
        submitter_name: formData.submitter_name.trim(),
        submitter_email: formData.submitter_email.trim(),
        submitter_phone: formData.submitter_phone.trim() || undefined,
        submitter_company_name: formData.submitter_company_name.trim() || undefined,
        submitter_tax_id: formData.submitter_tax_id.trim() || undefined,
        category_id: formData.category_id,
        subcategory_id: formData.subcategory_id || undefined,
        subject: formData.subject.trim(),
        description: formData.description.trim(),
      };

      const result = await ticketPublicService.submit(submission);

      if (result.success && result.ticket_number) {
        setSuccessData({
          ticketNumber: result.ticket_number,
          trackingUrl: result.tracking_url || '',
        });
        setStep('success');
      } else {
        toast.error(result.error || 'שגיאה בשליחת הפנייה');
      }
    } catch (error) {
      console.error('Error submitting ticket:', error);
      toast.error('שגיאה בשליחת הפנייה. אנא נסו שוב.');
    } finally {
      setSubmitting(false);
    }
  };

  // Render step indicator
  const renderStepIndicator = () => {
    const steps = [
      { key: 'contact', label: 'פרטי קשר', icon: User },
      { key: 'category', label: 'נושא', icon: FileText },
      { key: 'details', label: 'פרטים', icon: Send },
    ];

    const currentIndex = steps.findIndex(s => s.key === step);

    return (
      <div className="flex items-center justify-center gap-2 mb-8">
        {steps.map((s, index) => {
          const Icon = s.icon;
          const isActive = s.key === step;
          const isCompleted = index < currentIndex;

          return (
            <div key={s.key} className="flex items-center">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-full border-2 transition-colors ${
                  isActive
                    ? 'bg-primary border-primary text-primary-foreground'
                    : isCompleted
                    ? 'bg-green-500 border-green-500 text-white'
                    : 'bg-muted border-muted-foreground/30 text-muted-foreground'
                }`}
              >
                {isCompleted ? <CheckCircle className="h-5 w-5" /> : <Icon className="h-5 w-5" />}
              </div>
              <span
                className={`mr-2 text-sm font-medium ${
                  isActive ? 'text-foreground' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {index < steps.length - 1 && (
                <ChevronLeft className="h-5 w-5 mx-2 text-muted-foreground/50" />
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Render contact step
  const renderContactStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="text-right flex items-center gap-2">
            
            שם מלא
          </Label>
          <div className="relative">
            <User className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="name"
              value={formData.submitter_name}
              onChange={(e) => handleInputChange('submitter_name', e.target.value)}
              className="pr-10 text-right"
              dir="rtl"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="email" className="text-right flex items-center gap-2">
            
            אימייל
          </Label>
          <div className="relative">
            <Mail className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              value={formData.submitter_email}
              onChange={(e) => handleInputChange('submitter_email', e.target.value)}
              className="pr-10"
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="phone" className="text-right">טלפון</Label>
          <div className="relative">
            <Phone className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="phone"
              value={formData.submitter_phone}
              onChange={(e) => handleInputChange('submitter_phone', e.target.value)}

              className="pr-10"
              dir="ltr"
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label htmlFor="company" className="text-right">שם החברה</Label>
          <div className="relative">
            <Building2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              id="company"
              value={formData.submitter_company_name}
              onChange={(e) => handleInputChange('submitter_company_name', e.target.value)}

              className="pr-10 text-right"
              dir="rtl"
            />
          </div>
        </div>

        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="tax_id" className="text-right">מספר ח.פ. / ע.מ.</Label>
          <Input
            id="tax_id"
            value={formData.submitter_tax_id}
            onChange={(e) => handleInputChange('submitter_tax_id', e.target.value)}
            className="max-w-xs"
            dir="ltr"
          />
          <p className="text-xs text-muted-foreground">
            אם הנכם לקוחות קיימים, הזנת מספר ח.פ. תקשר את הפנייה לתיק שלכם
          </p>
        </div>
      </div>

      <div className="flex justify-start">
        <Button onClick={handleNext} disabled={!isStep1Valid} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          המשך
        </Button>
      </div>
    </div>
  );

  // Render category step
  const renderCategoryStep = () => (
    <div className="space-y-6">
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {categories.map((category) => {
          const Icon = CATEGORY_ICONS[category.name] || HelpCircle;
          const colors = CATEGORY_COLORS[category.name] || CATEGORY_COLORS.other;
          const isSelected = formData.category_id === category.id;

          return (
            <button
              key={category.id}
              onClick={() => handleCategorySelect(category.id)}
              className={`p-4 rounded-lg border-2 text-right transition-all ${colors.bg} ${colors.border} ${
                isSelected ? 'ring-2 ring-primary ring-offset-2' : ''
              }`}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center mb-2 ${colors.icon} bg-white/50`}>
                <Icon className="h-5 w-5" />
              </div>
              <span className="text-sm font-medium">{category.name_hebrew}</span>
            </button>
          );
        })}
      </div>

      {/* Subcategories */}
      {selectedCategory?.subcategories && selectedCategory.subcategories.length > 0 && (
        <div className="space-y-3">
          <Label className="text-right">בחרו תת-נושא</Label>
          <div className="flex flex-wrap gap-2">
            {selectedCategory.subcategories.map((sub) => (
              <Badge
                key={sub.id}
                variant={formData.subcategory_id === sub.id ? 'default' : 'outline'}
                className="cursor-pointer hover:bg-primary/10 px-3 py-1.5"
                onClick={() => handleSubcategorySelect(sub.id)}
              >
                {sub.name_hebrew}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div className="flex justify-between">
        <Button onClick={handleNext} disabled={!isStep2Valid} className="gap-2">
          <ArrowLeft className="h-4 w-4" />
          המשך
        </Button>
        <Button variant="outline" onClick={handleBack} className="gap-2">
          חזור
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Render details step
  const renderDetailsStep = () => (
    <div className="space-y-6">
      <Alert>
        <AlertDescription className="text-right">
          <strong>נושא:</strong> {selectedCategory?.name_hebrew}
          {formData.subcategory_id && (
            <> → {selectedCategory?.subcategories?.find(s => s.id === formData.subcategory_id)?.name_hebrew}</>
          )}
        </AlertDescription>
      </Alert>

      <div className="space-y-2">
        <Label htmlFor="subject" className="text-right flex items-center gap-2">
          
          נושא הפנייה
        </Label>
        <Input
          id="subject"
          value={formData.subject}
          onChange={(e) => handleInputChange('subject', e.target.value)}

          className="text-right"
          dir="rtl"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description" className="text-right flex items-center gap-2">
          
          פירוט הפנייה
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => handleInputChange('description', e.target.value)}

          className="text-right min-h-[150px]"
          dir="rtl"
        />
      </div>

      <div className="flex justify-between">
        <Button onClick={handleSubmit} disabled={!isStep3Valid || submitting} className="gap-2">
          {submitting ? (
            <>שולח...</>
          ) : (
            <>
              <Send className="h-4 w-4" />
              שלח פנייה
            </>
          )}
        </Button>
        <Button variant="outline" onClick={handleBack} disabled={submitting} className="gap-2">
          חזור
          <ArrowRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );

  // Render success step
  const renderSuccessStep = () => (
    <div className="text-center space-y-6 py-8">
      <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto">
        <CheckCircle className="h-10 w-10 text-green-600" />
      </div>

      <div className="space-y-2">
        <h2 className="text-2xl font-bold text-green-600">הפנייה נשלחה בהצלחה!</h2>
        <p className="text-muted-foreground">
          מספר פנייה: <strong className="text-foreground">{successData?.ticketNumber}</strong>
        </p>
      </div>

      <Alert className="max-w-md mx-auto text-right">
        <Ticket className="h-4 w-4" />
        <AlertDescription>
          נשלח אליכם אימייל עם פרטי הפנייה וקישור למעקב.
          שמרו את מספר הפנייה לצורך מעקב.
        </AlertDescription>
      </Alert>

      {successData?.trackingUrl && (
        <Button
          variant="outline"
          onClick={() => navigate(successData.trackingUrl)}
          className="gap-2"
        >
          <FileText className="h-4 w-4" />
          צפה בסטטוס הפנייה
        </Button>
      )}

      <Button variant="link" onClick={() => window.location.reload()}>
        פתח פנייה חדשה
      </Button>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-muted-foreground">טוען...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-8 px-4" dir="rtl">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <Ticket className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-bold">Tico Tickets</h1>
          <p className="text-muted-foreground mt-2">פתיחת פנייה חדשה</p>
        </div>

        {/* Step indicator */}
        {step !== 'success' && renderStepIndicator()}

        {/* Form card */}
        <Card className="shadow-lg">
          <CardHeader className="text-right">
            {step === 'contact' && (
              <>
                <CardTitle>פרטי קשר</CardTitle>
                <CardDescription>מלאו את פרטי הקשר שלכם</CardDescription>
              </>
            )}
            {step === 'category' && (
              <>
                <CardTitle>בחירת נושא</CardTitle>
                <CardDescription>בחרו את הנושא המתאים לפנייה</CardDescription>
              </>
            )}
            {step === 'details' && (
              <>
                <CardTitle>פרטי הפנייה</CardTitle>
                <CardDescription>תארו את הבקשה או השאלה שלכם</CardDescription>
              </>
            )}
          </CardHeader>
          <CardContent>
            {step === 'contact' && renderContactStep()}
            {step === 'category' && renderCategoryStep()}
            {step === 'details' && renderDetailsStep()}
            {step === 'success' && renderSuccessStep()}
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          TicoVision CRM - מערכת ניהול פניות
        </p>
      </div>
    </div>
  );
}
