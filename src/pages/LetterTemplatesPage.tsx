/**
 * Letter Templates Page - Simplified Version
 * Uses file-based template system (Header + Body + Payment + Footer)
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Edit, Copy } from 'lucide-react';
import { TemplateService } from '@/modules/letters/services/template.service';
import { getCurrentTenantId } from '@/lib/supabase';
import { LetterBuilder } from '@/modules/letters/components/LetterBuilder';

const templateService = new TemplateService();

export function LetterTemplatesPage() {
  const [activeTab, setActiveTab] = useState('builder');
  const [headerHtml, setHeaderHtml] = useState('');
  const [footerHtml, setFooterHtml] = useState('');
  const [isSavingComponents, setIsSavingComponents] = useState(false);
  const [isEditingComponents, setIsEditingComponents] = useState(false);
  const [editingHeaderHtml, setEditingHeaderHtml] = useState('');
  const [editingFooterHtml, setEditingFooterHtml] = useState('');

  useEffect(() => {
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
      }
    } catch (error) {
      console.error('Error loading letter components:', error);
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
        content_html: '',
        header_html: headerHtml,
        footer_html: footerHtml,
        is_active: true
      });

      if (error) throw error;

      toast.success('הגדרות הכותרת והתחתית נשמרו בהצלחה');
    } catch (error) {
      console.error('Error saving letter components:', error);
      toast.error('שגיאה בשמירת הגדרות');
    } finally {
      setIsSavingComponents(false);
    }
  };

  return (
    <div className="space-y-6" dir="rtl">
      {/* Page Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 text-right">ניהול תבניות מכתבים</h1>
          <p className="text-gray-500 mt-1 text-right">בניית מכתבים מרכיבים קיימים (11 תבניות זמינות)</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="settings">הגדרות כותרת ותחתית</TabsTrigger>
          <TabsTrigger value="builder">בניית מכתב</TabsTrigger>
        </TabsList>

        {/* Builder Tab */}
        <TabsContent value="builder" className="space-y-4">
          <LetterBuilder />
        </TabsContent>

        {/* Settings Tab */}
        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-right">הגדרות כותרת עליונה ותחתונה</CardTitle>
              <CardDescription className="text-right">
                הגדר כותרות עליונות ותחתונות שיופיעו בכל המכתבים
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Preview */}
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

      {/* Edit Header/Footer Dialog */}
      <Dialog open={isEditingComponents} onOpenChange={setIsEditingComponents}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">עריכת כותרת עליונה ותחתונה</DialogTitle>
            <DialogDescription className="text-right">
              ערוך את הכותרות שיופיעו בכל המכתבים. ניתן להשתמש במשתנים {'{{variable}}'}.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label className="text-right block">כותרת עליונה (Header)</Label>
              <Textarea
                value={editingHeaderHtml}
                onChange={(e) => setEditingHeaderHtml(e.target.value)}
                placeholder="HTML של כותרת עליונה"
                className="min-h-[200px] font-mono text-sm"
                dir="ltr"
              />
            </div>

            <div>
              <Label className="text-right block">כותרת תחתונה (Footer)</Label>
              <Textarea
                value={editingFooterHtml}
                onChange={(e) => setEditingFooterHtml(e.target.value)}
                placeholder="HTML של כותרת תחתונה"
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
                משתנים זמינים: {'{{letter_date}}'}, {'{{company_name}}'}, {'{{group_name}}'}
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
    </div>
  );
}
