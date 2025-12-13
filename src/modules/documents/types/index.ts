export type ViewMode = 'grid' | 'list';

export type FolderType = 'recent' | 'drafts' | 'sent' | 'saved' | 'group' | 'client' | 'category';

export interface FolderItem {
  id: string;
  type: FolderType;
  name: string;
  icon?: any;
  count?: number;
  parentId?: string;
}

export interface DocFile {
  id: string;
  title: string; // The computed display name: Date - Client - Subject
  subject: string;
  clientName: string;
  groupName?: string;
  createdAt: string;
  status: 'draft' | 'saved' | 'sent_email' | 'sent_whatsapp' | 'sent_print';
  type: 'pdf' | 'docx'; // For icon selection
  url?: string; // Link to view/download
  previewUrl?: string; // Optional thumbnail
  size?: string;
  author?: string;
  rawLetter: any; // The original letter object from DB
}

export interface DocumentsState {
  currentFolder: FolderItem;
  viewMode: ViewMode;
  selectedFileId: string | null;
  searchQuery: string;
}