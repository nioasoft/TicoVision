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

    // Use API v11 (JSON format)
    this.baseUrl = 'https://secure.cardcom.solutions/api/v11';
  }

  async createPaymentPage(
    request: CreatePaymentPageRequest
  ): Promise<ServiceResponse<PaymentPageResponse>> {
    try {
      // API v11 uses JSON format
      const body = {
        TerminalNumber: this.config.terminalNumber,
        ApiName: this.config.username,
        Amount: request.amount,
        Operation: request.operation || 'ChargeOnly',
        Language: request.language || 'he',
        ISOCoinId: request.currency === 'USD' ? 2 : 1, // 1=ILS, 2=USD
        ProductName: request.productName,
        SuccessRedirectUrl: request.successUrl || `${window.location.origin}/payment/success`,
        FailedRedirectUrl: request.errorUrl || `${window.location.origin}/payment/error`,
        WebHookUrl: request.notifyUrl || `${window.location.origin}/api/webhooks/cardcom`,
        // UI Customization - TICO Branding
        UIDefinition: {
          ...(request.maxPayments && request.maxPayments > 1 && {
            MinNumOfPayments: 1,
            MaxNumOfPayments: request.maxPayments,
          }),
          // TICO Brand Colors & Design
          LogoUrl: 'https://ticovision.com/brand/tico_logo_240.png', // TODO: Update with actual URL
          TopColor: '#667eea', // TICO Purple gradient start
          BottomColor: '#764ba2', // TICO Purple gradient end
          ButtonColor: '#667eea',
          ButtonHoverColor: '#5a67d8',
          Language: 'he',
          ShowCompanyNameOnPage: true,
          CompanyName: 'TICO - מערכת CRM לרואי חשבון',
          PageTitle: 'תשלום מאובטח',
          IsShowCardOwnerID: true,
          IsHideCardOwnerID: false,
          CreditCardHolderIDtext: 'תעודת זהות',
          SuccessMessage: 'התשלום בוצע בהצלחה! תודה רבה.',
          FailedMessage: 'התשלום נכשל. אנא נסה שנית או צור קשר.',
        },
        ...(request.documentType && {
          Document: {
            DocumentTypeToCreate: this.mapDocumentType(request.documentType),
            ...(request.customerName && { Name: request.customerName }),
            ...(request.customerEmail && { Email: request.customerEmail }),
            ...(request.customerPhone && { Phone: request.customerPhone }),
            IsSendByEmail: true,
          }
        }),
      };

      const response = await fetch(`${this.baseUrl}/LowProfile/Create`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const jsonResponse = await response.json();

      const returnCode = jsonResponse.ResponseCode?.toString() || '';
      const lowProfileCode = jsonResponse.LowProfileId || '';

      if (returnCode !== '0') {
        return {
          data: null,
          error: new Error(`Cardcom error: ${jsonResponse.Description || 'Unknown error'} (${returnCode})`),
        };
      }

      return {
        data: {
          url: jsonResponse.Url || '',
          lowProfileCode,
          returnCode,
          description: jsonResponse.Description || 'Success',
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

  private mapDocumentType(type: number): string {
    const types: Record<number, string> = {
      1: 'TaxInvoice',
      2: 'Receipt',
      3: 'TaxInvoiceAndReceipt',
    };
    return types[type] || 'TaxInvoiceAndReceipt';
  }

  async getTransactionDetails(
    dealNumber: string
  ): Promise<ServiceResponse<TransactionDetails>> {
    try {
      // API v11 uses GET with query params
      const params = new URLSearchParams({
        TerminalNumber: this.config.terminalNumber,
        ApiName: this.config.username,
        LowProfileId: dealNumber,
      });

      const response = await fetch(`${this.baseUrl}/LowProfile/GetLpResult?${params.toString()}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const jsonResponse = await response.json();

      const returnCode = jsonResponse.ResponseCode?.toString() || '';

      if (returnCode !== '0') {
        return {
          data: null,
          error: new Error(`Failed to get transaction: ${jsonResponse.Description || 'Unknown error'}`),
        };
      }

      const txInfo = jsonResponse.TranzactionInfo || {};

      const transaction: TransactionDetails = {
        dealNumber: txInfo.TranzactionId?.toString() || '',
        internalDealNumber: txInfo.Uid || '',
        terminalNumber: txInfo.TerminalNumber?.toString() || '',
        transactionDate: txInfo.CreateDate || '',
        transactionAmount: txInfo.Amount || 0,
        currency: txInfo.CoinId === 1 ? 'ILS' : 'USD',
        creditCardNumber: txInfo.Last4CardDigitsString || '',
        creditCardExpDate: `${txInfo.CardMonth}/${txInfo.CardYear}`,
        transactionType: txInfo.DealType || '',
        creditType: txInfo.PaymentType || '',
        numberOfPayments: txInfo.NumberOfPayments || 1,
        transactionStatus: returnCode === '0' ? 'completed' : 'failed',
        statusDescription: jsonResponse.Description || '',
        customerName: txInfo.CardOwnerName || undefined,
        customerEmail: txInfo.CardOwnerEmail || undefined,
        customerPhone: txInfo.CardOwnerPhone || undefined,
        invoiceNumber: txInfo.DocumentNumber?.toString() || undefined,
        token: txInfo.Token || undefined,
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
      // API v11 uses Transaction endpoint with JSON
      const body = {
        TerminalNumber: this.config.terminalNumber,
        ApiName: this.config.username,
        Token: token,
        Amount: amount,
        ISOCoinId: 1, // ILS
        NumOfPayments: payments,
        ...(cvv && { CVV2: cvv }),
      };

      const response = await fetch(`${this.baseUrl}/Transactions/Transaction`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const jsonResponse = await response.json();

      const returnCode = jsonResponse.ResponseCode?.toString() || '';

      if (returnCode !== '0') {
        return {
          data: null,
          error: new Error(`Payment failed: ${jsonResponse.Description || 'Unknown error'}`),
        };
      }

      return {
        data: {
          dealNumber: jsonResponse.TranzactionId?.toString() || '',
          approvalNumber: jsonResponse.ApprovalNumber || '',
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
      // API v11 uses Refund endpoint
      const body = {
        TerminalNumber: this.config.terminalNumber,
        ApiName: this.config.username,
        ApiPassword: this.config.apiKey, // Required for refund operations
        TransactionId: dealNumber,
        ...(amount && { Amount: amount }),
      };

      const response = await fetch(`${this.baseUrl}/Transactions/Refund`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });

      const jsonResponse = await response.json();

      const returnCode = jsonResponse.ResponseCode?.toString() || '';

      if (returnCode !== '0') {
        return {
          data: false,
          error: new Error(`Failed to cancel transaction: ${jsonResponse.Description || 'Unknown error'}`),
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