import { useState, useEffect, useCallback } from 'react';
import { letterHistoryService, LetterHistoryFilters } from '@/services/letter-history.service';
import { DocFile, FolderItem } from '../types';

export function useDocuments(currentFolder: FolderItem) {
  const [documents, setDocuments] = useState<DocFile[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const filters: LetterHistoryFilters = {};

      // Map folder type to API filters
      switch (currentFolder.type) {
        case 'recent':
          // No filter, just sort by date desc
          break;
        case 'drafts':
          filters.status = 'draft';
          break;
        case 'saved':
          filters.status = 'saved';
          break;
        case 'sent':
          filters.status = ['sent_email', 'sent_whatsapp', 'sent_print'];
          break;
        case 'client':
          filters.clientId = currentFolder.id;
          break;
        case 'group':
          filters.groupId = currentFolder.id;
          break;
      }

      const { data } = await letterHistoryService.getAllLetters(
        filters,
        { page: 1, pageSize: 100 }, // Load first 100 for now
        { field: 'created_at', direction: 'desc' }
      );

      // Transform to DocFile format
      const docs: DocFile[] = data.map(letter => {
        // Compute display title: Date - Client - Subject
        const date = new Date(letter.created_at).toLocaleDateString('he-IL');
        const clientName = letter.client_name || letter.company_name || 'ללא שם';
        const title = `${date} - ${clientName} - ${letter.subject || 'ללא נושא'}`;

        // Determine type based on PDF existence
        const type = 'pdf'; 

        // Map status
        let status: DocFile['status'] = 'draft';
        if (letter.status === 'sent_email') status = 'sent_email';
        if (letter.status === 'sent_whatsapp') status = 'sent_whatsapp';
        if (letter.status === 'sent_print') status = 'sent_print';
        if (letter.status === 'saved') status = 'saved';
        if (letter.status === 'draft') status = 'draft';

        return {
          id: letter.id,
          title,
          subject: letter.subject || '',
          clientName: clientName,
          groupName: letter.group_name_hebrew,
          createdAt: letter.created_at,
          status,
          type,
          url: letter.pdf_url, // Assuming service returns this or we construct it
          author: letter.created_by,
          rawLetter: letter
        };
      });

      setDocuments(docs);
    } catch (err) {
      console.error('Error fetching documents:', err);
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  }, [currentFolder]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  return { documents, isLoading, error, refresh: fetchDocuments };
}
