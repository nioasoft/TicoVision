import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { CreditCard, Landmark, ReceiptText, WalletCards } from 'lucide-react';
import type { PaymentMethod } from '@/types/collection.types';
import type { LucideIcon } from 'lucide-react';

interface PaymentMethodBadgeProps {
  method: PaymentMethod | null;
  className?: string;
}

interface PaymentMethodConfig {
  label: string;
  icon: LucideIcon;
  colorClass: string;
}

const paymentMethodConfig: Record<PaymentMethod, PaymentMethodConfig> = {
  bank_transfer: {
    label: 'העברה בנקאית',
    icon: Landmark,
    colorClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
  },
  cc_single: {
    label: 'אשראי - תשלום אחד',
    icon: CreditCard,
    colorClass: 'border-blue-200 bg-blue-50 text-blue-800',
  },
  cc_installments: {
    label: 'אשראי - תשלומים',
    icon: WalletCards,
    colorClass: 'border-violet-200 bg-violet-50 text-violet-800',
  },
  checks: {
    label: 'המחאות',
    icon: ReceiptText,
    colorClass: 'border-amber-200 bg-amber-50 text-amber-800',
  },
};

export function PaymentMethodBadge({ method, className = '' }: PaymentMethodBadgeProps) {
  if (!method) {
    return (
      <Badge
        variant="outline"
        className={cn(
          'gap-1.5 border-slate-200 bg-slate-50 text-slate-600 rtl:text-right ltr:text-left',
          className
        )}
      >
        לא נבחר
      </Badge>
    );
  }

  const config = paymentMethodConfig[method];
  const Icon = config.icon;

  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1.5 rounded-full px-2.5 py-1 rtl:text-right ltr:text-left',
        config.colorClass,
        className
      )}
    >
      <Icon className="h-3.5 w-3.5" />
      {config.label}
    </Badge>
  );
}

interface DiscountBadgeProps {
  discountPercent: number | null;
  className?: string;
}

export function DiscountBadge({ discountPercent, className = '' }: DiscountBadgeProps) {
  if (!discountPercent || discountPercent === 0) {
    return (
      <Badge variant="outline" className={`bg-gray-100 text-gray-600 border-gray-300 rtl:text-right ltr:text-left ${className}`}>
        ללא הנחה
      </Badge>
    );
  }

  // Choose color based on discount level
  let colorClass = '';
  if (discountPercent >= 9) {
    colorClass = 'bg-green-100 text-green-800 border-green-300';
  } else if (discountPercent >= 8) {
    colorClass = 'bg-blue-100 text-blue-800 border-blue-300';
  } else if (discountPercent >= 4) {
    colorClass = 'bg-purple-100 text-purple-800 border-purple-300';
  } else {
    colorClass = 'bg-gray-100 text-gray-600 border-gray-300';
  }

  return (
    <Badge variant="outline" className={`${colorClass} rtl:text-right ltr:text-left ${className}`}>
      {discountPercent}% הנחה
    </Badge>
  );
}

interface PaymentAmountDisplayProps {
  originalAmount: number;
  amountAfterDiscount: number | null;
  className?: string;
}

export function PaymentAmountDisplay({
  originalAmount,
  amountAfterDiscount,
  className = ''
}: PaymentAmountDisplayProps) {
  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('he-IL', {
      style: 'currency',
      currency: 'ILS',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(Math.ceil(amount));
  };

  if (!amountAfterDiscount || amountAfterDiscount === originalAmount) {
    return (
      <span className={`font-semibold rtl:text-right ltr:text-left ${className}`}>
        {formatCurrency(originalAmount)}
      </span>
    );
  }

  const savings = originalAmount - amountAfterDiscount;
  const savingsPercent = Math.round((savings / originalAmount) * 100);

  return (
    <div className={`rtl:text-right ltr:text-left ${className}`}>
      <div className="font-semibold text-blue-600 text-lg">
        {formatCurrency(amountAfterDiscount)}
      </div>
      <div className="text-xs text-gray-500 line-through">
        {formatCurrency(originalAmount)}
      </div>
      <div className="text-xs text-green-600 font-medium">
        חיסכון: {formatCurrency(savings)} ({savingsPercent}%)
      </div>
    </div>
  );
}
