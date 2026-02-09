/**
 * ClientFilesTab - Display files organized by category
 */

import { FileDisplayWidget } from '@/components/files/FileDisplayWidget';

interface ClientFilesTabProps {
  clientId: string;
}

const FILE_CATEGORIES = [
  { key: 'company_registry', label: 'רשם החברות' },
  { key: 'financial_report', label: 'דו"ח כספי מבוקר אחרון' },
  { key: 'bookkeeping_card', label: 'כרטיסי הנהח"ש אצלנו' },
  { key: 'quote_invoice', label: 'הצעות מחיר / תעודות חיוב' },
  { key: 'payment_proof_2026', label: 'אסמכתאות תשלום 2026' },
  { key: 'holdings_presentation', label: 'מצגת החזקות' },
  { key: 'general', label: 'כללי' },
  { key: 'foreign_worker_docs', label: 'אישורי עובדים זרים' },
  { key: 'protocols', label: 'פרוטוקולים' },
  { key: 'agreements', label: 'הסכמים' },
] as const;

export const ClientFilesTab: React.FC<ClientFilesTabProps> = ({ clientId }) => {
  return (
    <div className="space-y-4">
      {FILE_CATEGORIES.map(({ key, label }) => (
        <div key={key} className="space-y-1">
          <h3 className="text-sm font-medium text-muted-foreground">{label}</h3>
          <FileDisplayWidget
            clientId={clientId}
            category={key}
            variant="compact"
          />
        </div>
      ))}
    </div>
  );
};
