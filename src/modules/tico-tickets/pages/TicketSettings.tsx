/**
 * Tico Tickets - Settings Page
 * הגדרות מערכת הפניות
 *
 * Design: Modern Control Panel with sidebar navigation
 */

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import {
  ArrowRight,
  Loader2,
  Bell,
  Users,
  Clock,
  Archive,
  Columns,
  Settings,
  Sparkles,
  CheckCircle2,
  Zap,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { ticketService } from '../services/ticket.service';
import type { TicketSettings as TicketSettingsType, AssignableUser, SupportTicketStatus } from '../types/ticket.types';

type SettingsSection = 'assignment' | 'notifications' | 'sla' | 'archive' | 'columns';

const SECTIONS: { id: SettingsSection; label: string; icon: React.ElementType; description: string }[] = [
  { id: 'assignment', label: 'שיוך אוטומטי', icon: Users, description: 'הגדרות שיוך פניות' },
  { id: 'notifications', label: 'התראות', icon: Bell, description: 'הודעות והתראות' },
  { id: 'sla', label: 'זמני תגובה', icon: Clock, description: 'הגדרות SLA' },
  { id: 'archive', label: 'ארכיון', icon: Archive, description: 'ארכיון אוטומטי' },
  { id: 'columns', label: 'עמודות Kanban', icon: Columns, description: 'תצוגת לוח' },
];

export function TicketSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [settings, setSettings] = useState<TicketSettingsType | null>(null);
  const [assignees, setAssignees] = useState<AssignableUser[]>([]);
  const [statuses, setStatuses] = useState<SupportTicketStatus[]>([]);
  const [activeSection, setActiveSection] = useState<SettingsSection>('assignment');
  const [hasChanges, setHasChanges] = useState(false);
  const sectionRefs = useRef<Record<SettingsSection, HTMLDivElement | null>>({
    assignment: null,
    notifications: null,
    sla: null,
    archive: null,
    columns: null,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [settingsResult, assigneesResult, statusesResult] = await Promise.all([
        ticketService.getSettings(),
        ticketService.getAssignableUsers(),
        ticketService.getStatuses(),
      ]);

      if (settingsResult.data) setSettings(settingsResult.data);
      if (assigneesResult.data) setAssignees(assigneesResult.data);
      if (statusesResult.data) setStatuses(statusesResult.data);
    } catch (error) {
      console.error('Error loading settings:', error);
      toast.error('שגיאה בטעינת הגדרות');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!settings) return;
    setSaving(true);
    try {
      const result = await ticketService.updateSettings(settings);
      if (result.error) throw result.error;
      toast.success('ההגדרות נשמרו בהצלחה');
      setHasChanges(false);
    } catch (error) {
      console.error('Error saving settings:', error);
      toast.error('שגיאה בשמירת הגדרות');
    } finally {
      setSaving(false);
    }
  };

  const updateSetting = <K extends keyof TicketSettingsType>(key: K, value: TicketSettingsType[K]) => {
    setSettings((prev) => (prev ? { ...prev, [key]: value } : null));
    setHasChanges(true);
  };

  const scrollToSection = (sectionId: SettingsSection) => {
    setActiveSection(sectionId);
    sectionRefs.current[sectionId]?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="absolute inset-0 rounded-full bg-primary/20 blur-xl animate-pulse" />
            <Settings className="h-12 w-12 text-primary animate-spin" />
          </div>
          <p className="text-muted-foreground text-sm">טוען הגדרות...</p>
        </div>
      </div>
    );
  }

  if (!settings) {
    return (
      <div className="h-full flex items-center justify-center bg-background">
        <p className="text-muted-foreground">שגיאה בטעינת הגדרות</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex bg-background text-foreground" dir="rtl">
      {/* Sidebar */}
      <aside className="w-72 border-l border-border flex flex-col bg-card shrink-0 sticky top-0 h-screen">
        {/* Sidebar Header */}
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3 mb-1">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Settings className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold text-foreground">הגדרות</h1>
              <p className="text-xs text-muted-foreground">Tico Tickets</p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 space-y-1">
          {SECTIONS.map((section, index) => {
            const Icon = section.icon;
            const isActive = activeSection === section.id;
            return (
              <button
                key={section.id}
                onClick={() => scrollToSection(section.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-4 py-3 rounded-xl text-right transition-all duration-200',
                  'hover:bg-muted',
                  isActive && 'bg-primary/10 border border-primary/20 shadow-sm'
                )}
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className={cn(
                  'p-2 rounded-lg transition-colors',
                  isActive ? 'bg-primary/20 text-primary' : 'bg-muted text-muted-foreground'
                )}>
                  <Icon className="h-4 w-4" />
                </div>
                <div className="flex-1 text-right">
                  <div className={cn(
                    'text-sm font-medium',
                    isActive ? 'text-foreground' : 'text-foreground/80'
                  )}>
                    {section.label}
                  </div>
                  <div className="text-xs text-muted-foreground">{section.description}</div>
                </div>
                {isActive && (
                  <div className="w-1 h-8 rounded-full bg-primary" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer */}
        <div className="p-4 border-t border-border space-y-3">
          <Button
            onClick={() => navigate('/tico-tickets')}
            variant="ghost"
            className="w-full justify-start gap-2 text-muted-foreground hover:text-foreground hover:bg-muted"
          >
            <ArrowRight className="h-4 w-4" />
            חזרה ללוח
          </Button>

          <Button
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={cn(
              'w-full gap-2 transition-all duration-300',
              hasChanges
                ? 'bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm'
                : 'bg-muted text-muted-foreground'
            )}
          >
            {saving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : hasChanges ? (
              <Sparkles className="h-4 w-4" />
            ) : (
              <CheckCircle2 className="h-4 w-4" />
            )}
            {saving ? 'שומר...' : hasChanges ? 'שמור שינויים' : 'הכל שמור'}
          </Button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 min-h-screen">
        <div className="max-w-2xl mx-auto p-8 space-y-8">
          {/* Assignment Section */}
          <section
            ref={(el) => { sectionRefs.current.assignment = el; }}
            className="scroll-mt-8"
          >
            <SettingsCard
              icon={Users}
              title="שיוך אוטומטי"
              description="הגדר כיצד פניות חדשות משויכות לעובדים"
              isActive={activeSection === 'assignment'}
            >
              <SettingsRow
                label="הפעל שיוך אוטומטי"
                description="פניות חדשות ישויכו אוטומטית"
              >
                <Switch
                  checked={settings.auto_assign_enabled}
                  onCheckedChange={(checked) => updateSetting('auto_assign_enabled', checked)}
                />
              </SettingsRow>

              {settings.auto_assign_enabled && (
                <>
                  <div className="h-px bg-border my-4" />

                  <div className="space-y-3">
                    <Label className="text-sm text-foreground">משויך ברירת מחדל</Label>
                    <Select
                      value={settings.default_assignee_id || 'none'}
                      onValueChange={(value) => updateSetting('default_assignee_id', value === 'none' ? null : value)}
                    >
                      <SelectTrigger className="bg-muted border-border text-right focus:ring-primary/50">
                        <SelectValue placeholder="בחר משויך" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none" className="text-right">ללא</SelectItem>
                        {assignees.map((user) => (
                          <SelectItem key={user.id} value={user.id} className="text-right">
                            {user.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <SettingsRow
                    label="Round Robin"
                    description="חלוקה שווה בין כל העובדים"
                    className="mt-4"
                  >
                    <Switch
                      checked={settings.round_robin_enabled}
                      onCheckedChange={(checked) => updateSetting('round_robin_enabled', checked)}
                    />
                  </SettingsRow>
                </>
              )}
            </SettingsCard>
          </section>

          {/* Notifications Section */}
          <section
            ref={(el) => { sectionRefs.current.notifications = el; }}
            className="scroll-mt-8"
          >
            <SettingsCard
              icon={Bell}
              title="התראות"
              description="קבע מתי לשלוח התראות"
              isActive={activeSection === 'notifications'}
            >
              <SettingsRow
                label="התראה על פנייה חדשה"
                description="קבל התראה כשנפתחת פנייה חדשה"
              >
                <Switch
                  checked={settings.notify_on_new_ticket}
                  onCheckedChange={(checked) => updateSetting('notify_on_new_ticket', checked)}
                />
              </SettingsRow>

              <div className="h-px bg-border my-4" />

              <SettingsRow
                label="התראה על שיוך"
                description="התראה לעובד כשמשויכת אליו פנייה"
              >
                <Switch
                  checked={settings.notify_assignee_on_assign}
                  onCheckedChange={(checked) => updateSetting('notify_assignee_on_assign', checked)}
                />
              </SettingsRow>
            </SettingsCard>
          </section>

          {/* SLA Section */}
          <section
            ref={(el) => { sectionRefs.current.sla = el; }}
            className="scroll-mt-8"
          >
            <SettingsCard
              icon={Clock}
              title="זמני תגובה (SLA)"
              description="הגדר יעדי זמן תגובה"
              isActive={activeSection === 'sla'}
            >
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-3">
                  <Label className="text-sm text-foreground flex items-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                    תגובה רגילה
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={settings.default_response_hours}
                      onChange={(e) => updateSetting('default_response_hours', parseInt(e.target.value) || 24)}
                      className="text-left pl-16"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      שעות
                    </span>
                  </div>
                </div>

                <div className="space-y-3">
                  <Label className="text-sm text-foreground flex items-center gap-2">
                    <Zap className="h-3.5 w-3.5 text-amber-500" />
                    תגובה דחופה
                  </Label>
                  <div className="relative">
                    <Input
                      type="number"
                      min={1}
                      value={settings.urgent_response_hours}
                      onChange={(e) => updateSetting('urgent_response_hours', parseInt(e.target.value) || 4)}
                      className="text-left pl-16"
                    />
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                      שעות
                    </span>
                  </div>
                </div>
              </div>
            </SettingsCard>
          </section>

          {/* Archive Section */}
          <section
            ref={(el) => { sectionRefs.current.archive = el; }}
            className="scroll-mt-8"
          >
            <SettingsCard
              icon={Archive}
              title="ארכיון אוטומטי"
              description="העבר פניות ישנות לארכיון"
              isActive={activeSection === 'archive'}
            >
              <div className="space-y-3">
                <Label className="text-sm text-foreground">העבר לארכיון אחרי</Label>
                <div className="relative">
                  <Input
                    type="number"
                    min={1}
                    value={settings.auto_archive_days}
                    onChange={(e) => updateSetting('auto_archive_days', parseInt(e.target.value) || 30)}
                    className="text-left pl-14"
                  />
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">
                    ימים
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  פניות שהושלמו יועברו אוטומטית לארכיון
                </p>
              </div>
            </SettingsCard>
          </section>

          {/* Columns Section */}
          <section
            ref={(el) => { sectionRefs.current.columns = el; }}
            className="scroll-mt-8"
          >
            <SettingsCard
              icon={Columns}
              title="עמודות לוח Kanban"
              description="בחר אילו עמודות יוצגו בלוח"
              isActive={activeSection === 'columns'}
            >
              <div className="grid grid-cols-2 gap-3">
                {statuses
                  .filter((s) => s.key !== 'archived')
                  .map((status) => {
                    const isEnabled = settings.visible_column_keys.includes(status.key);
                    return (
                      <button
                        key={status.id}
                        onClick={() => {
                          const newKeys = isEnabled
                            ? settings.visible_column_keys.filter((k) => k !== status.key)
                            : [...settings.visible_column_keys, status.key];
                          updateSetting('visible_column_keys', newKeys);
                        }}
                        className={cn(
                          'flex items-center gap-3 p-3 rounded-xl border transition-all duration-200 text-right',
                          isEnabled
                            ? 'bg-muted border-border shadow-sm'
                            : 'bg-card border-border opacity-60 hover:opacity-80'
                        )}
                      >
                        <div
                          className="w-3 h-3 rounded-full ring-2 ring-offset-2 ring-offset-background"
                          style={{
                            backgroundColor: status.color,
                            ringColor: isEnabled ? status.color : 'transparent'
                          }}
                        />
                        <span className="text-sm flex-1 text-foreground">{status.name_hebrew || status.name}</span>
                        {isEnabled && (
                          <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px] px-1.5">
                            פעיל
                          </Badge>
                        )}
                      </button>
                    );
                  })}
              </div>
            </SettingsCard>
          </section>

          {/* Bottom Spacer */}
          <div className="h-8" />
        </div>
      </main>
    </div>
  );
}

// Settings Card Component
function SettingsCard({
  icon: Icon,
  title,
  description,
  children,
  isActive
}: {
  icon: React.ElementType;
  title: string;
  description: string;
  children: React.ReactNode;
  isActive?: boolean;
}) {
  return (
    <div className={cn(
      'rounded-2xl border transition-all duration-300 overflow-hidden',
      isActive
        ? 'bg-card border-border shadow-md'
        : 'bg-card/50 border-border/50'
    )}>
      <div className="p-6 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={cn(
            'p-2.5 rounded-xl transition-colors',
            isActive ? 'bg-primary/20' : 'bg-muted'
          )}>
            <Icon className={cn('h-5 w-5', isActive ? 'text-primary' : 'text-muted-foreground')} />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-foreground">{title}</h2>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>
      <div className="p-6 overflow-x-auto">
        {children}
      </div>
    </div>
  );
}

// Settings Row Component
function SettingsRow({
  label,
  description,
  children,
  className
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center justify-between gap-4 min-w-0', className)}>
      <div className="flex-1 min-w-0 overflow-hidden">
        <div className="text-sm font-medium text-foreground truncate">{label}</div>
        {description && (
          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{description}</div>
        )}
      </div>
      <div className="flex-shrink-0 ml-auto">
        {children}
      </div>
    </div>
  );
}

export default TicketSettings;
