/**
 * ProtocolBuilder
 * Form for creating and editing meeting protocols
 */

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
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
import { Save, Lock, ArrowRight, CalendarDays, FileText } from 'lucide-react';
import { AttendeeSelector } from './AttendeeSelector';
import { DecisionsList } from './DecisionsList';
import { ContentSectionEditor } from './ContentSectionEditor';
import { protocolService } from '../services/protocol.service';
import type {
  ProtocolWithRelations,
  ProtocolFormState,
  CreateAttendeeDto,
  CreateDecisionDto,
  CreateContentSectionDto,
} from '../types/protocol.types';

interface ProtocolBuilderProps {
  protocol: ProtocolWithRelations | null;
  clientId: string | null;
  groupId: string | null;
  recipientName: string;
  onSave: () => void;
  onCancel: () => void;
}

export function ProtocolBuilder({
  protocol,
  clientId,
  groupId,
  recipientName,
  onSave,
  onCancel,
}: ProtocolBuilderProps) {
  const [saving, setSaving] = useState(false);
  const [locking, setLocking] = useState(false);
  const [lockDialogOpen, setLockDialogOpen] = useState(false);
  const [formState, setFormState] = useState<ProtocolFormState>({
    meeting_date: format(new Date(), 'yyyy-MM-dd'),
    title: '',
    attendees: [],
    decisions: [],
    content_sections: [],
  });

  // Initialize form state from existing protocol
  useEffect(() => {
    if (protocol) {
      setFormState({
        meeting_date: protocol.meeting_date,
        title: protocol.title || '',
        attendees: protocol.attendees.map((a) => ({
          source_type: a.source_type,
          contact_id: a.contact_id,
          user_id: a.user_id,
          display_name: a.display_name,
          role_title: a.role_title,
        })),
        decisions: protocol.decisions.map((d) => ({
          content: d.content,
          urgency: d.urgency,
          responsibility_type: d.responsibility_type,
          assigned_employee_id: d.assigned_employee_id,
          assigned_other_name: d.assigned_other_name,
          audit_report_year: d.audit_report_year,
          sort_order: d.sort_order,
        })),
        content_sections: protocol.content_sections.map((s) => ({
          section_type: s.section_type,
          content: s.content,
          sort_order: s.sort_order,
        })),
      });
    }
  }, [protocol]);

  // Handle form field changes
  const handleFieldChange = (field: keyof ProtocolFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Handle attendee changes
  const handleAttendeesChange = (attendees: CreateAttendeeDto[]) => {
    setFormState((prev) => ({ ...prev, attendees }));
  };

  // Handle decision changes
  const handleDecisionsChange = (decisions: CreateDecisionDto[]) => {
    setFormState((prev) => ({ ...prev, decisions }));
  };

  // Handle content section changes
  const handleContentSectionsChange = (content_sections: CreateContentSectionDto[]) => {
    setFormState((prev) => ({ ...prev, content_sections }));
  };

  // Save the protocol
  const handleSave = async () => {
    setSaving(true);
    try {
      const { error } = await protocolService.saveProtocolForm(
        protocol?.id || null,
        clientId,
        groupId,
        formState
      );

      if (error) {
        console.error('Failed to save protocol:', error);
        return;
      }

      onSave();
    } finally {
      setSaving(false);
    }
  };

  // Lock the protocol
  const handleLock = async () => {
    if (!protocol?.id) return;

    setLocking(true);
    try {
      // First save any pending changes
      const { data: savedProtocol, error: saveError } = await protocolService.saveProtocolForm(
        protocol.id,
        clientId,
        groupId,
        formState
      );

      if (saveError || !savedProtocol) {
        console.error('Failed to save before locking:', saveError);
        return;
      }

      // Then lock
      const { error: lockError } = await protocolService.lockProtocol(savedProtocol.id);

      if (lockError) {
        console.error('Failed to lock protocol:', lockError);
        return;
      }

      onSave();
    } finally {
      setLocking(false);
      setLockDialogOpen(false);
    }
  };

  const isNew = !protocol;

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-row-reverse">
            <div className="flex items-center gap-2 flex-row-reverse">
              {!isNew && (
                <Button
                  onClick={() => setLockDialogOpen(true)}
                  disabled={saving || locking}
                  variant="secondary"
                  className="flex items-center gap-2 flex-row-reverse"
                >
                  <Lock className="h-4 w-4" />
                  שמור ונעל
                </Button>
              )}
              <Button
                onClick={handleSave}
                disabled={saving}
                className="flex items-center gap-2 flex-row-reverse"
              >
                <Save className="h-4 w-4" />
                {saving ? 'שומר...' : 'שמירה'}
              </Button>
              <Button variant="outline" onClick={onCancel}>
                ביטול
              </Button>
            </div>
            <div className="flex items-center gap-3 flex-row-reverse">
              <Button
                variant="ghost"
                size="icon"
                onClick={onCancel}
              >
                <ArrowRight className="h-4 w-4" />
              </Button>
              <div className="text-right">
                <CardTitle>
                  {isNew ? 'פרוטוקול חדש' : 'עריכת פרוטוקול'}
                </CardTitle>
                <CardDescription className="mt-1">
                  {recipientName}
                </CardDescription>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-8">
          {/* Header Section */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-right flex items-center gap-2 flex-row-reverse">
              <CalendarDays className="h-5 w-5" />
              פרטי הפגישה
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="meeting_date" className="text-right block">
                  תאריך פגישה
                </Label>
                <Input
                  id="meeting_date"
                  type="date"
                  value={formState.meeting_date}
                  onChange={(e) => handleFieldChange('meeting_date', e.target.value)}
                  className="text-right"
                  dir="rtl"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="title" className="text-right block">
                  כותרת (אופציונלי)
                </Label>
                <Input
                  id="title"
                  value={formState.title}
                  onChange={(e) => handleFieldChange('title', e.target.value)}
                  placeholder="תאר את נושא הפגישה"
                  className="text-right"
                  dir="rtl"
                />
              </div>
            </div>
          </div>

          <Separator />

          {/* Attendees Section */}
          <AttendeeSelector
            clientId={clientId}
            groupId={groupId}
            attendees={formState.attendees}
            onChange={handleAttendeesChange}
          />

          <Separator />

          {/* Decisions Section */}
          <DecisionsList
            decisions={formState.decisions}
            onChange={handleDecisionsChange}
          />

          <Separator />

          {/* Content Sections */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-left flex items-center gap-2" dir="rtl">
              <FileText className="h-5 w-5" />
              תוכן נוסף
            </h3>
            <ContentSectionEditor
              sections={formState.content_sections}
              onChange={handleContentSectionsChange}
            />
          </div>

          {/* Bottom Action Buttons */}
          <div className="flex items-center justify-start gap-2 flex-row-reverse pt-4">
            {!isNew && (
              <Button
                onClick={() => setLockDialogOpen(true)}
                disabled={saving || locking}
                variant="secondary"
                className="flex items-center gap-2 flex-row-reverse"
              >
                <Lock className="h-4 w-4" />
                שמור ונעל
              </Button>
            )}
            <Button
              onClick={handleSave}
              disabled={saving}
              className="flex items-center gap-2 flex-row-reverse"
            >
              <Save className="h-4 w-4" />
              {saving ? 'שומר...' : 'שמירה'}
            </Button>
            <Button variant="outline" onClick={onCancel}>
              ביטול
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Lock Confirmation Dialog */}
      <AlertDialog open={lockDialogOpen} onOpenChange={setLockDialogOpen}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">נעילת פרוטוקול</AlertDialogTitle>
            <AlertDialogDescription className="text-right">
              לאחר נעילת הפרוטוקול לא ניתן יהיה לערוך אותו. האם ברצונך להמשיך?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <AlertDialogAction onClick={handleLock} disabled={locking}>
              {locking ? 'נועל...' : 'שמור ונעל'}
            </AlertDialogAction>
            <AlertDialogCancel>ביטול</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
