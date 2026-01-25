import { useState } from 'react';
import {
  LayoutGrid,
  List as ListIcon,
  ChevronRight,
  ArrowUpDown,
  Filter,
  FileText,
  Search,
  X
} from 'lucide-react';
import type { DocFile, ViewMode, FolderItem } from '../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { FileCard } from './FileCard';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';

interface DocumentsViewProps {
  currentFolder: FolderItem;
  documents: DocFile[];
  isLoading: boolean;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
  selectedFileId: string | null;
  onSelectFile: (file: DocFile) => void;
  searchQuery: string;
  onSearchChange: (query: string) => void;
}

export function DocumentsView({
  currentFolder,
  documents,
  isLoading,
  viewMode,
  onViewModeChange,
  selectedFileId,
  onSelectFile,
  searchQuery,
  onSearchChange
}: DocumentsViewProps) {
  const [sortField, setSortField] = useState<'date' | 'name'>('date');

  // Sorting logic
  const sortedDocs = [...documents].sort((a, b) => {
    if (sortField === 'date') {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
    return a.title.localeCompare(b.title);
  });

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Top Bar: Breadcrumbs & Actions */}
      <div className="flex items-center justify-between px-6 py-4 border-b">
        {/* Breadcrumbs */}
        <div className="flex items-center text-sm text-slate-500">
          <span className="hover:text-slate-900 cursor-pointer">מסמכים</span>
          <ChevronRight className="h-4 w-4 mx-1" />
          {searchQuery ? (
            <>
              <span className="font-semibold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-md flex items-center gap-1">
                <Search className="h-3.5 w-3.5" />
                תוצאות חיפוש
              </span>
              <span className="text-xs text-slate-400 mr-2">
                ({documents.length} תוצאות)
              </span>
            </>
          ) : (
            <>
              <span className="font-semibold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md">
                {currentFolder.name}
              </span>
              <span className="text-xs text-slate-400 mr-2">
                ({documents.length} פריטים)
              </span>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          {/* Search Input */}
          <div className="relative">
            <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <Input
              type="text"

              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
              className="w-[220px] h-8 text-sm pr-8 pl-8 text-right"
              dir="rtl"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="sm"
                className="absolute left-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
                onClick={() => onSearchChange('')}
              >
                <X className="h-3.5 w-3.5 text-slate-400" />
              </Button>
            )}
          </div>

          <div className="h-4 w-px bg-slate-200" />

          {/* Sort Dropdown */}
          <Select value={sortField} onValueChange={(v: any) => setSortField(v)}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="date">תאריך (חדש ישן)</SelectItem>
              <SelectItem value="name">שם (א-ת)</SelectItem>
            </SelectContent>
          </Select>

          <div className="h-4 w-px bg-slate-200 mx-1" />

          {/* View Toggle */}
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'grid' && "bg-white shadow-sm")}
              onClick={() => onViewModeChange('grid')}
            >
              <LayoutGrid className="h-4 w-4 text-slate-600" />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className={cn("h-7 w-7 p-0 rounded-md", viewMode === 'list' && "bg-white shadow-sm")}
              onClick={() => onViewModeChange('list')}
            >
              <ListIcon className="h-4 w-4 text-slate-600" />
            </Button>
          </div>
        </div>
      </div>

      {/* Content Area */}
      <ScrollArea className="flex-1 bg-slate-50/30 p-6">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
          </div>
        ) : sortedDocs.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
             <div className="bg-slate-100 p-6 rounded-full mb-4">
                <Filter className="h-8 w-8 text-slate-300" />
             </div>
             <p>אין מסמכים להצגה בתיקייה זו</p>
          </div>
        ) : viewMode === 'grid' ? (
          /* Grid View */
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {sortedDocs.map((doc) => (
              <FileCard
                key={doc.id}
                file={doc}
                selected={selectedFileId === doc.id}
                onSelect={onSelectFile}
                onDoubleClick={() => window.open(`/letters/view/${doc.id}`, '_blank')}
              />
            ))}
          </div>
        ) : (
          /* List View */
          <div className="bg-white rounded-lg border shadow-sm divide-y" dir="rtl">
            <div className="grid grid-cols-12 gap-4 px-4 py-3 bg-slate-50 text-xs font-medium text-slate-500 rounded-t-lg text-right">
              <div className="col-span-4">שם המסמך</div>
              <div className="col-span-3">לקוח/קבוצה</div>
              <div className="col-span-2">סטטוס</div>
              <div className="col-span-2">תאריך</div>
              <div className="col-span-1"></div>
            </div>
            {sortedDocs.map((doc) => (
              <div 
                key={doc.id}
                className={cn(
                  "grid grid-cols-12 gap-4 px-4 py-3 text-sm items-center hover:bg-slate-50 cursor-pointer transition-colors text-right",
                  selectedFileId === doc.id && "bg-blue-50/50 hover:bg-blue-50"
                )}
                onClick={() => onSelectFile(doc)}
                onDoubleClick={() => window.open(`/letters/view/${doc.id}`, '_blank')}
              >
                <div className="col-span-4 font-medium text-slate-700 flex items-center gap-2 overflow-hidden">
                  <FileText className="h-4 w-4 text-red-400 flex-shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </div>
                <div className="col-span-3 text-slate-500 truncate">
                   {doc.clientName}
                   {doc.groupName && <span className="text-xs text-slate-400 mr-1">({doc.groupName})</span>}
                </div>
                <div className="col-span-2">
                   {doc.status === 'draft' && <Badge variant="outline" className="text-xs bg-orange-50 text-orange-600 border-orange-200">טיוטה</Badge>}
                   {doc.status === 'saved' && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-600 border-blue-200">נשמר</Badge>}
                   {doc.status.startsWith('sent') && <Badge variant="outline" className="text-xs bg-green-50 text-green-600 border-green-200">נשלח</Badge>}
                </div>
                <div className="col-span-2 text-slate-500 text-xs">
                  {format(new Date(doc.createdAt), 'dd/MM/yyyy HH:mm')}
                </div>
                <div className="col-span-1 text-left">
                  <Button variant="ghost" size="icon" className="h-6 w-6">
                    <ChevronRight className="h-4 w-4 text-slate-300 rotate-180" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
}
