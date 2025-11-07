/**
 * Payment Components Demo
 * Example usage of all payment components for testing and documentation
 * This file can be deleted in production - it's just for verification
 */

import {
  AmountDisplay,
  AmountDisplayCompact,
  AmountWithVATBreakdown,
  DeviationBadge,
  DeviationIndicator,
  DeviationSummary,
  InstallmentStatusBadge,
  InstallmentStatusWithUrgency,
  InstallmentListItem,
  InstallmentProgress,
  FileAttachmentList,
  FileAttachmentBadge,
  PaymentMethodBadge,
  DiscountBadge,
  PaymentAmountDisplay,
} from './index';

export function PaymentComponentsDemo() {
  // Demo data
  const demoAmount = 10000;
  const demoDeviationAmount = -100;
  const demoDeviationPercent = -1.1;
  const demoAttachmentIds = ['uuid1', 'uuid2'];

  const handleUpload = async (files: File[]) => {
    console.log('Files to upload:', files);
  };

  return (
    <div className="p-8 space-y-8 max-w-4xl mx-auto" dir="rtl">
      <h1 className="text-2xl font-bold text-right">Payment Components Demo</h1>

      {/* Amount Display Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-right">Amount Display</h2>

        <div className="space-y-2 bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right">Default</h3>
          <AmountDisplay beforeVat={demoAmount} />
        </div>

        <div className="space-y-2 bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right">Compact</h3>
          <AmountDisplayCompact beforeVat={demoAmount} />
        </div>

        <div className="space-y-2 bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right">With Breakdown</h3>
          <AmountWithVATBreakdown beforeVat={demoAmount} />
        </div>
      </section>

      {/* Deviation Badge Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-right">Deviation Badges</h2>

        <div className="flex gap-4 flex-wrap justify-end">
          <DeviationBadge
            deviationAmount={demoDeviationAmount}
            deviationPercent={demoDeviationPercent}
            alertLevel="warning"
          />
          <DeviationBadge
            deviationAmount={-500}
            deviationPercent={-5.5}
            alertLevel="critical"
          />
          <DeviationBadge
            deviationAmount={50}
            deviationPercent={0.5}
            alertLevel="info"
          />
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right mb-4">
            Deviation Summary
          </h3>
          <DeviationSummary
            expectedAmount={10000}
            actualAmount={9900}
            deviationAmount={-100}
            deviationPercent={-1.0}
            alertLevel="warning"
          />
        </div>
      </section>

      {/* Installment Status Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-right">Installment Status</h2>

        <div className="flex gap-4 flex-wrap justify-end">
          <InstallmentStatusBadge status="pending" dueDate={new Date('2026-01-15')} />
          <InstallmentStatusBadge status="paid" dueDate={new Date('2025-12-15')} />
          <InstallmentStatusBadge status="overdue" dueDate={new Date('2025-11-01')} />
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right mb-4">
            Installment List Item
          </h3>
          <InstallmentListItem
            installmentNumber={1}
            status="pending"
            amount={1000}
            dueDate={new Date('2026-01-15')}
          />
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right mb-4">
            Installment Progress
          </h3>
          <InstallmentProgress
            totalInstallments={8}
            paidInstallments={3}
            overdueInstallments={1}
          />
        </div>
      </section>

      {/* Payment Method Badges */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-right">Payment Method Badges</h2>

        <div className="flex gap-4 flex-wrap justify-end">
          <PaymentMethodBadge method="bank_transfer" />
          <PaymentMethodBadge method="cc_single" />
          <PaymentMethodBadge method="cc_installments" />
          <PaymentMethodBadge method="checks" />
        </div>

        <div className="flex gap-4 flex-wrap justify-end">
          <DiscountBadge discountPercent={9} />
          <DiscountBadge discountPercent={8} />
          <DiscountBadge discountPercent={4} />
          <DiscountBadge discountPercent={0} />
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right mb-4">
            Payment Amount Display
          </h3>
          <PaymentAmountDisplay
            originalAmount={10000}
            amountAfterDiscount={9100}
          />
        </div>
      </section>

      {/* File Attachments Section */}
      <section className="space-y-4">
        <h2 className="text-xl font-semibold text-right">File Attachments</h2>

        <div className="flex gap-4 flex-wrap justify-end">
          <FileAttachmentBadge attachmentCount={0} />
          <FileAttachmentBadge attachmentCount={1} />
          <FileAttachmentBadge attachmentCount={3} />
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right mb-4">
            File Attachment List (Empty State)
          </h3>
          <FileAttachmentList
            attachmentIds={[]}
            onUpload={handleUpload}
            maxFiles={5}
          />
        </div>

        <div className="bg-white p-4 rounded-lg border">
          <h3 className="text-sm font-medium text-gray-600 text-right mb-4">
            File Attachment List (Read-only)
          </h3>
          <FileAttachmentList
            attachmentIds={demoAttachmentIds}
            readonly={true}
          />
        </div>
      </section>
    </div>
  );
}
