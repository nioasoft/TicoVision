import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface FeeStatusIndicatorProps {
  status: string | null;
  onClick?: () => void;
}

const FEE_STATUS_CONFIG: Record<string, { color: string; label: string; tooltip: string; lineThrough?: boolean }> = {
  paid: { color: 'bg-primary', label: 'שולם', tooltip: 'שכר טרחה שולם' },
  partial_paid: { color: 'bg-orange-500', label: 'חלקי', tooltip: 'שולם חלקית' },
  sent: { color: 'bg-primary/70', label: 'נשלח', tooltip: 'נשלח ללקוח' },
  draft: { color: 'bg-gray-400', label: 'טיוטא', tooltip: 'טיוטא' },
  overdue: { color: 'bg-red-500', label: 'באיחור', tooltip: 'באיחור' },
  cancelled: { color: 'bg-gray-400', label: 'בוטל', tooltip: 'בוטל', lineThrough: true },
};

export function FeeStatusIndicator({ status, onClick }: FeeStatusIndicatorProps) {
  if (!status) {
    return <span className="text-gray-400">-</span>;
  }

  const config = FEE_STATUS_CONFIG[status];
  if (!config) {
    return <span className="text-gray-400">-</span>;
  }

  const content = (
    <div
      className={`inline-flex items-center gap-1.5 text-xs ${onClick ? 'cursor-pointer hover:opacity-80' : ''} ${config.lineThrough ? 'line-through' : ''}`}
      onClick={onClick}
    >
      <span className={`inline-block w-2.5 h-2.5 rounded-sm ${config.color}`} />
      <span className="text-foreground/80">{config.label}</span>
    </div>
  );

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {content}
        </TooltipTrigger>
        <TooltipContent>
          <p>{config.tooltip}</p>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
