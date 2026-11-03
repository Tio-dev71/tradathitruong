import { db, PaymentOrder } from '../db/database';
import { broadcastCreditUpdate } from '../socket/multiplayerHandler';

export interface CreateInvoiceParams {
  sessionId: string;
  amountUsd: number;
  currency?: string;
  email?: string;
  appBaseUrl?: string;
}

export interface PlisioInvoiceResponse {
  success: boolean;
  orderNumber: string;
  amountUsd: number;
  credits: number;
  currency: string;
  invoiceUrl: string;
  walletHash?: string | null;
  cryptoAmount?: number | null;
  qrCode?: string | null;
  status: string;
  isTestMode?: boolean;
  message?: string;
}

export class PlisioService {
  private apiKey: string;
  private baseUrl = 'https://api.plisio.net/api/v1';

  constructor() {
    this.apiKey = process.env.PLISIO_API_KEY || '';
  }

  public getApiKey(): string {
    return process.env.PLISIO_API_KEY || this.apiKey;
  }

  public setApiKey(key: string) {
    this.apiKey = key;
  }

  /**
   * Quy đổi: 5 USD (5u) = 100 Xu (Bội số hoặc tính theo tỷ lệ 1 Xu = 0.05 USD)
   */
  public calculateCredits(amountUsd: number): number {
    if (amountUsd < 5) return 0;
    return Math.floor((amountUsd / 5) * 100);
  }

  /**
   * Tạo hóa đơn nạp xu qua Plisio
   */
  public async createInvoice(params: CreateInvoiceParams): Promise<PlisioInvoiceResponse> {
    const { sessionId, amountUsd, currency = 'USDT_TRX', email, appBaseUrl = 'http://localhost:3000' } = params;
    const credits = this.calculateCredits(amountUsd);

    if (credits <= 0) {
      throw new Error('Số tiền nạp tối thiểu là 5 USD (tương đương 100 Xu)');
    }

    const orderNumber = `ORD_${Date.now()}_${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
    const orderId = `plisio_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const apiKey = this.getApiKey();

    // 1. Nếu có PLISIO_API_KEY: Gọi API thực tế của Plisio
    if (apiKey) {
      try {
        const query = new URLSearchParams({
          api_key: apiKey,
          order_number: orderNumber,
          order_name: `Nap ${credits} Xu Tra Da Thi Truong`,
          source_currency: 'USD',
          source_amount: amountUsd.toFixed(2),
          currency,
          callback_url: `${appBaseUrl}/api/payments/plisio/callback?json=true`,
        });

        if (email) {
          query.set('email', email);
        }

        const res = await fetch(`${this.baseUrl}/invoices/new?${query.toString()}`);
        const data = await res.json() as any;

        if (data.status === 'success' && data.data) {
          const inv = data.data;
          const order: PaymentOrder = {
            id: orderId,
            sessionId,
            orderNumber,
            plisioTxnId: inv.txn_id || inv.id || null,
            amountUsd,
            credits,
            currency: inv.currency || currency,
            cryptoAmount: inv.amount ? parseFloat(inv.amount) : null,
            walletHash: inv.wallet_hash || null,
            qrCode: inv.qr_code || null,
            invoiceUrl: inv.invoice_url || `https://plisio.net/invoice/${inv.txn_id}`,
            status: 'new',
            createdAt: Date.now(),
            updatedAt: Date.now(),
          };

          db.createPaymentOrder(order);

          return {
            success: true,
            orderNumber,
            amountUsd,
            credits,
            currency: order.currency || currency,
            invoiceUrl: order.invoiceUrl || '',
            walletHash: order.walletHash,
            cryptoAmount: order.cryptoAmount,
            qrCode: order.qrCode,
            status: 'new',
            isTestMode: false,
          };
        } else {
          console.warn('[PlisioService] Plisio API returned non-success:', data);
          // Nếu API trả lỗi (ví dụ key chưa kích hoạt ví), fall back xuống chuẩn bị order
        }
      } catch (err) {
        console.error('[PlisioService] Error contacting Plisio API:', err);
      }
    }

    // 2. Chế độ Test / Demo (Chưa có API key hoặc đang chạy thử)
    const mockWallet = currency === 'USDT_TRX' || currency === 'TRX'
      ? 'TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t' // TRON format
      : currency === 'USDT_BSC' || currency === 'ETH' || currency === 'BNB'
      ? '0x55d398326f99059fF775485246999027B3197955' // EVM format
      : 'bc1qm34lsc65zpw79lxes69zkqmk6ee3ewf0j77s3h'; // BTC format

    const order: PaymentOrder = {
      id: orderId,
      sessionId,
      orderNumber,
      plisioTxnId: `demo_${Date.now()}`,
      amountUsd,
      credits,
      currency,
      cryptoAmount: currency.startsWith('USDT') ? amountUsd : amountUsd / 2000,
      walletHash: mockWallet,
      qrCode: `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(mockWallet)}`,
      invoiceUrl: `https://plisio.net/invoice/demo_${orderNumber}`,
      status: 'new',
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };

    db.createPaymentOrder(order);

    return {
      success: true,
      orderNumber,
      amountUsd,
      credits,
      currency,
      invoiceUrl: order.invoiceUrl || '',
      walletHash: mockWallet,
      cryptoAmount: order.cryptoAmount,
      qrCode: order.qrCode,
      status: 'new',
      isTestMode: true,
      message: 'Chế độ Demo (Chưa cấu hình PLISIO_API_KEY trong file .env). Bạn có thể bấm [Giả lập thanh toán] để kiểm tra luồng nhận xu!',
    };
  }

  /**
   * API kiểm tra xem đã nhận được thanh toán chưa
   * Endpoint: GET /api/payments/plisio/check/:orderNumber
   */
  public async checkPaymentStatus(orderNumber: string): Promise<{
    success: boolean;
    orderNumber: string;
    status: PaymentOrder['status'];
    paid: boolean;
    credits: number;
    currentCredits?: number;
    message: string;
    isTestMode?: boolean;
    txUrl?: string;
  }> {
    const order = db.getPaymentOrderByOrderNumber(orderNumber);
    if (!order) {
      return {
        success: false,
        orderNumber,
        status: 'cancelled',
        paid: false,
        credits: 0,
        message: 'Không tìm thấy đơn hàng nạp xu',
      };
    }

    // Nếu đơn hàng đã hoàn thành trước đó (idempotent)
    if (order.status === 'completed') {
      const session = db.getSession(order.sessionId);
      return {
        success: true,
        orderNumber,
        status: 'completed',
        paid: true,
        credits: order.credits,
        currentCredits: session ? session.credits : undefined,
        message: `Đơn hàng đã thanh toán thành công! Bạn nhận được ${order.credits} Xu.`,
      };
    }

    const apiKey = this.getApiKey();

    // Nếu có API key thực tế, kiểm tra trực tiếp qua Plisio API
    if (apiKey && !order.plisioTxnId?.startsWith('demo_')) {
      try {
        let opData: any = null;

        if (order.plisioTxnId) {
          const res = await fetch(`${this.baseUrl}/operations/${order.plisioTxnId}?api_key=${apiKey}`);
          const resJson = await res.json() as any;
          if (resJson.status === 'success' && resJson.data) {
            opData = resJson.data;
          }
        }

        if (!opData) {
          const res = await fetch(`${this.baseUrl}/operations?api_key=${apiKey}&type=invoice&search=${orderNumber}`);
          const resJson = await res.json() as any;
          if (resJson.status === 'success' && resJson.data && resJson.data.operations && resJson.data.operations.length > 0) {
            opData = resJson.data.operations[0];
          }
        }

        if (opData) {
          const plisioStatus = (opData.status || '').toLowerCase();

          if (plisioStatus === 'completed' || (plisioStatus === 'mismatch' && parseFloat(opData.paid_sum || '0') >= parseFloat(opData.amount || '0') * 0.98)) {
            // Thanh toán thành công!
            db.updatePaymentOrderStatus(orderNumber, 'completed', {
              completedAt: Date.now(),
              cryptoAmount: opData.paid_sum ? parseFloat(opData.paid_sum) : undefined,
            });

            const newCredits = db.addSessionCredits(order.sessionId, order.credits);
            broadcastCreditUpdate(order.sessionId, newCredits, order.credits);

            return {
              success: true,
              orderNumber,
              status: 'completed',
              paid: true,
              credits: order.credits,
              currentCredits: newCredits,
              message: `Xác nhận thanh toán thành công từ ví Plisio! Đã cộng +${order.credits} Xu vào tài khoản.`,
              txUrl: opData.txurl || undefined,
            };
          } else if (plisioStatus === 'pending' || plisioStatus === 'pending internal') {
            db.updatePaymentOrderStatus(orderNumber, 'pending');
            return {
              success: true,
              orderNumber,
              status: 'pending',
              paid: false,
              credits: order.credits,
              message: 'Giao dịch đã được ghi nhận trên blockchain và đang chờ xác nhận (confirmations)...',
            };
          } else if (plisioStatus === 'expired' || plisioStatus === 'cancelled') {
            db.updatePaymentOrderStatus(orderNumber, 'expired');
            return {
              success: true,
              orderNumber,
              status: 'expired',
              paid: false,
              credits: order.credits,
              message: 'Hóa đơn thanh toán đã hết hạn hoặc bị hủy.',
            };
          }
        }
      } catch (err) {
        console.error('[PlisioService] Error checking operation status:', err);
      }
    }

    // Mặc định trạng thái chưa thanh toán
    return {
      success: true,
      orderNumber,
      status: order.status,
      paid: false,
      credits: order.credits,
      isTestMode: !apiKey || Boolean(order.plisioTxnId?.startsWith('demo_')),
      message: 'Chưa phát hiện giao dịch chuyển tiền. Vui lòng hoàn tất thanh toán trên ví Plisio.',
    };
  }

  /**
   * Giả lập thanh toán thành công (dành cho môi trường dev/demo)
   */
  public async simulateSuccess(orderNumber: string): Promise<{
    success: boolean;
    orderNumber: string;
    status: PaymentOrder['status'];
    paid: boolean;
    credits: number;
    currentCredits: number;
    message: string;
  }> {
    const order = db.getPaymentOrderByOrderNumber(orderNumber);
    if (!order) {
      throw new Error('Không tìm thấy đơn hàng');
    }

    if (order.status === 'completed') {
      const session = db.getSession(order.sessionId);
      return {
        success: true,
        orderNumber,
        status: 'completed',
        paid: true,
        credits: order.credits,
        currentCredits: session ? session.credits : 0,
        message: 'Đơn hàng đã được thanh toán trước đó.',
      };
    }

    db.updatePaymentOrderStatus(orderNumber, 'completed', { completedAt: Date.now() });
    const newCredits = db.addSessionCredits(order.sessionId, order.credits);
    broadcastCreditUpdate(order.sessionId, newCredits, order.credits);

    return {
      success: true,
      orderNumber,
      status: 'completed',
      paid: true,
      credits: order.credits,
      currentCredits: newCredits,
      message: `[Giả lập Dev] Thanh toán thành công! Đã nạp +${order.credits} Xu vào tài khoản.`,
    };
  }

  /**
   * Xử lý Webhook IPN từ Plisio gửi về server
   * POST /api/payments/plisio/callback
   */
  public async handleWebhookCallback(payload: any): Promise<{ success: boolean; message: string }> {
    const orderNumber = payload.order_number;
    const status = (payload.status || '').toLowerCase();

    if (!orderNumber) {
      return { success: false, message: 'Missing order_number' };
    }

    const order = db.getPaymentOrderByOrderNumber(orderNumber);
    if (!order) {
      return { success: false, message: `Order not found: ${orderNumber}` };
    }

    if (order.status === 'completed') {
      return { success: true, message: 'Order already completed' };
    }

    if (status === 'completed' || (status === 'mismatch' && parseFloat(payload.paid_sum || '0') >= parseFloat(payload.amount || '0') * 0.98)) {
      db.updatePaymentOrderStatus(orderNumber, 'completed', {
        completedAt: Date.now(),
        cryptoAmount: payload.paid_sum ? parseFloat(payload.paid_sum) : undefined,
      });

      const newCredits = db.addSessionCredits(order.sessionId, order.credits);
      broadcastCreditUpdate(order.sessionId, newCredits, order.credits);

      return { success: true, message: `Order ${orderNumber} completed and credited ${order.credits} xu` };
    } else if (status === 'pending') {
      db.updatePaymentOrderStatus(orderNumber, 'pending');
      return { success: true, message: `Order ${orderNumber} is pending` };
    } else if (status === 'expired' || status === 'cancelled') {
      db.updatePaymentOrderStatus(orderNumber, 'expired');
      return { success: true, message: `Order ${orderNumber} marked expired` };
    }

    return { success: true, message: `Status ${status} recorded` };
  }
}

export const plisioService = new PlisioService();
