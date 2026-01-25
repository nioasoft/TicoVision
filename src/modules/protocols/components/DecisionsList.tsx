/**
 * DecisionsList
 * Component for managing protocol decisions grouped by responsibility type
 */

import { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ListTodo,
  Plus,
  Pencil,
  Trash2,
  ChevronDown,
  AlertTriangle,
  Building2,
  User as UserIcon,
  Calculator,
  Users,
  GripVertical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { userService } from '@/services/user.service';
import type { User } from '@/services/user.service';
import {
  RESPONSIBILITY_TYPES,
  getResponsibilityTypeInfo,
} from '../types/protocol.types';
import type {
  CreateDecisionDto,
  ResponsibilityType,
  DecisionUrgency,
  ItemStyle,
} from '../types/protocol.types';
import { StyleToolbar, getContentClasses, getContentStyle } from './StyleToolbar';

interface DecisionsListProps {
  decisions: CreateDecisionDto[];
  onChange: (decisions: CreateDecisionDto[]) => void;
}

interface DecisionFormState {
  content: string;
  urgency: DecisionUrgency;
  responsibility_type: ResponsibilityType;
  assigned_employee_id: string | null;
  assigned_other_name: string | null;
  audit_report_year: number | null;
  style: ItemStyle;
}

const CURRENT_YEAR = new Date().getFullYear();
const AUDIT_YEARS = Array.from({ length: 10 }, (_, i) => CURRENT_YEAR - i);

export function DecisionsList({ decisions, onChange }: DecisionsListProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editIndex, setEditIndex] = useState<number | null>(null);
  const [employees, setEmployees] = useState<User[]>([]);
  const [expandedGroups, setExpandedGroups] = useState<Set<ResponsibilityType>>(
    new Set(['office', 'client', 'bookkeeper', 'other'])
  );
  const [formState, setFormState] = useState<DecisionFormState>({
    content: '',
    urgency: 'normal',
    responsibility_type: 'office',
    assigned_employee_id: null,
    assigned_other_name: null,
    audit_report_year: null,
    style: {},
  });

  // Fetch employees for assignment (only accountants and admins)
  const fetchEmployees = useCallback(async () => {
    const { data } = await userService.getUsers();
    if (data) {
      // Filter to only show accountants and admins as responsible employees
      setEmployees(
        data.users.filter(
          (u) => u.is_active && (u.role === 'accountant' || u.role === 'admin')
        )
      );
    }
  }, []);

  useEffect(() => {
    if (dialogOpen) {
      fetchEmployees();
    }
  }, [dialogOpen, fetchEmployees]);

  // Group decisions by responsibility type
  const groupedDecisions = RESPONSIBILITY_TYPES.map((typeInfo) => ({
    ...typeInfo,
    decisions: decisions
      .map((d, index) => ({ ...d, originalIndex: index }))
      .filter((d) => d.responsibility_type === typeInfo.type),
  }));

  // Toggle group expansion
  const toggleGroup = (type: ResponsibilityType) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(type)) {
      newExpanded.delete(type);
    } else {
      newExpanded.add(type);
    }
    setExpandedGroups(newExpanded);
  };

  // Reset form
  const resetForm = () => {
    setFormState({
      content: '',
      urgency: 'normal',
      responsibility_type: 'office',
      assigned_employee_id: null,
      assigned_other_name: null,
      audit_report_year: null,
      style: {},
    });
    setEditIndex(null);
  };

  // Open dialog for new decision
  const handleAdd = () => {
    resetForm();
    setDialogOpen(true);
  };

  // Open dialog for editing
  const handleEdit = (index: number) => {
    const decision = decisions[index];
    setFormState({
      content: decision.content,
      urgency: decision.urgency || 'normal',
      responsibility_type: decision.responsibility_type,
      assigned_employee_id: decision.assigned_employee_id || null,
      assigned_other_name: decision.assigned_other_name || null,
      audit_report_year: decision.audit_report_year || null,
      style: decision.style || {},
    });
    setEditIndex(index);
    setDialogOpen(true);
  };

  // Delete decision
  const handleDelete = (index: number) => {
    const newDecisions = [...decisions];
    newDecisions.splice(index, 1);
    onChange(newDecisions);
  };

  // Save decision
  const handleSave = () => {
    const newDecision: CreateDecisionDto = {
      content: formState.content.trim(),
      urgency: formState.urgency,
      responsibility_type: formState.responsibility_type,
      assigned_employee_id:
        formState.responsibility_type === 'office' ? formState.assigned_employee_id : null,
      assigned_other_name:
        formState.responsibility_type === 'other' ? formState.assigned_other_name : null,
      audit_report_year: formState.audit_report_year,
      style: formState.style,
    };

    if (editIndex !== null) {
      // Update existing
      const newDecisions = [...decisions];
      newDecisions[editIndex] = newDecision;
      onChange(newDecisions);
    } else {
      // Add new
      onChange([...decisions, newDecision]);
    }

    setDialogOpen(false);
    resetForm();
  };

  // Handle field change
  const handleFieldChange = <K extends keyof DecisionFormState>(
    field: K,
    value: DecisionFormState[K]
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  // Get icon for responsibility type
  const getResponsibilityIcon = (type: ResponsibilityType) => {
    switch (type) {
      case 'office':
        return <Building2 className="h-4 w-4" />;
      case 'client':
        return <UserIcon className="h-4 w-4" />;
      case 'bookkeeper':
        return <Calculator className="h-4 w-4" />;
      case 'other':
        return <Users className="h-4 w-4" />;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-row-reverse">
        <Button
          variant="outline"
          size="sm"
          onClick={handleAdd}
          className="flex items-center gap-2 flex-row-reverse"
        >
          <Plus className="h-4 w-4" />
          הוסף החלטה
        </Button>
        <h3 className="text-lg font-semibold text-right flex items-center gap-2 flex-row-reverse">
          <ListTodo className="h-5 w-5" />
          החלטות
        </h3>
      </div>

      {/* Grouped Decisions */}
      {decisions.length === 0 ? (
        <div className="text-center py-8 text-gray-500 bg-gray-50 rounded-lg">
          <ListTodo className="h-8 w-8 mx-auto mb-2 text-gray-300" />
          <p>לא נוספו החלטות</p>
          <p className="text-sm">לחץ על &quot;הוסף החלטה&quot; להוספת החלטות לפרוטוקול</p>
        </div>
      ) : (
        <div className="space-y-3">
          {groupedDecisions.map((group) => {
            if (group.decisions.length === 0) return null;

            const typeInfo = getResponsibilityTypeInfo(group.type);
            const isExpanded = expandedGroups.has(group.type);

            return (
              <Collapsible
                key={group.type}
                open={isExpanded}
                onOpenChange={() => toggleGroup(group.type)}
              >
                <div
                  className={cn(
                    'rounded-lg border-2',
                    typeInfo.borderColor,
                    typeInfo.bgColor
                  )}
                >
                  <CollapsibleTrigger asChild>
                    <button className="w-full flex items-center justify-between p-3 flex-row-reverse" dir="rtl">
                      <ChevronDown
                        className={cn(
                          'h-4 w-4 transition-transform',
                          isExpanded && 'rotate-180'
                        )}
                      />
                      <div className="flex items-center gap-2 flex-row-reverse">
                        {getResponsibilityIcon(group.type)}
                        <span className={cn('font-semibold', typeInfo.color)}>
                          {group.label}
                        </span>
                        <Badge variant="secondary">{group.decisions.length}</Badge>
                      </div>
                    </button>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="px-3 pb-3 space-y-2">
                      {group.decisions.map((decision) => (
                        <div
                          key={decision.originalIndex}
                          className="bg-white rounded-lg p-3 border flex items-start gap-3 flex-row-reverse"
                          dir="rtl"
                        >
                          <GripVertical className="h-5 w-5 text-gray-300 flex-shrink-0 cursor-move mt-0.5" />
                          <div className="flex-1 text-right">
                            <div className="flex items-start justify-between flex-row-reverse">
                              <div className="flex items-center gap-1 flex-row-reverse flex-shrink-0 ml-2">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7"
                                  onClick={() => handleEdit(decision.originalIndex)}
                                >
                                  <Pencil className="h-3 w-3" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-7 w-7 text-red-500 hover:text-red-600"
                                  onClick={() => handleDelete(decision.originalIndex)}
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                              <p
                                className={cn('text-sm', getContentClasses(decision.style))}
                                style={getContentStyle(decision.style)}
                              >
                                {decision.content}
                              </p>
                            </div>
                            <div className="flex items-center gap-2 mt-2 flex-row-reverse">
                              {decision.urgency === 'urgent' && (
                                <Badge variant="destructive" className="flex items-center gap-1">
                                  <AlertTriangle className="h-3 w-3" />
                                  דחוף
                                </Badge>
                              )}
                              {decision.assigned_employee_id && (
                                <Badge variant="outline" className="text-xs">
                                  {employees.find((e) => e.id === decision.assigned_employee_id)
                                    ?.full_name || 'עובד'}
                                </Badge>
                              )}
                              {decision.assigned_other_name && (
                                <Badge variant="outline" className="text-xs">
                                  {decision.assigned_other_name}
                                </Badge>
                              )}
                              {decision.audit_report_year && (
                                <Badge variant="secondary" className="text-xs">
                                  דוח {decision.audit_report_year}
                                </Badge>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      )}

      {/* Add/Edit Decision Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-lg" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editIndex !== null ? 'עריכת החלטה' : 'הוספת החלטה'}
            </DialogTitle>
            <DialogDescription className="text-right">
              הגדר את תוכן ההחלטה והאחראי לביצועה
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* Content */}
            <div className="space-y-2">
              <Label htmlFor="content" className="text-right block">
                תוכן ההחלטה
              </Label>
              <Textarea
                id="content"
                value={formState.content}
                onChange={(e) => handleFieldChange('content', e.target.value)}

                className="text-right min-h-[80px]"
                dir="rtl"
              />
              <StyleToolbar
                style={formState.style}
                onChange={(style) => handleFieldChange('style', style)}
              />
            </div>

            {/* Urgency */}
            <div className="space-y-2">
              <Label className="text-right block">דחיפות</Label>
              <Select
                value={formState.urgency}
                onValueChange={(v) => handleFieldChange('urgency', v as DecisionUrgency)}
                dir="rtl"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="normal">רגיל</SelectItem>
                  <SelectItem value="urgent">
                    <div className="flex items-center gap-2 flex-row-reverse">
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                      דחוף
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Responsibility Type */}
            <div className="space-y-2">
              <Label className="text-right block">אחראי</Label>
              <Select
                value={formState.responsibility_type}
                onValueChange={(v) => {
                  handleFieldChange('responsibility_type', v as ResponsibilityType);
                  // Reset assignment fields when changing type
                  handleFieldChange('assigned_employee_id', null);
                  handleFieldChange('assigned_other_name', null);
                }}
                dir="rtl"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {RESPONSIBILITY_TYPES.map((type) => (
                    <SelectItem key={type.type} value={type.type}>
                      <div className="flex items-center gap-2 flex-row-reverse">
                        {getResponsibilityIcon(type.type)}
                        <span className={type.color}>{type.label}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Employee Assignment (for office responsibility) */}
            {formState.responsibility_type === 'office' && (
              <div className="space-y-2">
                <Label className="text-right block">עובד אחראי</Label>
                <Select
                  value={formState.assigned_employee_id || '__none__'}
                  onValueChange={(v) => handleFieldChange('assigned_employee_id', v === '__none__' ? null : v)}
                  dir="rtl"
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">ללא בחירה</SelectItem>
                    {employees.map((emp) => (
                      <SelectItem key={emp.id} value={emp.id}>
                        {emp.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Other Name (for other responsibility) */}
            {formState.responsibility_type === 'other' && (
              <div className="space-y-2">
                <Label htmlFor="other_name" className="text-right block">
                  שם האחראי
                </Label>
                <Input
                  id="other_name"
                  value={formState.assigned_other_name || ''}
                  onChange={(e) => handleFieldChange('assigned_other_name', e.target.value || null)}

                  className="text-right"
                  dir="rtl"
                />
              </div>
            )}

            {/* Audit Report Year */}
            <div className="space-y-2">
              <Label className="text-right block">קשור לדוח מבוקר לשנת</Label>
              <Select
                value={formState.audit_report_year?.toString() || '__none__'}
                onValueChange={(v) => handleFieldChange('audit_report_year', v === '__none__' ? null : parseInt(v))}
                dir="rtl"
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">ללא קשר לדוח</SelectItem>
                  {AUDIT_YEARS.map((year) => (
                    <SelectItem key={year} value={year.toString()}>
                      {year}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter className="flex-row-reverse gap-2 sm:justify-start">
            <Button onClick={handleSave} disabled={!formState.content.trim()}>
              {editIndex !== null ? 'עדכון' : 'הוספה'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setDialogOpen(false);
                resetForm();
              }}
            >
              ביטול
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
