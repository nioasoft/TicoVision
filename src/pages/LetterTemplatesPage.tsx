import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { 
  FileText, 
  Edit, 
  Eye, 
  Download, 
  Upload, 
  Plus, 
  Settings,
  Mail,
  Users,
  Calendar,
  Calculator,
  AlertCircle,
  Check,
  X,
  Copy
} from 'lucide-react';
import { TemplateService } from '@/modules/letters/services/template.service';
import { getCurrentTenantId } from '@/lib/supabase';
import { TemplateImporter } from '@/modules/letters/utils/template-importer';
import { TemplateParser } from '@/modules/letters/utils/template-parser';
import type { LetterTemplate, LetterVariables, TEMPLATE_CATEGORIES } from '@/modules/letters/types/letter.types';
import { TEMPLATE_CATEGORIES as categories } from '@/modules/letters/types/letter.types';

// Create templateService outside component to prevent recreation on each render
const templateService = new TemplateService();

export function LetterTemplatesPage() {
  const [templates, setTemplates] = useState<LetterTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<LetterTemplate | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isImporting, setIsImporting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [previewVariables, setPreviewVariables] = useState<Partial<LetterVariables>>({
    client_name: 'חברת דוגמה בע"מ',
    company_name: 'חברת דוגמה בע"מ',
    date: new Date().toLocaleDateString('he-IL'),
    year: new Date().getFullYear(),
    amount: 5000,
    amount_with_vat: 5900,
    inflation_rate: 4,
    notification_type: 'במייל'
  });
  const [previewHtml, setPreviewHtml] = useState('');
  const [activeTab, setActiveTab] = useState('templates');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [isSavingComponents, setIsSavingComponents] = useState(false);
  const [componentsLoaded, setComponentsLoaded] = useState(false);
  const [isEditingComponents, setIsEditingComponents] = useState(false);
  const [editingHeaderHtml, setEditingHeaderHtml] = useState('');
  const [editingFooterHtml, setEditingFooterHtml] = useState('');
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [previewingTemplate, setPreviewingTemplate] = useState<LetterTemplate | null>(null);

  useEffect(() => {
    loadTemplates();
    loadLetterComponents();
  }, []);

  const loadLetterComponents = async () => {
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) return;

      const { data, error } = await templateService.getComponent(tenantId);
      if (!error && data) {
        setHeaderHtml(data.header_html || '');
        setFooterHtml(data.footer_html || '');
        setComponentsLoaded(true);
      }
    } catch (error) {
      logger.error('Error loading letter components:', error);
      setComponentsLoaded(true); // Mark as loaded even on error
    }
  };

  const saveLetterComponents = async () => {
    setIsSavingComponents(true);
    try {
      const tenantId = await getCurrentTenantId();
      if (!tenantId) {
        toast.error('לא נמצא מזהה ארגון');
        return;
      }

      const { error } = await templateService.saveComponent({
        component_type: 'both',
        name: 'כותרת עליונה ותחתונה',
        description: 'רכיבי כותרת עליונה ותחתונה למכתבים',
        content_html: '', // Not used when we have separate header/footer
        header_html: headerHtml,
        footer_html: footerHtml,
        is_active: true
      });

      if (error) throw error;
      
      toast.success('הגדרות הכותרת והתחתית נשמרו בהצלחה');
    } catch (error) {
      logger.error('Error saving letter components:', error);
      toast.error('שגיאה בשמירת הגדרות');
    } finally {
      setIsSavingComponents(false);
    }
  };

  const loadTemplates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await templateService.getTemplates();
      if (error) throw error;
      setTemplates(data || []);
    } catch (error) {
      logger.error('Error loading templates:', error);
      toast.error('שגיאה בטעינת התבניות');
    } finally {
      setIsLoading(false);
    }
  };

  const importTemplates = async () => {
    setIsImporting(true);
    try {
      const templatesData = TemplateImporter.getAllTemplates();
      let importedCount = 0;
      
      for (const template of templatesData) {
        const { error } = await templateService.saveTemplate(template);
        if (!error) {
          importedCount++;
        }
      }
      
      toast.success(`${importedCount} תבניות יובאו בהצלחה`);
      await loadTemplates();
    } catch (error) {
      logger.error('Error importing templates:', error);
      toast.error('שגיאה בייבוא התבניות');
    } finally {
      setIsImporting(false);
    }
  };

  const previewTemplate = async (template: LetterTemplate) => {
    try {
      const { data, error } = await templateService.previewLetter({
        template_id: template.id,
        variables: previewVariables,
        include_header: true,
        include_footer: true
      });
      
      if (error) throw error;
      if (data) {
        // Apply current header/footer to preview
        let finalHtml = data.html;
        if (headerHtml && template.header_template_id) {
          const processedHeader = TemplateParser.replaceVariables(headerHtml, previewVariables);
          finalHtml = processedHeader + finalHtml;
        }
        if (footerHtml && template.footer_template_id) {
          const processedFooter = TemplateParser.replaceVariables(footerHtml, previewVariables);
          finalHtml = finalHtml + processedFooter;
        }
        setPreviewHtml(finalHtml);
        setPreviewingTemplate(template);
        setIsPreviewOpen(true);
      }
    } catch (error) {
      logger.error('Error previewing template:', error);
      toast.error('שגיאה בתצוגה מקדימה');
    }
  };

  const saveTemplate = async (template: LetterTemplate) => {
    try {
      const { error } = await templateService.saveTemplate(template);
      if (error) throw error;
      
      toast.success('התבנית נשמרה בהצלחה');
      setIsEditing(false);
      await loadTemplates();
    } catch (error) {
      logger.error('Error saving template:', error);
      toast.error('שגיאה בשמירת התבנית');
    }
  };

  const getCategoryIcon = (categoryId: string) => {
    switch (categoryId) {
      case 'external': return <Users className="h-4 w-4" />;
      case 'internal_audit': return <FileText className="h-4 w-4" />;
      case 'retainer': return <Calendar className="h-4 w-4" />;
      case 'internal_bookkeeping': return <Calculator className="h-4 w-4" />;
      default: return <FileText className="h-4 w-4" />;
    }
  };

  const filteredTemplates = selectedCategory === 'all' 
    ? templates 
    : templates.filter(t => {
        const category = categories.find(c => c.templates.includes(t.template_type));
        return category?.id === selectedCategory;
      });

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 text-right">ניהול תבניות מכתבים</h1>
          <p className="text-gray-500 mt-1 text-right">11 תבניות מכתבים לגביית שכר טרחה</p>
        </div>
        <div className="flex gap-2">
          {templates.length === 0 && (
            <Button 
              onClick={importTemplates} 
              disabled={isImporting}
              variant="default"
            >
              {isImporting ? 'מייבא...' : 'ייבוא 11 התבניות'}
              <Upload className="h-4 w-4 mr-2" />
            </Button>
          )}
          <Button variant="outline">
            הגדרות
            <Settings className="h-4 w-4 mr-2" />
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">הגדרות כותרת ותחתית</TabsTrigger>
          <TabsTrigger value="templates">תבניות</TabsTrigger>
        </TabsList>

        <TabsContent value="templates" className="space-y-4">
          {/* Category Filter */}
          <div className="flex flex-row-reverse gap-2 mb-4">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              הכל ({templates.length})
            </Button>
            {categories.map(category => {
              const count = templates.filter(t => 
                category.templates.includes(t.template_type)
              ).length;
              return (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  <span className="ml-2">{category.name_hebrew} ({count})</span>
                  {getCategoryIcon(category.id)}
                </Button>
              );
            })}
          </div>

          {/* Templates Grid */}
          {isLoading ? (
            <div className="text-center py-8 text-right">טוען תבניות...</div>
          ) : filteredTemplates.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-right">
                {templates.length === 0 
                  ? 'לא נמצאו תבניות. לחץ על "ייבוא 11 התבניות" להתחלה.'
                  : 'אין תבניות בקטגוריה זו.'}
              </AlertDescription>
            </Alert>
          ) : (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {filteredTemplates.map((template) => {
                const category = categories.find(c => 
                  c.templates.includes(template.template_type)
                );
                return (
                  <Card key={template.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <Badge variant={template.is_active ? 'default' : 'secondary'}>
                          {template.is_active ? 'פעיל' : 'לא פעיל'}
                        </Badge>
                        <div className="flex items-center gap-2">
                          <CardTitle className="text-lg text-right">{template.name_hebrew}</CardTitle>
                          {category && getCategoryIcon(category.id)}
                        </div>
                      </div>
                      <CardDescription className="mt-2 text-right">
                        {template.subject}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center">
                        <div className="text-sm text-gray-500 text-right">
                          גרסה {template.version}
                        </div>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => previewTemplate(template)}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedTemplate(template);
                              setIsEditing(true);
                            }}
                            disabled={!template.is_editable}
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </TabsContent>


        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">הגדרות כותרת עליונה ותחתונה</CardTitle>
              <CardDescription className="text-right">
                הגדר כותרות עליונות ותחתונות שיופיעו בכל המכתבים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <div>ניתן להשתמש במשתנים באותו פורמט כמו בתבניות: [תאריך], [שם], [חברה]</div>
                  <div className="mt-2 text-xs">טיפ: לחץ על כפתור "עריכה" כדי לערוך את הכותרות, או השתמש בכפתורי ההעתקה להעתקת הקוד</div>
                </AlertDescription>
              </Alert>
              
              <Card className="bg-gray-50">
                <CardHeader>
                  <CardTitle className="text-sm text-right">תצוגה מקדימה נוכחית</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="bg-white border rounded-lg p-4">
                    {headerHtml ? (
                      <div className="relative mb-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 left-2 opacity-60 hover:opacity-100"
                          onClick={() => {
                            navigator.clipboard.writeText(headerHtml);
                            toast.success('כותרת עליונה הועתקה ללוח');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <div 
                          dangerouslySetInnerHTML={{ __html: headerHtml }} 
                          className="select-text" 
                          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                        />
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 mb-4 p-4 border-2 border-dashed rounded">
                        <p className="text-right">כותרת עליונה ריקה</p>
                      </div>
                    )}
                    <div className="p-4 bg-gray-50 rounded">
                      <p className="text-center text-gray-500">תוכן המכתב יופיע כאן</p>
                    </div>
                    {footerHtml ? (
                      <div className="relative mt-4">
                        <Button
                          size="sm"
                          variant="ghost"
                          className="absolute top-2 left-2 opacity-60 hover:opacity-100"
                          onClick={() => {
                            navigator.clipboard.writeText(footerHtml);
                            toast.success('כותרת תחתונה הועתקה ללוח');
                          }}
                        >
                          <Copy className="h-3 w-3" />
                        </Button>
                        <div 
                          dangerouslySetInnerHTML={{ __html: footerHtml }} 
                          className="select-text" 
                          style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                        />
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 mt-4 p-4 border-2 border-dashed rounded">
                        <p className="text-right">כותרת תחתונה ריקה</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
              
              <div className="flex justify-end gap-2">
                <Button 
                  variant="outline"
                  onClick={() => {
                    setEditingHeaderHtml(headerHtml);
                    setEditingFooterHtml(footerHtml);
                    setIsEditingComponents(true);
                  }}
                >
                  עריכה
                  <Edit className="h-4 w-4 mr-2" />
                </Button>
                <Button 
                  onClick={saveLetterComponents}
                  disabled={isSavingComponents}
                >
                  {isSavingComponents ? 'שומר...' : 'שמור הגדרות'}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Edit Template Dialog */}
      <Dialog open={isEditing} onOpenChange={setIsEditing}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת תבנית - {selectedTemplate?.name_hebrew}</DialogTitle>
            <DialogDescription className="text-right">
              ערוך את תוכן התבנית. שים לב למשתנים בפורמט [משתנה]
            </DialogDescription>
          </DialogHeader>
          {selectedTemplate && (
            <div className="space-y-4">
              <div>
                <Label className="text-right block">נושא המכתב</Label>
                <Input
                  value={selectedTemplate.subject}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    subject: e.target.value
                  })}
                />
              </div>
              <div>
                <Label className="text-right block">תוכן התבנית (HTML)</Label>
                <Textarea
                  value={selectedTemplate.content_html}
                  onChange={(e) => setSelectedTemplate({
                    ...selectedTemplate,
                    content_html: e.target.value
                  })}
                  className="min-h-[400px] font-mono text-sm"
                  dir="ltr"
                />
              </div>
              <div className="flex justify-between items-center">
                <div className="text-sm text-gray-500">
                  משתנים זמינים: [תאריך], [שם], [חברה], [סכום], [קבוצה], [סוג הודעה]
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setIsEditing(false)}>
                    ביטול
                  </Button>
                  <Button onClick={() => saveTemplate(selectedTemplate)}>
                    שמור שינויים
                  </Button>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Header/Footer Dialog */}
      <Dialog open={isEditingComponents} onOpenChange={setIsEditingComponents}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת כותרת עליונה ותחתונה</DialogTitle>
            <DialogDescription className="text-right">
              ערוך את הכותרות שיופיעו בכל המכתבים. ניתן להשתמש במשתנים.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-right block">כותרת עליונה (Header)</Label>
              <Textarea
                value={editingHeaderHtml}
                onChange={(e) => setEditingHeaderHtml(e.target.value)}
                placeholder={`לדוגמה:
<div style="text-align: center; border-bottom: 2px solid #333; padding-bottom: 20px;">
  <h1>תיקו פרנקו ושות' - רואי חשבון</h1>
  <p>רחוב הרצל 123, תל אביב | טלפון: 03-1234567</p>
</div>`}
                className="min-h-[200px] font-mono text-sm"
                dir="ltr"
              />
            </div>
            
            <div>
              <Label className="text-right block">כותרת תחתונה (Footer)</Label>
              <Textarea
                value={editingFooterHtml}
                onChange={(e) => setEditingFooterHtml(e.target.value)}
                placeholder={`לדוגמה:
<div style="text-align: center; border-top: 1px solid #ccc; padding-top: 20px; margin-top: 40px;">
  <p>בכבוד רב,<br/>תיקו פרנקו ושות'</p>
  <p style="font-size: 12px; color: #666;">מסמך זה הופק באמצעות מערכת TicoVision AI</p>
</div>`}
                className="min-h-[200px] font-mono text-sm"
                dir="ltr"
              />
            </div>

            {/* Preview */}
            <Card className="bg-gray-50">
              <CardHeader>
                <CardTitle className="text-sm text-right">תצוגה מקדימה</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="bg-white border rounded-lg p-4">
                  {editingHeaderHtml && (
                    <div 
                      dangerouslySetInnerHTML={{ __html: editingHeaderHtml }} 
                      className="mb-4 select-text" 
                      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    />
                  )}
                  <div className="p-4 bg-gray-50 rounded">
                    <p className="text-center text-gray-500">תוכן המכתב יופיע כאן</p>
                  </div>
                  {editingFooterHtml && (
                    <div 
                      dangerouslySetInnerHTML={{ __html: editingFooterHtml }} 
                      className="mt-4 select-text" 
                      style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-between items-center">
              <div className="text-sm text-gray-500 text-right">
                משתנים זמינים: [תאריך], [שם], [חברה], [סכום]
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setIsEditingComponents(false)}>
                  ביטול
                </Button>
                <Button onClick={() => {
                  setHeaderHtml(editingHeaderHtml);
                  setFooterHtml(editingFooterHtml);
                  setIsEditingComponents(false);
                  toast.success('השינויים נשמרו בהצלחה');
                }}>
                  שמור שינויים
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Template Dialog */}
      <Dialog open={isPreviewOpen} onOpenChange={setIsPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">תצוגה מקדימה - {previewingTemplate?.name_hebrew}</DialogTitle>
            <DialogDescription className="text-right">
              {previewingTemplate?.subject}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* משתנים לעריכה */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-right">התאמת משתנים</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <Label htmlFor="preview_client_name" className="text-right block">שם לקוח</Label>
                    <Input
                      id="preview_client_name"
                      value={previewVariables.client_name || ''}
                      onChange={(e) => setPreviewVariables({
                        ...previewVariables,
                        client_name: e.target.value
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preview_amount" className="text-right block">סכום</Label>
                    <Input
                      id="preview_amount"
                      type="number"
                      value={previewVariables.amount || 0}
                      onChange={(e) => setPreviewVariables({
                        ...previewVariables,
                        amount: Number(e.target.value),
                        amount_with_vat: Number(e.target.value) * 1.18
                      })}
                    />
                  </div>
                  <div>
                    <Label htmlFor="preview_date" className="text-right block">תאריך</Label>
                    <Input
                      id="preview_date"
                      value={previewVariables.date || ''}
                      onChange={(e) => setPreviewVariables({
                        ...previewVariables,
                        date: e.target.value
                      })}
                    />
                  </div>
                </div>
                <Button 
                  onClick={() => previewingTemplate && previewTemplate(previewingTemplate)}
                  className="mt-4"
                >
                  רענן תצוגה
                </Button>
              </CardContent>
            </Card>
            
            {/* תצוגת המכתב */}
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-right">תצוגת המכתב</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border rounded-lg p-4 bg-white" style={{ minHeight: '400px' }}>
                  <div 
                    dangerouslySetInnerHTML={{ __html: previewHtml }} 
                    className="select-text" 
                    style={{ userSelect: 'text', WebkitUserSelect: 'text' }}
                  />
                </div>
              </CardContent>
            </Card>
            
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                סגור
              </Button>
              <Button 
                onClick={() => {
                  navigator.clipboard.writeText(previewHtml);
                  toast.success('המכתב הועתק ללוח');
                }}
                variant="secondary"
              >
                <Copy className="h-4 w-4 mr-2" />
                העתק HTML
              </Button>
              <Button onClick={() => {
                // אפשרות לשליחה או הורדה
                toast.success('המכתב מוכן לשליחה');
              }}>
                <Mail className="h-4 w-4 mr-2" />
                שלח מכתב
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}