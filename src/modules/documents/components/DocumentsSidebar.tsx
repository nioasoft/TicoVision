import { useState, useEffect, useMemo } from 'react';
import {
  Clock,
  FileText,
  Send,
  FolderOpen,
  Building2,
  Star,
  ChevronLeft,
  ChevronDown,
  Search,
  Inbox
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { FolderItem, FolderType } from '../types';
import { clientService } from '@/services/client.service';

// Hebrew letter ranges (iPhone-style grouping)
const LETTER_RANGES = [
  { label: 'א-ג', letters: ['א', 'ב', 'ג'] },
  { label: 'ד-ו', letters: ['ד', 'ה', 'ו'] },
  { label: 'ז-ט', letters: ['ז', 'ח', 'ט'] },
  { label: 'י-ל', letters: ['י', 'כ', 'ך', 'ל'] },
  { label: 'מ-נ', letters: ['מ', 'ם', 'נ', 'ן'] },
  { label: 'ס-פ', letters: ['ס', 'ע', 'פ', 'ף'] },
  { label: 'צ-ת', letters: ['צ', 'ץ', 'ק', 'ר', 'ש', 'ת'] },
  { label: 'אחר', letters: [] } // For non-Hebrew names (English, numbers)
];

interface SidebarProps {
  currentFolder: FolderItem;
  onSelectFolder: (folder: FolderItem) => void;
  className?: string;
}

export function DocumentsSidebar({ currentFolder, onSelectFolder, className }: SidebarProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    groups: true
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Load structure
  useEffect(() => {
    const loadStructure = async () => {
      // Load groups
      const { data: groupsData } = await clientService.getGroups();
      if (groupsData) setGroups(groupsData);

      // Load ALL active clients (no limit)
      const { data: clientsData } = await clientService.getActiveCompanies();
      if (clientsData) {
        // Sort alphabetically by Hebrew name
        const sorted = [...clientsData].sort((a, b) => {
          const nameA = a.company_name_hebrew || a.company_name || '';
          const nameB = b.company_name_hebrew || b.company_name || '';
          return nameA.localeCompare(nameB, 'he');
        });
        setClients(sorted);
      }
    };
    loadStructure();
  }, []);

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navItems = [
    { id: 'recent', type: 'recent', name: 'אחרונים', icon: Clock },
    { id: 'drafts', type: 'drafts', name: 'טיוטות', icon: FileText },
    { id: 'saved', type: 'saved', name: 'שמורים', icon: Star },
    { id: 'sent', type: 'sent', name: 'נשלחו', icon: Send },
    { id: 'general', type: 'general', name: 'מכתבים כלליים', icon: Inbox },
  ];

  const filteredGroups = groups.filter(g =>
    g.group_name_hebrew.includes(searchTerm)
  );

  // Filter and group clients by letter range
  const filteredClients = clients.filter(c => {
    const name = c.company_name_hebrew || c.company_name || '';
    return name.includes(searchTerm);
  });

  const groupedClients = useMemo(() => {
    return LETTER_RANGES.map(range => ({
      label: range.label,
      clients: filteredClients.filter(client => {
        const name = client.company_name_hebrew || client.company_name || '';
        const firstLetter = name.charAt(0);
        if (range.letters.length === 0) {
          // "Other" category - check if NOT in any Hebrew range
          return !LETTER_RANGES.slice(0, -1).some(r => r.letters.includes(firstLetter));
        }
        return range.letters.includes(firstLetter);
      })
    })).filter(group => group.clients.length > 0); // Only show non-empty groups
  }, [filteredClients]);

  const totalClients = filteredClients.length;

  return (
    <div className={cn("flex flex-col h-full bg-slate-50/50 border-l", className)} dir="rtl">
      {/* Search Header */}
      <div className="p-4">
        <div className="relative">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="חיפוש תיקייה..."
            className="pl-9 pr-3 bg-white shadow-sm text-right"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 px-2">
        <div className="space-y-6 pb-6">
          
          {/* Main Navigation */}
          <div className="space-y-1">
            <h3 className="px-2 text-xs font-semibold text-muted-foreground mb-2 text-right">גישה מהירה</h3>
            {navItems.map((item) => (
              <Button
                key={item.id}
                variant={currentFolder.id === item.id ? "secondary" : "ghost"}
                className={cn(
                  "w-full justify-start gap-2 h-9 font-normal text-right",
                  currentFolder.id === item.id && "bg-blue-100/50 text-blue-700 hover:bg-blue-100"
                )}
                onClick={() => onSelectFolder({ id: item.id, type: item.type as FolderType, name: item.name })}
              >
                <item.icon className="h-4 w-4 text-slate-500" />
                {item.name}
              </Button>
            ))}
          </div>

          <Separator />

          {/* Groups Section */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('groups')}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors text-right"
            >
              <span>קבוצות ({filteredGroups.length})</span>
              {expandedSections.groups ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
            
            {expandedSections.groups && (
              <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                {filteredGroups.map(group => (
                  <Button
                    key={group.id}
                    variant="ghost"
                    className={cn(
                      "w-full justify-start gap-2 h-8 text-sm font-normal px-2",
                      currentFolder.id === group.id && "bg-blue-100/50 text-blue-700"
                    )}
                    onClick={() => onSelectFolder({
                      id: group.id,
                      type: 'group',
                      name: group.group_name_hebrew
                    })}
                  >
                    <span className="truncate">{group.group_name_hebrew}</span>
                    <FolderOpen className={cn(
                      "h-4 w-4 shrink-0",
                      currentFolder.id === group.id ? "text-blue-500 fill-blue-100" : "text-slate-400"
                    )} />
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Clients Section - Grouped by Letter Range */}
          <div className="space-y-1">
            <h3 className="px-2 text-xs font-semibold text-muted-foreground mb-2 text-right">
              לקוחות ({totalClients})
            </h3>

            {groupedClients.map(group => (
              <div key={group.label} className="space-y-0.5">
                <button
                  onClick={() => toggleSection(`clients-${group.label}`)}
                  className="flex items-center justify-between w-full px-2 py-1 text-xs font-medium text-slate-600 hover:text-foreground transition-colors text-right bg-slate-100/50 rounded"
                >
                  <span>{group.label} ({group.clients.length})</span>
                  {expandedSections[`clients-${group.label}`] !== false ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
                </button>

                {expandedSections[`clients-${group.label}`] !== false && (
                  <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200 mr-2">
                    {group.clients.map(client => (
                      <Button
                        key={client.id}
                        variant="ghost"
                        className={cn(
                          "w-full justify-start gap-2 h-8 text-sm font-normal px-2",
                          currentFolder.id === client.id && "bg-blue-100/50 text-blue-700"
                        )}
                        onClick={() => onSelectFolder({
                          id: client.id,
                          type: 'client',
                          name: client.company_name_hebrew || client.company_name
                        })}
                      >
                        <span className="truncate">{client.company_name_hebrew || client.company_name}</span>
                        <Building2 className={cn(
                          "h-4 w-4 shrink-0",
                          currentFolder.id === client.id ? "text-blue-500" : "text-slate-400"
                        )} />
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
