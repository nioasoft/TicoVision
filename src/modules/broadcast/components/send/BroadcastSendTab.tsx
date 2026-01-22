/**
 * Broadcast Send Tab - Create and send broadcasts
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Loader2, Send, Users, Mail, Eye, AlertCircle, TestTube2 } from 'lucide-react';
import { useBroadcastStore } from '../../store/broadcastStore';
import { RecipientPreview } from './RecipientPreview';
import { SendProgressDialog } from './SendProgressDialog';
import { TestSendDialog } from './TestSendDialog';
import { EmailPreviewDialog } from './EmailPreviewDialog';
import { broadcastService } from '../../services/broadcast.service';
import { toast } from 'sonner';
import type { BroadcastListType } from '../../types/broadcast.types';

export const BroadcastSendTab: React.FC = () => {
  const {
    lists,
    eligibleClients,
    recipientSummary,
    recipientSummaryLoading,
    resolveRecipients,
    clearRecipientSummary,
  } = useBroadcastStore();

  // Form state
  const [listType, setListType] = useState<BroadcastListType>('all');
  const [selectedListId, setSelectedListId] = useState<string>('');
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [isCreating, setIsCreating] = useState(false);

  // Progress dialog
  const [progressDialogOpen, setProgressDialogOpen] = useState(false);
  const [currentBroadcastId, setCurrentBroadcastId] = useState<string | null>(null);

  // Test and preview dialogs
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);

  // Resolve recipients when list type or selection changes
  useEffect(() => {
    if (listType === 'all') {
      resolveRecipients('all');
    } else if (selectedListId) {
      resolveRecipients('custom', selectedListId);
    } else {
      clearRecipientSummary();
    }
  }, [listType, selectedListId, resolveRecipients, clearRecipientSummary]);

  const handleListTypeChange = (value: BroadcastListType) => {
    setListType(value);
    if (value === 'all') {
      setSelectedListId('');
    }
  };

  const handleSend = async () => {
    // Validation
    if (!name.trim()) {
      toast.error('נא להזין שם להפצה');
      return;
    }
    if (!subject.trim()) {
      toast.error('נא להזין נושא למייל');
      return;
    }
    if (!content.trim()) {
      toast.error('נא להזין תוכן למייל');
      return;
    }
    if (listType === 'custom' && !selectedListId) {
      toast.error('נא לבחור רשימת תפוצה');
      return;
    }
    if (!recipientSummary || recipientSummary.total_emails === 0) {
      toast.error('אין נמענים לשליחה');
      return;
    }

    setIsCreating(true);

    try {
      // Create the broadcast
      const { data: broadcast, error } = await broadcastService.createBroadcast({
        name: name.trim(),
        subject: subject.trim(),
        list_type: listType,
        list_id: listType === 'custom' ? selectedListId : undefined,
        custom_content_html: content.trim(),
      });

      if (error || !broadcast) {
        throw error || new Error('Failed to create broadcast');
      }

      // Set current broadcast ID and open progress dialog
      setCurrentBroadcastId(broadcast.id);
      setProgressDialogOpen(true);

      // Start sending
      await broadcastService.sendBroadcast(broadcast.id);
    } catch {
      toast.error('שגיאה ביצירת ההפצה');
    } finally {
      setIsCreating(false);
    }
  };

  const handleProgressComplete = () => {
    setProgressDialogOpen(false);
    setCurrentBroadcastId(null);
    // Reset form
    setName('');
    setSubject('');
    setContent('');
    toast.success('ההפצה הושלמה בהצלחה!');
  };

  const totalClients = listType === 'all' ? eligibleClients.length : (recipientSummary?.total_clients || 0);
  const totalEmails = recipientSummary?.total_emails || 0;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Form - 2/3 width */}
        <div className="lg:col-span-2 space-y-6">
          {/* Recipients Selection */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base rtl:text-right">נמענים</CardTitle>
              <CardDescription className="rtl:text-right">
                בחר את קבוצת הלקוחות לשליחה
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <RadioGroup
                value={listType}
                onValueChange={(v) => handleListTypeChange(v as BroadcastListType)}
                className="space-y-3"
              >
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="all" id="all" />
                  <Label htmlFor="all" className="flex items-center gap-2 cursor-pointer">
                    כל הלקוחות
                    <Badge variant="secondary" className="font-normal">
                      {eligibleClients.length} לקוחות
                    </Badge>
                  </Label>
                </div>
                <div className="flex items-center gap-3">
                  <RadioGroupItem value="custom" id="custom" />
                  <Label htmlFor="custom" className="cursor-pointer">
                    רשימה מותאמת
                  </Label>
                </div>
              </RadioGroup>

              {listType === 'custom' && (
                <div className="pr-6">
                  <Select value={selectedListId} onValueChange={setSelectedListId}>
                    <SelectTrigger>
                      <SelectValue placeholder="בחר רשימת תפוצה" />
                    </SelectTrigger>
                    <SelectContent>
                      {lists.length === 0 ? (
                        <div className="p-3 text-center text-sm text-muted-foreground">
                          אין רשימות תפוצה. צור רשימה חדשה בטאב "רשימות הפצה"
                        </div>
                      ) : (
                        lists.map((list) => (
                          <SelectItem key={list.id} value={list.id}>
                            {list.name} ({list.member_count} לקוחות)
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Summary */}
              {recipientSummaryLoading ? (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  מחשב נמענים...
                </div>
              ) : recipientSummary ? (
                <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{totalClients} לקוחות</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm font-medium">{totalEmails} כתובות מייל</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPreview(!showPreview)}
                    className="mr-auto"
                  >
                    <Eye className="h-4 w-4 ml-1" />
                    {showPreview ? 'הסתר' : 'הצג'} נמענים
                  </Button>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {/* Content */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base rtl:text-right">תוכן ההפצה</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name" className="rtl:text-right">
                  שם ההפצה (פנימי) *
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="שם ההפצה"
                  className="rtl:text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject" className="rtl:text-right">
                  נושא המייל *
                </Label>
                <Input
                  id="subject"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="הנושא שיופיע בתיבת הדואר"
                  className="rtl:text-right"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="content" className="rtl:text-right">
                  תוכן המייל *
                </Label>
                <Textarea
                  id="content"
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  placeholder="כתוב כאן את תוכן ההודעה..."
                  className="rtl:text-right min-h-[200px]"
                />
                <div className="flex items-center justify-between">
                  <p className="text-xs text-muted-foreground rtl:text-right">
                    בעתיד: תמיכה בעורך עשיר (TipTap) ותבניות מוכנות
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setPreviewDialogOpen(true)}
                      disabled={!content.trim()}
                    >
                      <Eye className="h-4 w-4 ml-1" />
                      תצוגה מקדימה
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setTestDialogOpen(true)}
                      disabled={!subject.trim() || !content.trim()}
                    >
                      <TestTube2 className="h-4 w-4 ml-1" />
                      שלח בדיקה
                    </Button>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Preview Panel - 1/3 width */}
        <div className="space-y-6">
          {/* Send Button Card */}
          <Card>
            <CardContent className="pt-6">
              <div className="space-y-4">
                {totalEmails === 0 ? (
                  <div className="flex items-center gap-2 text-sm text-amber-600 bg-amber-50 p-3 rounded-lg">
                    <AlertCircle className="h-4 w-4" />
                    <span>אין נמענים לשליחה</span>
                  </div>
                ) : (
                  <div className="text-center">
                    <div className="text-3xl font-bold text-primary">{totalEmails}</div>
                    <div className="text-sm text-muted-foreground">מיילים יישלחו</div>
                  </div>
                )}

                <Button
                  onClick={handleSend}
                  className="w-full"
                  size="lg"
                  disabled={isCreating || totalEmails === 0}
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="h-5 w-5 ml-2 animate-spin" />
                      יוצר הפצה...
                    </>
                  ) : (
                    <>
                      <Send className="h-5 w-5 ml-2" />
                      שלח הפצה
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Recipient Preview */}
          {showPreview && recipientSummary && (
            <RecipientPreview summary={recipientSummary} />
          )}
        </div>
      </div>

      {/* Progress Dialog */}
      {currentBroadcastId && (
        <SendProgressDialog
          open={progressDialogOpen}
          broadcastId={currentBroadcastId}
          onComplete={handleProgressComplete}
        />
      )}

      {/* Test Send Dialog */}
      <TestSendDialog
        open={testDialogOpen}
        onOpenChange={setTestDialogOpen}
        subject={subject}
        content={content}
      />

      {/* Email Preview Dialog */}
      <EmailPreviewDialog
        open={previewDialogOpen}
        onOpenChange={setPreviewDialogOpen}
        subject={subject}
        content={content}
      />
    </div>
  );
};
