import { useState, useEffect } from 'react';
import { 
  Clock, 
  FileText, 
  Send, 
  FolderOpen, 
  Users, 
  Building2, 
  Star, 
  ChevronLeft, 
  ChevronDown,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import type { FolderItem, FolderType } from '../types';
import { clientService } from '@/services/client.service';

interface SidebarProps {
  currentFolder: FolderItem;
  onSelectFolder: (folder: FolderItem) => void;
  className?: string;
}

export function DocumentsSidebar({ currentFolder, onSelectFolder, className }: SidebarProps) {
  const [groups, setGroups] = useState<any[]>([]);
  const [clients, setClients] = useState<any[]>([]);
  const [expandedSections, setExpandedSections] = useState({
    groups: true,
    clients: true
  });
  const [searchTerm, setSearchTerm] = useState('');

  // Load structure
  useEffect(() => {
    const loadStructure = async () => {
      // Load groups
      const { data: groupsData } = await clientService.getGroups();
      if (groupsData) setGroups(groupsData);

      // Load active clients (limit to 50 for sidebar performance)
      const { data: clientsData } = await clientService.getActiveCompanies();
      if (clientsData) setClients(clientsData.slice(0, 50));
    };
    loadStructure();
  }, []);

  const toggleSection = (section: 'groups' | 'clients') => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const navItems = [
    { id: 'recent', type: 'recent', name: 'אחרונים', icon: Clock },
    { id: 'drafts', type: 'drafts', name: 'טיוטות', icon: FileText },
    { id: 'saved', type: 'saved', name: 'שמורים', icon: Star },
    { id: 'sent', type: 'sent', name: 'נשלחו', icon: Send },
  ];

  const filteredGroups = groups.filter(g => 
    g.group_name_hebrew.includes(searchTerm)
  );

  const filteredClients = clients.filter(c => 
    c.company_name.includes(searchTerm)
  );

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

          {/* Clients Section */}
          <div className="space-y-1">
            <button 
              onClick={() => toggleSection('clients')}
              className="flex items-center justify-between w-full px-2 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground transition-colors text-right"
            >
              <span>לקוחות ({filteredClients.length})</span>
              {expandedSections.clients ? <ChevronDown className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
            </button>
            
            {expandedSections.clients && (
              <div className="space-y-0.5 animate-in slide-in-from-top-2 duration-200">
                {filteredClients.map(client => (
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
                      name: client.company_name
                    })}
                  >
                    <span className="truncate">{client.company_name}</span>
                    <Building2 className={cn(
                      "h-4 w-4 shrink-0",
                      currentFolder.id === client.id ? "text-blue-500" : "text-slate-400"
                    )} />
                  </Button>
                ))}
              </div>
            )}
          </div>

        </div>
      </ScrollArea>
    </div>
  );
}
