import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { 
  FileText, 
  Calendar, 
  User, 
  Download, 
  Send, 
  Printer, 
  Edit,
  Trash2,
  ExternalLink,
  Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { DocFile } from '../types';

interface DocumentPreviewProps {
  file: DocFile | null;
  onEdit: (file: DocFile) => void;
  onDelete: (file: DocFile) => void;
  onSend: (file: DocFile) => void;
  onDownload: (file: DocFile) => void;
}

export function DocumentPreview({ file, onEdit, onDelete, onSend, onDownload }: DocumentPreviewProps) {
  if (!file) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-muted-foreground p-8 text-center bg-slate-50/50">
        <div className="bg-slate-100 p-4 rounded-full mb-4">
          <FileText className="h-8 w-8 text-slate-300" />
        </div>
        <p>בחר מסמך לצפייה בפרטים</p>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'sent_email':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">נשלח במייל</Badge>;
      case 'sent_whatsapp':
        return <Badge className="bg-green-100 text-green-700 hover:bg-green-100 border-green-200">נשלח בוואטסאפ</Badge>;
      case 'saved':
        return <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100 border-blue-200">נשמר</Badge>;
      default:
        return <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">טיוטה</Badge>;
    }
  };

  return (
    <div className="h-full flex flex-col bg-slate-50/30 border-r">
      {/* Header */}
      <div className="p-4 border-b bg-white/50 backdrop-blur-sm">
        <div className="flex items-start justify-between gap-4">
          <div className="bg-red-50 p-3 rounded-lg border border-red-100">
            <FileText className="h-6 w-6 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-sm leading-tight break-words mb-1">
              {file.subject}
            </h3>
            <p className="text-xs text-muted-foreground truncate">{file.title}</p>
          </div>
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-4 space-y-6">
          
          {/* Status & Actions */}
          <div className="flex items-center justify-between">
            {getStatusBadge(file.status)}
            
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => onDownload(file)} title="הורד">
                <Download className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`/letters/view/${file.id}`, '_blank')} title="הצג">
                <ExternalLink className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Preview Thumbnail */}
          <div className="aspect-[1/1.41] bg-white rounded-lg border shadow-sm flex items-center justify-center relative group overflow-hidden cursor-pointer"
               onClick={() => window.open(`/letters/view/${file.id}`, '_blank')}>
            <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
               <FileText className="h-16 w-16 text-slate-300" />
               <div className="absolute inset-0 flex items-center justify-center bg-black/5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="secondary" size="sm" className="gap-2">
                    <Eye className="h-4 w-4" />
                    הצג מסמך
                  </Button>
               </div>
            </div>
          </div>

          <Separator />

          {/* Meta Data */}
          <div className="space-y-4 text-sm">
            <div className="grid grid-cols-2 gap-y-4">
              <div className="col-span-2">
                <label className="text-xs text-muted-foreground block mb-1">לקוח</label>
                <div className="flex items-center gap-2">
                  <Building2 className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-medium">{file.clientName}</span>
                </div>
              </div>

              {file.groupName && (
                <div className="col-span-2">
                  <label className="text-xs text-muted-foreground block mb-1">קבוצה</label>
                  <div className="flex items-center gap-2">
                    <Users className="h-3.5 w-3.5 text-slate-400" />
                    <span>{file.groupName}</span>
                  </div>
                </div>
              )}

              <div>
                <label className="text-xs text-muted-foreground block mb-1">נוצר בתאריך</label>
                <div className="flex items-center gap-2">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span>{format(new Date(file.createdAt), 'dd/MM/yyyy')}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-muted-foreground block mb-1">נוצר ע"י</label>
                <div className="flex items-center gap-2">
                  <User className="h-3.5 w-3.5 text-slate-400" />
                  <span>מערכת</span>
                </div>
              </div>
            </div>
          </div>

          <Separator />

          {/* Primary Actions */}
          <div className="grid grid-cols-2 gap-2">
            <Button className="w-full gap-2" variant="default" onClick={() => onEdit(file)}>
              <Edit className="h-4 w-4" />
              ערוך
            </Button>
            <Button className="w-full gap-2" variant="outline" onClick={() => onSend(file)}>
              <Send className="h-4 w-4" />
              שלח
            </Button>
          </div>
           
           {/* Danger Zone */}
           <div className="pt-4">
            <Button variant="ghost" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50 gap-2" onClick={() => onDelete(file)}>
              <Trash2 className="h-4 w-4" />
              מחק מסמך
            </Button>
           </div>

        </div>
      </ScrollArea>
    </div>
  );
}
