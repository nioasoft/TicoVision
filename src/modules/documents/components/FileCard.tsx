import { format } from 'date-fns';
import { FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import { DocFile } from '../types';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface FileCardProps {
  file: DocFile;
  selected: boolean;
  onSelect: (file: DocFile) => void;
  onDoubleClick: (file: DocFile) => void;
}

export function FileCard({ file, selected, onSelect, onDoubleClick }: FileCardProps) {
  return (
    <div 
      className={cn(
        "group relative flex flex-col p-3 rounded-xl border transition-all cursor-pointer hover:shadow-md",
        selected 
          ? "bg-blue-50/50 border-blue-200 ring-1 ring-blue-200 shadow-sm" 
          : "bg-white border-slate-100 hover:border-blue-100"
      )}
      onClick={() => onSelect(file)}
      onDoubleClick={() => onDoubleClick(file)}
    >
      {/* Icon Area */}
      <div className="aspect-[1/1.2] mb-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-center relative overflow-hidden">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full bg-white/80 shadow-sm">
             <MoreHorizontal className="h-3 w-3" />
           </Button>
        </div>
        <FileText className="h-10 w-10 text-red-400 drop-shadow-sm" />
        
        {/* Status Badge overlay */}
        <div className="absolute bottom-2 left-2">
            {file.status === 'draft' && <div className="h-2 w-2 rounded-full bg-orange-400" />}
            {file.status.startsWith('sent') && <div className="h-2 w-2 rounded-full bg-green-500" />}
            {file.status === 'saved' && <div className="h-2 w-2 rounded-full bg-blue-500" />}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1">
        <h4 className="text-sm font-medium leading-tight line-clamp-2 text-slate-700 group-hover:text-blue-700">
          {file.subject}
        </h4>
        <p className="text-xs text-slate-400">
          {format(new Date(file.createdAt), 'dd/MM/yyyy')}
        </p>
      </div>
    </div>
  );
}
