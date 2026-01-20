/**
 * ProtocolsPage
 * Main page for managing meeting protocols with clients or client groups
 * Access: admin, accountant
 *
 * Layout: Client/Group selector at top, then protocol list or builder below
 */

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { ClientSelector } from '@/components/ClientSelector';
import { GroupSelector } from '@/components/GroupSelector';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
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
import { ScrollText, User, Users, Plus, FileText, FilePlus } from 'lucide-react';
import { ProtocolList } from '../components/ProtocolList';
import { ProtocolBuilder } from '../components/ProtocolBuilder';
import { ProtocolPreview } from '../components/ProtocolPreview';
import { protocolService } from '../services/protocol.service';
import type { Client, ClientGroup } from '@/services/client.service';
import type { Protocol, ProtocolWithRelations } from '../types/protocol.types';

type ViewMode = 'list' | 'builder' | 'preview';

export function ProtocolsPage() {
  const [mode, setMode] = useState<'client' | 'group'>('client');
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [selectedGroup, setSelectedGroup] = useState<ClientGroup | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('list');
  const [selectedProtocol, setSelectedProtocol] = useState<ProtocolWithRelations | null>(null);
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState(0);

  // Import dialog state
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [selectedImportProtocolId, setSelectedImportProtocolId] = useState<string | null>(null);
  const [importingProtocol, setImportingProtocol] = useState(false);

  const isSelected = mode === 'client' ? !!selectedClient : !!selectedGroup;

  const getSelectedName = () => {
    if (mode === 'client' && selectedClient) {
      return selectedClient.company_name_hebrew || selectedClient.company_name;
    }
    if (mode === 'group' && selectedGroup) {
      return selectedGroup.group_name_hebrew;
    }
    return '';
  };

  // Fetch protocols when client/group changes
  const fetchProtocols = useCallback(async () => {
    if (!isSelected) return;

    setLoading(true);
    try {
      const { data, error } = await protocolService.getProtocols({
        clientId: selectedClient?.id,
        groupId: selectedGroup?.id,
      });

      if (error) {
        console.error('Failed to fetch protocols:', error);
        return;
      }

      if (data) {
        setProtocols(data.protocols);
        setTotal(data.total);
      }
    } finally {
      setLoading(false);
    }
  }, [selectedClient?.id, selectedGroup?.id, isSelected]);

  useEffect(() => {
    fetchProtocols();
  }, [fetchProtocols]);

  // Handle creating a new protocol
  const handleNewProtocol = () => {
    if (protocols.length > 0) {
      // Has previous protocols - show import dialog
      setSelectedImportProtocolId(null);
      setImportDialogOpen(true);
    } else {
      // No previous protocols - go directly to builder
      startNewProtocol();
    }
  };

  // Start a new protocol from scratch
  const startNewProtocol = () => {
    setSelectedProtocol(null);
    setImportDialogOpen(false);
    setViewMode('builder');
  };

  // Import data from a selected protocol
  const importFromSelected = async () => {
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
      // Refresh list and open the imported protocol
      await fetchProtocols();
      setImportDialogOpen(false);
      handleEditProtocol(data.id);
    } finally {
      setImportingProtocol(false);
    }
  };

  // Handle editing an existing protocol
  const handleEditProtocol = async (protocolId: string) => {
    const { data, error } = await protocolService.getProtocolById(protocolId);
    if (error || !data) {
      console.error('Failed to fetch protocol:', error);
      return;
    }
    setSelectedProtocol(data);
    if (data.status === 'locked') {
      setViewMode('preview');
    } else {
      setViewMode('builder');
    }
  };

  // Handle viewing a locked protocol
  const handleViewProtocol = async (protocolId: string) => {
    const { data, error } = await protocolService.getProtocolById(protocolId);
    if (error || !data) {
      console.error('Failed to fetch protocol:', error);
      return;
    }
    setSelectedProtocol(data);
    setViewMode('preview');
  };

  // Handle duplicating a protocol
  const handleDuplicateProtocol = async (protocolId: string) => {
    const { data, error } = await protocolService.duplicateProtocol(protocolId);
    if (error || !data) {
      console.error('Failed to duplicate protocol:', error);
      return;
    }
    // Refresh list and open the duplicated protocol
    await fetchProtocols();
    handleEditProtocol(data.id);
  };

  // Handle deleting a protocol
  const handleDeleteProtocol = async (protocolId: string) => {
    const { error } = await protocolService.deleteProtocol(protocolId);
    if (error) {
      console.error('Failed to delete protocol:', error);
      return;
    }
    await fetchProtocols();
  };

  // Handle saving from builder
  const handleSaveProtocol = async () => {
    await fetchProtocols();
    setViewMode('list');
    setSelectedProtocol(null);
  };

  // Handle cancel from builder
  const handleCancelBuilder = () => {
    setViewMode('list');
    setSelectedProtocol(null);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="text-right">
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-bold">פרוטוקולים</h1>
          <ScrollText className="h-8 w-8 text-primary" />
        </div>
        <p className="text-gray-600">
          ניהול פרוטוקולים של פגישות עם לקוחות
        </p>
      </div>

      {/* Selection Mode & Search */}
      <Card>
        <CardHeader>
          <CardTitle className="text-right">בחירה</CardTitle>
          <CardDescription className="text-right">
            בחר אם ברצונך לנהל פרוטוקולים עבור לקוח בודד או קבוצת לקוחות
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs
            value={mode}
            onValueChange={(v) => {
              setMode(v as 'client' | 'group');
              // Reset selections when switching modes
              if (v === 'client') setSelectedGroup(null);
              else setSelectedClient(null);
              setViewMode('list');
              setSelectedProtocol(null);
            }}
            dir="rtl"
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-2 mb-6">
              <TabsTrigger value="client" className="flex items-center gap-2">
                <User className="h-4 w-4" />
                לפי לקוח
              </TabsTrigger>
              <TabsTrigger value="group" className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                לפי קבוצה
              </TabsTrigger>
            </TabsList>

            <TabsContent value="client">
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                <ClientSelector
                  value={selectedClient?.id || null}
                  onChange={(client) => {
                    setSelectedClient(client);
                    setViewMode('list');
                    setSelectedProtocol(null);
                  }}
                  label="בחר לקוח"
                  placeholder="חפש לקוח לפי שם או ח.פ..."
                />
              </div>
            </TabsContent>

            <TabsContent value="group">
              <div className="bg-yellow-100 border-2 border-yellow-400 rounded-lg p-4">
                <GroupSelector
                  value={selectedGroup?.id || null}
                  onChange={(group) => {
                    setSelectedGroup(group);
                    setViewMode('list');
                    setSelectedProtocol(null);
                  }}
                  label="בחר קבוצה"
                  placeholder="חפש קבוצה לפי שם..."
                />
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* Main Content */}
      {isSelected ? (
        viewMode === 'list' ? (
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between flex-row-reverse">
                <Button onClick={handleNewProtocol} className="flex items-center gap-2 flex-row-reverse">
                  <Plus className="h-4 w-4" />
                  פרוטוקול חדש
                </Button>
                <div className="text-right">
                  <CardTitle>
                    פרוטוקולים - {getSelectedName()}
                  </CardTitle>
                  <CardDescription className="mt-1">
                    {total} פרוטוקולים
                  </CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <ProtocolList
                protocols={protocols}
                loading={loading}
                onEdit={handleEditProtocol}
                onView={handleViewProtocol}
                onDuplicate={handleDuplicateProtocol}
                onDelete={handleDeleteProtocol}
              />
            </CardContent>
          </Card>
        ) : viewMode === 'builder' ? (
          <ProtocolBuilder
            protocol={selectedProtocol}
            clientId={selectedClient?.id || null}
            groupId={selectedGroup?.id || null}
            recipientName={getSelectedName()}
            onSave={handleSaveProtocol}
            onCancel={handleCancelBuilder}
          />
        ) : (
          <ProtocolPreview
            protocol={selectedProtocol!}
            onBack={() => setViewMode('list')}
            onEdit={() => setViewMode('builder')}
            onDuplicate={() => selectedProtocol && handleDuplicateProtocol(selectedProtocol.id)}
          />
        )
      ) : (
        <Card>
          <CardContent className="py-16">
            <div className="text-center">
              <ScrollText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">
                בחר {mode === 'client' ? 'לקוח' : 'קבוצה'} להתחלה
              </h3>
              <p className="text-gray-500">
                בחר {mode === 'client' ? 'לקוח' : 'קבוצה'} מהרשימה למעלה כדי לצפות ולנהל את הפרוטוקולים
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Import Protocol Dialog */}
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
                  <SelectValue placeholder="בחר פרוטוקול קודם..." />
                </SelectTrigger>
                <SelectContent>
                  {protocols.slice(0, 10).map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      <div className="flex items-center gap-2 rtl:flex-row-reverse">
                        <FileText className="h-4 w-4 text-gray-400" />
                        <span>
                          {format(new Date(p.meeting_date), 'dd/MM/yyyy', { locale: he })}
                          {p.title ? ` - ${p.title}` : ''}
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
    </div>
  );
}

export default ProtocolsPage;
