import type { ServiceResponse } from './base.service';

interface CardcomConfig {
  env: 'test' | 'production';
  terminalNumber: string;
  username: string;
  apiKey: string;
}

interface CreatePaymentPageRequest {
  amount: number;
  currency?: string; // Default: ILS
  productName: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceHead?: string;
  invoiceDescription?: string;
  successUrl?: string;
  errorUrl?: string;
  notifyUrl?: string;
  maxPayments?: number;
  operation?: 'Bill' | 'Token';
  language?: 'he' | 'en' | 'ru' | 'ar';
  documentType?: 1 | 2 | 3; // 1=Invoice, 2=Receipt, 3=Invoice+Receipt
}

interface PaymentPageResponse {
  url: string;
  lowProfileCode: string;
  returnCode: string;
  description: string;
}

interface TransactionDetails {
  dealNumber: string;
  internalDealNumber: string;
  terminalNumber: string;
  transactionDate: string;
  transactionAmount: number;
  currency: string;
  creditCardNumber: string;
  creditCardExpDate: string;
  transactionType: string;
  creditType: string;
  numberOfPayments: number;
  slaveTerminalNumber?: string;
  transactionStatus: string;
  statusDescription: string;
  customerName?: string;
  customerEmail?: string;
  customerPhone?: string;
  invoiceNumber?: string;
  token?: string;
}

interface CardcomWebhookData {
  terminalnumber: string;
  lowprofilecode: string;
  operation: string;
  dealnumber: string;
  tokennumber?: string;
  tokenexpdate?: string;
  cardnumber: string;
  cardexpdate: string;
  approvalnum: string;
  username: string;
  sum: string;
  currency: string;
  responsecode: string;
  responsemessage: string;
  email?: string;
  phone?: string;
  customername?: string;
  customerid?: string;
  invoicenumber?: string;
  invoicelink?: string;
  dealid?: string;
}

class CardcomService {
  private config: CardcomConfig;
  private baseUrl: string;

  constructor() {
    this.config = {
      env: (import.meta.env.VITE_CARDCOM_ENV as 'test' | 'production') || 'test',
      terminalNumber: import.meta.env.VITE_CARDCOM_TERMINAL || '',
      username: import.meta.env.VITE_CARDCOM_USERNAME || '',
      apiKey: import.meta.env.VITE_CARDCOM_API_KEY || '',
    };

    this.baseUrl = 'https://secure.cardcom.solutions/Interface';
  }

  async createPaymentPage(
    request: CreatePaymentPageRequest
  ): Promise<ServiceResponse<PaymentPageResponse>> {
    try {
      const params = new URLSearchParams({
        TerminalNumber: this.config.terminalNumber,
        UserName: this.config.username,
        APILevel: '10',
        codepage: '65001', // UTF-8
        Operation: request.operation || 'Bill',
        Language: request.language || 'he',
        CoinID: request.currency === 'USD' ? '2' : '1', // 1=ILS, 2=USD
        SumToBill: request.amount.toString(),
        ProductName: request.productName,
        SuccessRedirectUrl: request.successUrl || `${window.location.origin}/payment/success`,
        ErrorRedirectUrl: request.errorUrl || `${window.location.origin}/payment/error`,
        NotifyURL: request.notifyUrl || `${window.location.origin}/api/webhooks/cardcom`,
        MaxNumOfPayments: (request.maxPayments || 1).toString(),
        ...(request.documentType && { CreateInvoice: 'true', DocumentType: request.documentType.toString() }),
        ...(request.customerName && { CustomerName: request.customerName }),
        ...(request.customerEmail && { CustomerEmail: request.customerEmail }),
        ...(request.customerPhone && { CustomerPhone: request.customerPhone }),
        ...(request.invoiceHead && { InvoiceHead: request.invoiceHead }),
        ...(request.invoiceDescription && { InvoiceDescription: request.invoiceDescription }),
      });

      const response = await fetch(`${this.baseUrl}/LowProfile.aspx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      const responseParams = new URLSearchParams(responseText);

      const returnCode = responseParams.get('ReturnCode') || '';
      const lowProfileCode = responseParams.get('LowProfileCode') || '';

      if (returnCode !== '0') {
        return {
          data: null,
          error: new Error(`Cardcom error: ${responseParams.get('Description') || 'Unknown error'} (${returnCode})`),
        };
      }

      const paymentUrl = `https://secure.cardcom.solutions/External/LowProfile.aspx?LowProfileCode=${lowProfileCode}`;

      return {
        data: {
          url: paymentUrl,
          lowProfileCode,
          returnCode,
          description: responseParams.get('Description') || 'Success',
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to create payment page'),
      };
    }
  }

  async getTransactionDetails(
    dealNumber: string
  ): Promise<ServiceResponse<TransactionDetails>> {
    try {
      const params = new URLSearchParams({
        TerminalNumber: this.config.terminalNumber,
        UserName: this.config.username,
        DealNumber: dealNumber,
        ShowFullDetails: 'true',
      });

      const response = await fetch(`${this.baseUrl}/GetTransaction.aspx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      const responseParams = new URLSearchParams(responseText);

      const returnCode = responseParams.get('ReturnCode') || '';

      if (returnCode !== '0') {
        return {
          data: null,
          error: new Error(`Failed to get transaction: ${responseParams.get('Description') || 'Unknown error'}`),
        };
      }

      const transaction: TransactionDetails = {
        dealNumber: responseParams.get('DealNumber') || '',
        internalDealNumber: responseParams.get('InternalDealNumber') || '',
        terminalNumber: responseParams.get('TerminalNumber') || '',
        transactionDate: responseParams.get('TransactionDate') || '',
        transactionAmount: parseFloat(responseParams.get('TransactionAmount') || '0'),
        currency: responseParams.get('Currency') || 'ILS',
        creditCardNumber: responseParams.get('CreditCardNumber') || '',
        creditCardExpDate: responseParams.get('CreditCardExpDate') || '',
        transactionType: responseParams.get('TransactionType') || '',
        creditType: responseParams.get('CreditType') || '',
        numberOfPayments: parseInt(responseParams.get('NumberOfPayments') || '1'),
        transactionStatus: responseParams.get('TransactionStatus') || '',
        statusDescription: responseParams.get('StatusDescription') || '',
        customerName: responseParams.get('CustomerName') || undefined,
        customerEmail: responseParams.get('CustomerEmail') || undefined,
        customerPhone: responseParams.get('CustomerPhone') || undefined,
        invoiceNumber: responseParams.get('InvoiceNumber') || undefined,
        token: responseParams.get('Token') || undefined,
      };

      return { data: transaction, error: null };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to get transaction details'),
      };
    }
  }

  async chargeToken(
    token: string,
    amount: number,
    cvv?: string,
    payments = 1
  ): Promise<ServiceResponse<{ dealNumber: string; approvalNumber: string }>> {
    try {
      const params = new URLSearchParams({
        TerminalNumber: this.config.terminalNumber,
        UserName: this.config.username,
        Token: token,
        TokenExpDate: '1225', // This will be replaced by actual token exp date
        SumToBill: amount.toString(),
        CoinID: '1', // ILS
        NumOfPayments: payments.toString(),
        ...(cvv && { CVV: cvv }),
      });

      const response = await fetch(`${this.baseUrl}/ChargeToken.aspx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      const responseParams = new URLSearchParams(responseText);

      const returnCode = responseParams.get('ReturnCode') || '';

      if (returnCode !== '0') {
        return {
          data: null,
          error: new Error(`Payment failed: ${responseParams.get('Description') || 'Unknown error'}`),
        };
      }

      return {
        data: {
          dealNumber: responseParams.get('DealNumber') || '',
          approvalNumber: responseParams.get('ApprovalNumber') || '',
        },
        error: null,
      };
    } catch (error) {
      return {
        data: null,
        error: error instanceof Error ? error : new Error('Failed to charge token'),
      };
    }
  }

  async cancelTransaction(
    dealNumber: string,
    amount?: number
  ): Promise<ServiceResponse<boolean>> {
    try {
      const params = new URLSearchParams({
        TerminalNumber: this.config.terminalNumber,
        UserName: this.config.username,
        DealNumber: dealNumber,
        ...(amount && { RefundTotal: amount.toString() }),
      });

      const response = await fetch(`${this.baseUrl}/CancelDeal.aspx`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: params.toString(),
      });

      const responseText = await response.text();
      const responseParams = new URLSearchParams(responseText);

      const returnCode = responseParams.get('ReturnCode') || '';

      if (returnCode !== '0') {
        return {
          data: false,
          error: new Error(`Failed to cancel transaction: ${responseParams.get('Description') || 'Unknown error'}`),
        };
      }

      return { data: true, error: null };
    } catch (error) {
      return {
        data: false,
        error: error instanceof Error ? error : new Error('Failed to cancel transaction'),
      };
    }
  }

  validateWebhookSignature(data: CardcomWebhookData, signature: string): boolean {
    // Cardcom webhook validation logic
    // This would validate the webhook signature to ensure it's from Cardcom
    // Implementation depends on Cardcom's specific signature mechanism
    
    // For now, basic validation
    return data.terminalnumber === this.config.terminalNumber;
  }

  parseWebhookData(formData: URLSearchParams): CardcomWebhookData {
    return {
      terminalnumber: formData.get('terminalnumber') || '',
      lowprofilecode: formData.get('lowprofilecode') || '',
      operation: formData.get('operation') || '',
      dealnumber: formData.get('dealnumber') || '',
      tokennumber: formData.get('tokennumber') || undefined,
      tokenexpdate: formData.get('tokenexpdate') || undefined,
      cardnumber: formData.get('cardnumber') || '',
      cardexpdate: formData.get('cardexpdate') || '',
      approvalnum: formData.get('approvalnum') || '',
      username: formData.get('username') || '',
      sum: formData.get('sum') || '',
      currency: formData.get('currency') || '',
      responsecode: formData.get('responsecode') || '',
      responsemessage: formData.get('responsemessage') || '',
      email: formData.get('email') || undefined,
      phone: formData.get('phone') || undefined,
      customername: formData.get('customername') || undefined,
      customerid: formData.get('customerid') || undefined,
      invoicenumber: formData.get('invoicenumber') || undefined,
      invoicelink: formData.get('invoicelink') || undefined,
      dealid: formData.get('dealid') || undefined,
    };
  }

  isSuccessfulPayment(webhookData: CardcomWebhookData): boolean {
    return webhookData.responsecode === '0';
  }

  formatCreditCardNumber(cardNumber: string): string {
    // Format: **** **** **** 1234
    if (cardNumber.length < 4) return cardNumber;
    const last4 = cardNumber.slice(-4);
    return `**** **** **** ${last4}`;
  }

  getPaymentStatusMessage(responseCode: string): string {
    const messages: Record<string, string> = {
      '0': 'התשלום בוצע בהצלחה',
      '1': 'חסום - יש לפנות לחברת האשראי',
      '2': 'חסום - יש לפנות לחברת האשראי',
      '3': 'חסום - יש לפנות לחברת האשראי',
      '4': 'סירוב - כרטיס לא תקין',
      '5': 'סירוב - סכום העסקה חורג מהמותר',
      '6': 'שגיאה - יש לנסות שוב',
      '33': 'כרטיס לא תקין',
      '34': 'כרטיס חסום',
      '35': 'תוקף הכרטיס פג',
      '36': 'שגיאה בפרטי הכרטיס',
      '37': 'סירוב - CVV שגוי',
      '39': 'מספר תעודת זהות שגוי',
      '51': 'אין יתרה מספקת',
      '61': 'חריגה ממסגרת אשראי',
      '62': 'כרטיס גנוב',
      '65': 'כרטיס לא בתוקף',
      '80': 'שגיאה בעיבוד העסקה',
      '150': 'כרטיס אשראי לא נתמך',
      '200': 'שגיאה כללית',
    };

    return messages[responseCode] || 'שגיאה לא ידועה';
  }

  async createPaymentLinkForFee(
    feeId: string,
    amount: number,
    clientName: string,
    clientEmail?: string,
    description?: string
  ): Promise<ServiceResponse<string>> {
    const result = await this.createPaymentPage({
      amount,
      productName: description || `תשלום חשבון #${feeId}`,
      customerName: clientName,
      customerEmail: clientEmail,
      invoiceHead: clientName,
      invoiceDescription: description,
      documentType: 3, // Invoice + Receipt
      language: 'he',
      notifyUrl: `${window.location.origin}/api/webhooks/cardcom/${feeId}`,
    });

    if (result.error) {
      return { data: null, error: result.error };
    }

    return { data: result.data!.url, error: null };
  }
}

export const cardcomService = new CardcomService();