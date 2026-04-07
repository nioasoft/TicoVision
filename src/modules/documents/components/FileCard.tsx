import { format } from 'date-fns';
import { FileText, MoreHorizontal } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { DocFile } from '../types';
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
        "group relative flex cursor-pointer flex-col rounded-xl border p-3 transition-all hover:shadow-md",
        selected 
          ? "border-primary/20 bg-primary/5 ring-1 ring-primary/15 shadow-sm" 
          : "border-slate-100 bg-white hover:border-primary/15"
      )}
      onClick={() => onSelect(file)}
      onDoubleClick={() => onDoubleClick(file)}
    >
      {/* Icon Area */}
      <div className="relative mb-3 flex aspect-[1/1.2] items-center justify-center overflow-hidden rounded-lg border border-slate-100 bg-slate-50">
        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
           <Button variant="ghost" size="icon" aria-label="אפשרויות קובץ" className="h-6 w-6 rounded-full bg-white/80 shadow-sm">
             <MoreHorizontal className="h-3 w-3" />
           </Button>
        </div>
        <FileText className="h-10 w-10 text-primary/70 drop-shadow-sm" />
        
        {/* Status Badge overlay */}
        <div className="absolute bottom-2 left-2">
            {file.status === 'draft' && <div className="h-2 w-2 rounded-full bg-orange-400" />}
            {file.status.startsWith('sent') && <div className="h-2 w-2 rounded-full bg-primary" />}
            {file.status === 'saved' && <div className="h-2 w-2 rounded-full bg-primary/70" />}
        </div>
      </div>

      {/* Content */}
      <div className="space-y-1 text-right">
        <h4 className="line-clamp-2 text-sm font-medium leading-tight text-slate-700 group-hover:text-primary">
          {file.title}
        </h4>
        <p className="text-xs text-slate-400">
          {format(new Date(file.createdAt), 'dd/MM/yyyy')}
        </p>
      </div>
    </div>
  );
}
