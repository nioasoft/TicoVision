/**
 * WhatsApp Reminder Button Component
 * Opens WhatsApp with pre-filled reminder message
 */

import { Button } from '@/components/ui/button';
import { MessageCircle } from 'lucide-react';
import { capitalDeclarationService } from '@/services/capital-declaration.service';
import type { DeclarationWithCounts } from '@/types/capital-declaration.types';
import { cn } from '@/lib/utils';

interface WhatsAppReminderButtonProps {
  declaration: DeclarationWithCounts;
  variant?: 'default' | 'ghost' | 'outline';
  size?: 'default' | 'sm' | 'icon';
  showLabel?: boolean;
  className?: string;
  tenantName?: string;
  onCommunicationLogged?: () => void;
}

export function WhatsAppReminderButton({
  declaration,
  variant = 'outline',
  size = 'default',
  showLabel = true,
  className,
  tenantName = '',
  onCommunicationLogged,
}: WhatsAppReminderButtonProps) {
  const phone = declaration.contact_phone || declaration.contact_phone_secondary;

  if (!phone) {
    return null;
  }

  const portalLink = capitalDeclarationService.getPortalLink(declaration.public_token);

  // Use assigned accountant name from declaration
  const assignedAccountantName = declaration.assigned_to_name;

  const whatsappLink = capitalDeclarationService.generateWhatsAppLink(
    phone,
    declaration.contact_name,
    declaration.tax_year,
    portalLink,
    tenantName,
    assignedAccountantName
  );

  const handleClick = async () => {
    // Open WhatsApp
    window.open(whatsappLink, '_blank');

    // Log the communication
    try {
      await capitalDeclarationService.logCommunication({
        declaration_id: declaration.id,
        communication_type: 'whatsapp',
        direction: 'outbound',
        subject: `הודעת WhatsApp - תזכורת הצהרת הון ${declaration.tax_year}`,
        content: `נשלחה הודעת WhatsApp ל-${phone}`,
      });
      onCommunicationLogged?.();
    } catch (error) {
      console.error('Failed to log WhatsApp communication:', error);
    }
  };

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      className={cn(
        'gap-2 rtl:flex-row-reverse text-green-600 hover:text-green-700 hover:bg-green-50',
        className
      )}
    >
      <MessageCircle className="h-4 w-4" />
      {showLabel && size !== 'icon' && <span>WhatsApp</span>}
    </Button>
  );
}
