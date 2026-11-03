import { Router, Request, Response } from 'express';
import { plisioService } from '../services/plisioService';
import { db } from '../db/database';

export const paymentRouter = Router();

/**
 * 1. Tạo hóa đơn nạp xu qua ví Plisio (5u = 100 Xu)
 * POST /api/payments/plisio/create-invoice
 */
paymentRouter.post('/plisio/create-invoice', async (req: Request, res: Response) => {
  try {
    const { sessionId, amountUsd, currency, email } = req.body;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ success: false, error: 'Thiếu hoặc sai sessionId' });
    }

    const amount = typeof amountUsd === 'number' ? amountUsd : parseFloat(amountUsd);
    if (isNaN(amount) || amount < 5) {
      return res.status(400).json({
        success: false,
        error: 'Số tiền tối thiểu là 5 USD (tương đương 100 Xu: 5u/100xu)',
      });
    }

    // Lấy baseUrl hiện tại từ request header để webhook callback chính xác
    const protocol = req.headers['x-forwarded-proto'] || req.protocol;
    const host = req.headers['x-forwarded-host'] || req.get('host');
    const appBaseUrl = `${protocol}://${host}`;

    const invoice = await plisioService.createInvoice({
      sessionId,
      amountUsd: amount,
      currency: currency || 'USDT_TRX',
      email,
      appBaseUrl,
    });

    return res.json({
      success: true,
      data: invoice,
    });
  } catch (err: any) {
    console.error('[Payment API] Error creating Plisio invoice:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Lỗi tạo hóa đơn nạp xu Plisio',
    });
  }
});

/**
 * 2. API kiểm tra xem đã nhận được thanh toán từ ví Plisio chưa
 * GET /api/payments/plisio/check/:orderNumber
 */
paymentRouter.get('/plisio/check/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    if (!orderNumber) {
      return res.status(400).json({ success: false, error: 'Thiếu orderNumber' });
    }

    const result = await plisioService.checkPaymentStatus(orderNumber);
    return res.json(result);
  } catch (err: any) {
    console.error('[Payment API] Error checking payment status:', err);
    return res.status(500).json({
      success: false,
      error: err.message || 'Lỗi kiểm tra trạng thái thanh toán',
    });
  }
});

/**
 * 3. Webhook IPN nhận thông báo từ Plisio
 * POST /api/payments/plisio/callback
 */
paymentRouter.post('/plisio/callback', async (req: Request, res: Response) => {
  try {
    const payload = req.body;
    console.log('[Payment API] Received Plisio Webhook:', payload);

    const result = await plisioService.handleWebhookCallback(payload);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('[Payment API] Error handling Plisio webhook:', err);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

/**
 * 4. Giả lập thanh toán thành công (dành cho chế độ test dev)
 * POST /api/payments/plisio/simulate-success/:orderNumber
 */
paymentRouter.post('/plisio/simulate-success/:orderNumber', async (req: Request, res: Response) => {
  try {
    const { orderNumber } = req.params;
    const result = await plisioService.simulateSuccess(orderNumber);
    return res.json(result);
  } catch (err: any) {
    return res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * 5. Lịch sử các đơn nạp xu của session
 * GET /api/payments/plisio/orders/:sessionId
 */
paymentRouter.get('/plisio/orders/:sessionId', (req: Request, res: Response) => {
  try {
    const { sessionId } = req.params;
    const orders = db.getRecentPaymentOrders(sessionId, 20);
    return res.json({
      success: true,
      data: orders,
    });
  } catch (err: any) {
    return res.status(500).json({ success: false, error: err.message });
  }
});
