/**
 * ProtocolsPage
 * Main page for managing meeting protocols with clients or client groups
 * Access: admin, accountant
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { ClientSelector } from '@/components/ClientSelector';
import { GroupSelector } from '@/components/GroupSelector';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { UnsavedChangesDialog } from '@/components/ui/unsaved-changes-dialog';
import { useUnsavedChangesGuard } from '@/hooks/useUnsavedChangesGuard';
import { cn } from '@/lib/utils';
import { clientService, type Client, type ClientGroup } from '@/services/client.service';
import {
  ArrowRight,
  Clock3,
  FilePlus,
  FileText,
  History,
  Plus,
  ScrollText,
  Sparkles,
  User,
  UsersRound,
} from 'lucide-react';
import { ProtocolBuilder } from '../components/ProtocolBuilder';
import { ProtocolList } from '../components/ProtocolList';
import { ProtocolPreview } from '../components/ProtocolPreview';
import { protocolService } from '../services/protocol.service';
import type { ProtocolWithRecipient, ProtocolWithRelations } from '../types/protocol.types';

type ViewMode = 'list' | 'builder' | 'preview';
type EntryMode = 'home' | 'new' | 'history';
type SelectionMode = 'client' | 'group';

const PROTOCOLS_PAGE_SIZE = 100;

export function ProtocolsPage() {
  const [entryMode, setEntryMode] = useState<EntryMode>('home');
  const [mode, setMode] = useState<SelectionMode>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolWithRelations | null>(null);
  const [protocols, setProtocols] = useState<ProtocolWithRecipient[]>([]);
  const [historyProtocols, setHistoryProtocols] = useState<ProtocolWithRecipient[]>([]);
  const [loading, setLoading] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [total, setTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);

  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportProtocolId, setSelectedImportProtocolId] = useState<string | null>(null);
  const [importingProtocol, setImportingProtocol] = useState(false);

  const [isBuilderDirty, setIsBuilderDirty] = useState(false);
  const [showInternalNavigationDialog, setShowInternalNavigationDialog] = useState(false);
  const [pendingInternalAction, setPendingInternalAction] = useState<(() => void) | null>(null);

  const guard = useUnsavedChangesGuard({
    isDirty: isBuilderDirty && viewMode === 'builder',
  });

  const isSelected = mode === 'client' ? !!selectedClient : !!selectedGroup;

  const getSelectedName = useCallback(() => {
    if (mode === 'client' && selectedClient) {
      return selectedClient.company_name_hebrew || selectedClient.company_name;
    }
    if (mode === 'group' && selectedGroup) {
      return selectedGroup.group_name_hebrew;
    }
    return '';
  }, [mode, selectedClient, selectedGroup]);

  const fetchAllProtocols = useCallback(async (params: {
    clientId?: string;
    groupId?: string;
    status?: 'draft' | 'locked';
  }): Promise<{ protocols: ProtocolWithRecipient[]; total: number }> => {
    const allProtocols: ProtocolWithRecipient[] = [];
    let totalCount = 0;
    let page = 1;

    while (true) {
      const { data, error } = await protocolService.getProtocols({
        ...params,
        page,
        pageSize: PROTOCOLS_PAGE_SIZE,
      });

      if (error) {
        throw error;
      }

      if (!data) {
        break;
      }

      allProtocols.push(...data.protocols);
      totalCount = data.total;

      if (allProtocols.length >= totalCount || data.protocols.length === 0) {
        break;
      }

      page += 1;
    }

    return { protocols: allProtocols, total: totalCount };
  }, []);

  const fetchProtocols = useCallback(async () => {
    if (!isSelected) {
      setProtocols([]);
      setTotal(0);
      return;
    }

    setLoading(true);
    try {
      const data = await fetchAllProtocols({
        clientId: selectedClient?.id,
        groupId: selectedGroup?.id,
      });
      setProtocols(data.protocols);
      setTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch protocols:', error);
    } finally {
      setLoading(false);
    }
  }, [fetchAllProtocols, isSelected, selectedClient?.id, selectedGroup?.id]);

  const fetchHistoryProtocols = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const data = await fetchAllProtocols({});
      setHistoryProtocols(data.protocols);
      setHistoryTotal(data.total);
    } catch (error) {
      console.error('Failed to fetch protocol history:', error);
    } finally {
      setHistoryLoading(false);
    }
  }, [fetchAllProtocols]);

  useEffect(() => {
    void fetchProtocols();
  }, [fetchProtocols]);

  useEffect(() => {
    if (entryMode === 'history' && viewMode === 'list') {
      void fetchHistoryProtocols();
    }
  }, [entryMode, viewMode, fetchHistoryProtocols]);

  const closeDetailView = useCallback(() => {
    setViewMode('list');
    setSelectedProtocol(null);
    setImportDialogOpen(false);
  }, []);

  const requestInternalNavigation = useCallback((action: () => void) => {
    if (isBuilderDirty && viewMode === 'builder') {
      setPendingInternalAction(() => action);
      setShowInternalNavigationDialog(true);
      return;
    }

    action();
  }, [isBuilderDirty, viewMode]);

  const handleInternalNavigationLeave = useCallback(() => {
    setShowInternalNavigationDialog(false);
    const action = pendingInternalAction;
    setPendingInternalAction(null);
    action?.();
  }, [pendingInternalAction]);

  const handleInternalNavigationStay = useCallback(() => {
    setShowInternalNavigationDialog(false);
    setPendingInternalAction(null);
  }, []);

  const handleEntryModeChange = useCallback((nextMode: Exclude<EntryMode, 'home'>) => {
    requestInternalNavigation(() => {
      setEntryMode(nextMode);
      closeDetailView();
    });
  }, [closeDetailView, requestInternalNavigation]);

  const handleGoHome = useCallback(() => {
    requestInternalNavigation(() => {
      setEntryMode('home');
      closeDetailView();
    });
  }, [closeDetailView, requestInternalNavigation]);

  const loadProtocolById = useCallback(async (protocolId: string) => {
    const { data, error } = await protocolService.getProtocolById(protocolId);
    if (error || !data) {
      console.error('Failed to fetch protocol:', error);
      return null;
    }
    return data;
  }, []);

  const ensureProtocolRecipientSelection = useCallback(async (protocol: ProtocolWithRecipient) => {
    if (protocol.client_id) {
      if (selectedClient?.id === protocol.client_id) {
        setMode('client');
        setSelectedGroup(null);
        return true;
      }

      const { data, error } = await clientService.getById(protocol.client_id);
      if (error || !data) {
        console.error('Failed to fetch client for protocol:', error);
        return false;
      }

      setMode('client');
      setSelectedGroup(null);
      setSelectedClient(data);
      return true;
    }

    if (protocol.group_id) {
      if (selectedGroup?.id === protocol.group_id) {
        setMode('group');
        setSelectedClient(null);
        return true;
      }

      const { data, error } = await clientService.getGroupById(protocol.group_id);
      if (error || !data) {
        console.error('Failed to fetch group for protocol:', error);
        return false;
      }

      setMode('group');
      setSelectedClient(null);
      setSelectedGroup(data);
      return true;
    }

    return false;
  }, [selectedClient?.id, selectedGroup?.id]);

  const startNewProtocol = useCallback(() => {
    setEntryMode('new');
    setSelectedProtocol(null);
    setImportDialogOpen(false);
    setViewMode('builder');
  }, []);

  const handleNewProtocol = useCallback(() => {
    if (protocols.length > 0) {
      setSelectedImportProtocolId(null);
      setImportDialogOpen(true);
      return;
    }

    startNewProtocol();
  }, [protocols.length, startNewProtocol]);

  const handleEditProtocol = useCallback(async (protocolId: string) => {
    const protocol = await loadProtocolById(protocolId);
    if (!protocol) return;

    setEntryMode('new');
    setSelectedProtocol(protocol);
    setViewMode('builder');
  }, [loadProtocolById]);

  const handleViewProtocol = useCallback(async (protocolId: string) => {
    const protocol = await loadProtocolById(protocolId);
    if (!protocol) return;

    setEntryMode('new');
    setSelectedProtocol(protocol);
    setViewMode('preview');
  }, [loadProtocolById]);

  const handleEditProtocolFromHistory = useCallback(async (protocolId: string) => {
    const protocol = await loadProtocolById(protocolId);
    if (!protocol) return;

    const recipientSelected = await ensureProtocolRecipientSelection(protocol);
    if (!recipientSelected) return;

    setEntryMode('history');
    setSelectedProtocol(protocol);
    setViewMode('builder');
  }, [ensureProtocolRecipientSelection, loadProtocolById]);

  const handleViewProtocolFromHistory = useCallback(async (protocolId: string) => {
    const protocol = await loadProtocolById(protocolId);
    if (!protocol) return;

    const recipientSelected = await ensureProtocolRecipientSelection(protocol);
    if (!recipientSelected) return;

    setEntryMode('history');
    setSelectedProtocol(protocol);
    setViewMode('preview');
  }, [ensureProtocolRecipientSelection, loadProtocolById]);

  const handleDuplicateProtocol = useCallback(async (protocolId: string) => {
    const { data, error } = await protocolService.duplicateProtocol(protocolId);
    if (error || !data) {
      console.error('Failed to duplicate protocol:', error);
      return;
    }

    await fetchProtocols();
    await handleEditProtocol(data.id);
  }, [fetchProtocols, handleEditProtocol]);

  const handleDuplicateProtocolFromHistory = useCallback(async (protocolId: string) => {
    const { data, error } = await protocolService.duplicateProtocol(protocolId);
    if (error || !data) {
      console.error('Failed to duplicate protocol:', error);
      return;
    }

    await fetchHistoryProtocols();
    await handleEditProtocolFromHistory(data.id);
  }, [fetchHistoryProtocols, handleEditProtocolFromHistory]);

  const handleDeleteProtocol = useCallback(async (protocolId: string) => {
    const { error } = await protocolService.deleteProtocol(protocolId);
    if (error) {
      console.error('Failed to delete protocol:', error);
      return;
    }

    await fetchProtocols();
  }, [fetchProtocols]);

  const handleDeleteProtocolFromHistory = useCallback(async (protocolId: string) => {
    const { error } = await protocolService.deleteProtocol(protocolId);
    if (error) {
      console.error('Failed to delete protocol:', error);
      return;
    }

    await Promise.all([
      fetchHistoryProtocols(),
      fetchProtocols(),
    ]);
  }, [fetchHistoryProtocols, fetchProtocols]);

  const importFromSelected = useCallback(async () => {
    if (!selectedImportProtocolId) {
      startNewProtocol();
      return;
    }

    setImportingProtocol(true);
    try {
      const { data, error } = await protocolService.duplicateProtocol(selectedImportProtocolId);
      if (error || !data) {
        console.error('Failed to import protocol:', error);
        startNewProtocol();
        return;
      }

      await fetchProtocols();
      setImportDialogOpen(false);
      await handleEditProtocol(data.id);
    } finally {
      setImportingProtocol(false);
    }
  }, [fetchProtocols, handleEditProtocol, selectedImportProtocolId, startNewProtocol]);

  const handleSaveProtocol = useCallback(async () => {
    if (entryMode === 'history') {
      await Promise.all([
        fetchHistoryProtocols(),
        fetchProtocols(),
      ]);
    } else {
      await fetchProtocols();
    }

    closeDetailView();
  }, [closeDetailView, entryMode, fetchHistoryProtocols, fetchProtocols]);

  const handleCancelBuilder = useCallback(() => {
    closeDetailView();
  }, [closeDetailView]);

  const handleBackToList = useCallback(() => {
    closeDetailView();
  }, [closeDetailView]);

  const actionCards = [
    {
      key: 'new' as const,
      title: 'פרוטוקול חדש',
      description: 'בחירת לקוח או קבוצה, פתיחת טיוטה חדשה או שכפול מפרוטוקול קודם.',
      icon: Sparkles,
      iconClassName: 'bg-blue-100 text-blue-700',
      activeClassName: 'border-blue-300 bg-blue-50 shadow-blue-100/80',
      inactiveClassName: 'border-slate-200 bg-white hover:border-blue-200 hover:bg-blue-50/50',
    },
    {
      key: 'history' as const,
      title: 'היסטוריית פרוטוקולים',
      description: 'צפייה בכל הפרוטוקולים של כל הלקוחות והקבוצות ממקום אחד.',
      icon: History,
      iconClassName: 'bg-amber-100 text-amber-700',
      activeClassName: 'border-amber-300 bg-amber-50 shadow-amber-100/80',
      inactiveClassName: 'border-slate-200 bg-white hover:border-amber-200 hover:bg-amber-50/50',
    },
  ];

  const showNewList = entryMode === 'new' && viewMode === 'list';
  const showHistoryList = entryMode === 'history' && viewMode === 'list';
  const showBuilder = viewMode === 'builder' && isSelected;
  const showPreview = viewMode === 'preview' && !!selectedProtocol;

  return (
    <div className="space-y-6" dir="rtl">
      <div className="rtl:text-right ltr:text-left">
        <div className="mb-2 flex items-center justify-start gap-3">
          <h1 className="text-3xl font-semibold">פרוטוקולים</h1>
          <ScrollText className="h-7 w-7 text-primary" />
        </div>
        <p className="mt-0.5 text-sm italic text-muted-foreground/60">Rock the Minutes</p>
        <p className="text-sm text-gray-600 rtl:text-right">
          ניהול פרוטוקולים של פגישות עם לקוחות וקבוצות
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-slate-100/70 p-4 shadow-sm">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="text-right">
            <p className="text-sm font-semibold text-slate-900">מה תרצה לעשות?</p>
            <p className="mt-1 text-sm text-slate-500">
              אפשר להתחיל פרוטוקול חדש או לפתוח את כל ההיסטוריה של הפרוטוקולים.
            </p>
          </div>

          {entryMode !== 'home' && (
            <Button
              type="button"
              variant="ghost"
              onClick={handleGoHome}
              className="flex items-center gap-2 self-start rounded-full px-4 rtl:flex-row-reverse lg:self-auto"
            >
              <ArrowRight className="h-4 w-4" />
              חזרה למסך הבית
            </Button>
          )}
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          {actionCards.map((card) => {
            const Icon = card.icon;
            const isActive = entryMode === card.key;

            return (
              <button
                key={card.key}
                type="button"
                aria-pressed={isActive}
                onClick={() => handleEntryModeChange(card.key)}
                className={cn(
                  'rounded-2xl border p-4 text-right shadow-sm transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
                  isActive ? card.activeClassName : card.inactiveClassName,
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-base font-semibold text-slate-900">{card.title}</p>
                      {isActive && (
                        <span className="rounded-full bg-white/90 px-2 py-0.5 text-[11px] font-medium text-slate-600">
                          פעיל
                        </span>
                      )}
                    </div>
                    <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
                  </div>
                  <div className={cn('rounded-2xl p-3 shadow-sm', card.iconClassName)}>
                    <Icon className="h-5 w-5" />
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {entryMode === 'home' && (
        <section className="rounded-2xl border border-dashed border-slate-300 bg-slate-50/70 px-6 py-12 text-center">
          <div className="mx-auto flex max-w-xl flex-col items-center gap-3">
            <div className="rounded-full bg-white p-4 shadow-sm">
              <ScrollText className="h-8 w-8 text-slate-500" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900">בחירת פעולה לפני כניסה לעבודה</h2>
            <p className="text-sm leading-6 text-slate-500">
              לחץ על <strong>פרוטוקול חדש</strong> כדי לבחור לקוח או קבוצה, או על
              {' '}
              <strong>היסטוריית פרוטוקולים</strong>
              {' '}
              כדי לראות את כל הפרוטוקולים הקיימים.
            </p>
          </div>
        </section>
      )}

      {entryMode === 'new' && (
        <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="text-right">
              <p className="text-sm font-semibold text-slate-900">פתיחת פרוטוקול חדש</p>
              <p className="mt-1 text-sm text-slate-500">
                בחר לקוח או קבוצה כדי לראות פרוטוקולים קיימים, ליצור חדש או להעתיק מפרוטוקול קודם.
              </p>
            </div>
            {isSelected && (
              <div className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-sm font-medium text-slate-600">
                {getSelectedName()}
              </div>
            )}
          </div>

          <Tabs
            value={mode}
            onValueChange={(value) => {
              setMode(value as SelectionMode);
              if (value === 'client') {
                setSelectedGroup(null);
              } else {
                setSelectedClient(null);
              }
              closeDetailView();
            }}
            dir="rtl"
            className="mt-4 w-full"
          >
            <TabsList className="grid h-auto w-full grid-cols-2 gap-2 bg-transparent p-0">
              <TabsTrigger
                value="client"
                className="flex items-center justify-center gap-2 rounded-xl border border-blue-100 bg-blue-50 py-3 text-sm text-blue-700 data-[state=active]:border-blue-300 data-[state=active]:bg-blue-100 data-[state=active]:font-semibold data-[state=active]:text-blue-900"
              >
                <User className="h-4 w-4" />
                לפי לקוח
              </TabsTrigger>
              <TabsTrigger
                value="group"
                className="flex items-center justify-center gap-2 rounded-xl border border-violet-100 bg-violet-50 py-3 text-sm text-violet-700 data-[state=active]:border-violet-300 data-[state=active]:bg-violet-100 data-[state=active]:font-semibold data-[state=active]:text-violet-900"
              >
                <UsersRound className="h-4 w-4" />
                לפי קבוצה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client" className="mt-3">
              <div className="rounded-2xl border border-blue-100 bg-blue-50/40 px-3 py-3">
                <ClientSelector
                  value={selectedClient?.id || null}
                  onChange={(client) => {
                    setSelectedClient(client);
                    closeDetailView();
                  }}
                  label="בחר לקוח"
                />
              </div>
            </TabsContent>

            <TabsContent value="group" className="mt-3">
              <div className="rounded-2xl border border-violet-100 bg-violet-50/40 px-3 py-3">
                <GroupSelector
                  value={selectedGroup?.id || null}
                  onChange={(group) => {
                    setSelectedGroup(group);
                    closeDetailView();
                  }}
                  label="בחר קבוצה"
                />
              </div>
            </TabsContent>
          </Tabs>

          {!isSelected && viewMode === 'list' && (
            <div className="mt-4 rounded-2xl border border-dashed border-slate-300 bg-slate-50/60 px-6 py-10 text-center">
              <div className="mx-auto flex max-w-md flex-col items-center gap-3">
                <div className="rounded-full bg-white p-3 shadow-sm">
                  <Clock3 className="h-6 w-6 text-slate-500" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900">בחר יעד כדי להתחיל</h2>
                <p className="text-sm leading-6 text-slate-500">
                  בחר {mode === 'client' ? 'לקוח' : 'קבוצה'} מהרשימה כדי לראות את הפרוטוקולים הקיימים
                  ולפתוח פרוטוקול חדש.
                </p>
              </div>
            </div>
          )}
        </section>
      )}

      {showNewList && isSelected && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between gap-4 border-b px-4 py-4">
            <div className="text-right">
              <h2 className="text-lg font-semibold text-slate-900">פרוטוקולים של {getSelectedName()}</h2>
              <p className="mt-1 text-xs text-slate-500">{total} פרוטוקולים</p>
            </div>
            <Button
              onClick={handleNewProtocol}
              disabled={loading}
              className="flex items-center gap-2 rtl:flex-row-reverse"
            >
              <Plus className="h-4 w-4" />
              פרוטוקול חדש
            </Button>
          </div>
          <div className="p-4">
            <ProtocolList
              protocols={protocols}
              loading={loading}
              onEdit={handleEditProtocol}
              onView={handleViewProtocol}
              onDuplicate={handleDuplicateProtocol}
              onDelete={handleDeleteProtocol}
            />
          </div>
        </section>
      )}

      {showHistoryList && (
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="border-b px-4 py-4">
            <div className="text-right">
              <h2 className="text-lg font-semibold text-slate-900">היסטוריית פרוטוקולים</h2>
              <p className="mt-1 text-xs text-slate-500">
                {historyTotal} פרוטוקולים מכל הלקוחות והקבוצות
              </p>
            </div>
          </div>
          <div className="p-4">
            <ProtocolList
              protocols={historyProtocols}
              loading={historyLoading}
              showRecipientColumn
              recipientColumnTitle="שם לקוח / קבוצה"
              showInlineQuickActions
              emptyTitle="אין פרוטוקולים בהיסטוריה"
              emptyDescription="כאן תופיע היסטוריית כל הפרוטוקולים ברגע שייווצרו פרוטוקולים חדשים."
              onEdit={handleEditProtocolFromHistory}
              onView={handleViewProtocolFromHistory}
              onDuplicate={handleDuplicateProtocolFromHistory}
              onDelete={handleDeleteProtocolFromHistory}
            />
          </div>
        </section>
      )}

      {showBuilder && (
        <ProtocolBuilder
          protocol={selectedProtocol}
          clientId={selectedClient?.id || null}
          groupId={selectedGroup?.id || null}
          recipientName={getSelectedName()}
          onSave={handleSaveProtocol}
          onCancel={handleCancelBuilder}
          onDirtyChange={setIsBuilderDirty}
        />
      )}

      {showPreview && selectedProtocol && (
        <ProtocolPreview
          protocol={selectedProtocol}
          onBack={handleBackToList}
          onEdit={() => setViewMode('builder')}
          onDuplicate={() => (
            entryMode === 'history'
              ? handleDuplicateProtocolFromHistory(selectedProtocol.id)
              : handleDuplicateProtocol(selectedProtocol.id)
          )}
        />
      )}

      <Dialog open={importDialogOpen} onOpenChange={setImportDialogOpen}>
        <DialogContent className="rtl:text-right" dir="rtl">
          <DialogHeader>
            <DialogTitle className="rtl:text-right">יצירת פרוטוקול חדש</DialogTitle>
            <DialogDescription className="rtl:text-right">
              האם ברצונך להעתיק נתונים מפרוטוקול קודם?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">בחר פרוטוקול להעתקה:</label>
              <Select
                value={selectedImportProtocolId || ''}
                onValueChange={(value) => setSelectedImportProtocolId(value || null)}
              >
                <SelectTrigger className="rtl:text-right">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {protocols.slice(0, 10).map((protocol) => (
                    <SelectItem key={protocol.id} value={protocol.id}>
                      <div className="flex items-center gap-2">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>
                          {format(new Date(protocol.meeting_date), 'dd/MM/yyyy', { locale: he })}
                          {protocol.title ? ` - ${protocol.title}` : ''}
                        </span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {selectedImportProtocolId && (
                <p className="text-sm text-gray-500 rtl:text-right">
                  משתתפים, החלטות ותוכן יועתקו עם תאריך פגישה חדש
                </p>
              )}
            </div>
          </div>
          <DialogFooter className="flex gap-2 sm:gap-0 rtl:flex-row-reverse">
            <Button
              variant="outline"
              onClick={startNewProtocol}
              className="flex items-center gap-2 rtl:flex-row-reverse"
            >
              <FilePlus className="h-4 w-4" />
              התחל מאפס
            </Button>
            <Button
              onClick={importFromSelected}
              disabled={!selectedImportProtocolId || importingProtocol}
              className="flex items-center gap-2 rtl:flex-row-reverse"
            >
              <FileText className="h-4 w-4" />
              {importingProtocol ? 'מעתיק...' : 'העתק נתונים'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <UnsavedChangesDialog
        open={showInternalNavigationDialog}
        onStay={handleInternalNavigationStay}
        onLeave={handleInternalNavigationLeave}
      />

      <UnsavedChangesDialog
        open={guard.showDialog}
        onStay={guard.cancelLeave}
        onLeave={guard.confirmLeave}
      />
    </div>
  );
}

export default ProtocolsPage;
