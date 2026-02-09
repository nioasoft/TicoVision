/**
 * ClientProfileHeader - Client identity card at the top of the profile
 */

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowRight, Pencil, FolderOpen, Palette } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { formatIsraeliTaxId } from '@/lib/validators';
import { Form1214Indicator } from './Form1214Indicator';
import type { Client } from '@/services';

interface ClientProfileHeaderProps {
  client: Client;
  onEdit: () => void;
}

const CLIENT_TYPE_LABELS: Record<string, string> = {
  company: 'חברה',
  freelancer: 'עצמאי',
  salary_owner: 'שכיר בעל שליטה',
  partnership: 'שותפות',
  nonprofit: 'עמותה',
};

const STATUS_VARIANT: Record<string, 'default' | 'secondary' | 'outline' | 'destructive'> = {
  active: 'default',
  inactive: 'destructive',
  pending: 'secondary',
  adhoc: 'outline',
};

const STATUS_LABELS: Record<string, string> = {
  active: 'פעיל',
  inactive: 'לא פעיל',
  pending: 'ממתין',
  adhoc: 'מזדמן',
};

export const ClientProfileHeader: React.FC<ClientProfileHeaderProps> = ({ client, onEdit }) => {
  const navigate = useNavigate();

  return (
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8"
            onClick={() => navigate('/clients')}
          >
            <ArrowRight className="h-4 w-4" />
          </Button>
          <h1 className="text-2xl font-bold tracking-tight">{client.company_name}</h1>
          {client.commercial_name && (
            <span className="text-lg text-muted-foreground">({client.commercial_name})</span>
          )}
          <Badge variant={STATUS_VARIANT[client.status] || 'secondary'}>
            {STATUS_LABELS[client.status] || client.status}
          </Badge>
        </div>

        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>ח.פ. {formatIsraeliTaxId(client.tax_id)}</span>
          <span>{CLIENT_TYPE_LABELS[client.client_type] || client.client_type}</span>
          {client.group && (
            <Badge variant="outline">{client.group.group_name_hebrew}</Badge>
          )}
          <Form1214Indicator taxCoding={client.tax_coding} />
        </div>
      </div>

      <div className="flex items-center gap-2">
        {client.google_drive_link && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(client.google_drive_link, '_blank')}
          >
            <FolderOpen className="h-4 w-4 ml-1.5 text-green-600" />
            Drive
          </Button>
        )}
        {client.canva_link && (
          <Button
            variant="outline"
            size="sm"
            onClick={() => window.open(client.canva_link, '_blank')}
          >
            <Palette className="h-4 w-4 ml-1.5 text-purple-600" />
            Canva
          </Button>
        )}
        <Button size="sm" onClick={onEdit}>
          <Pencil className="h-4 w-4 ml-1.5" />
          עריכה
        </Button>
      </div>
    </div>
  );
};
