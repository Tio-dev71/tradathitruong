import { describe, it, expect, beforeEach } from 'vitest';
import { db } from '../src/server/db/database';
import { plisioService } from '../src/server/services/plisioService';

describe('Plisio Payment & Xu Credit System', () => {
  const testSessionId = `test_player_${Date.now()}`;

  beforeEach(() => {
    // Setup test session with initial 0 credits
    db.saveSession(testSessionId, 'Thử Nghiệm Nạp', 'Trader Tập Sự', '{}', 0, 0);
  });

  it('calculates credits accurately: 5u = 100 Xu', () => {
    expect(plisioService.calculateCredits(5)).toBe(100);
    expect(plisioService.calculateCredits(10)).toBe(200);
    expect(plisioService.calculateCredits(25)).toBe(500);
    expect(plisioService.calculateCredits(50)).toBe(1000);
    expect(plisioService.calculateCredits(4)).toBe(0); // under 5 USD is rejected
  });

  it('creates an invoice and saves order in database', async () => {
    const invoice = await plisioService.createInvoice({
      sessionId: testSessionId,
      amountUsd: 5,
      currency: 'USDT_TRX',
    });

    expect(invoice.success).toBe(true);
    expect(invoice.amountUsd).toBe(5);
    expect(invoice.credits).toBe(100);
    expect(invoice.currency).toBe('USDT_TRX');
    expect(invoice.orderNumber).toBeDefined();

    const orderInDb = db.getPaymentOrderByOrderNumber(invoice.orderNumber);
    expect(orderInDb).toBeDefined();
    expect(orderInDb?.status).toBe('new');
    expect(orderInDb?.credits).toBe(100);
    expect(orderInDb?.sessionId).toBe(testSessionId);
  });

  it('checks status of pending invoice before payment', async () => {
    const invoice = await plisioService.createInvoice({
      sessionId: testSessionId,
      amountUsd: 10,
      currency: 'USDT_BSC',
    });

    const statusCheck = await plisioService.checkPaymentStatus(invoice.orderNumber);
    expect(statusCheck.success).toBe(true);
    expect(statusCheck.paid).toBe(false);
    expect(statusCheck.status).toBe('new');
    expect(statusCheck.credits).toBe(200);
  });

  it('completes payment via simulation and credits user xu', async () => {
    const invoice = await plisioService.createInvoice({
      sessionId: testSessionId,
      amountUsd: 5,
      currency: 'USDT_TRX',
    });

    // Simulate successful payment
    const simResult = await plisioService.simulateSuccess(invoice.orderNumber);
    expect(simResult.success).toBe(true);
    expect(simResult.paid).toBe(true);
    expect(simResult.status).toBe('completed');
    expect(simResult.credits).toBe(100);
    expect(simResult.currentCredits).toBe(100);

    // Verify DB session credits updated
    const session = db.getSession(testSessionId);
    expect(session?.credits).toBe(100);

    // Subsequent check should return completed without double adding
    const checkAgain = await plisioService.checkPaymentStatus(invoice.orderNumber);
    expect(checkAgain.paid).toBe(true);
    expect(checkAgain.status).toBe('completed');
    expect(db.getSession(testSessionId)?.credits).toBe(100);
  });

  it('processes Plisio webhook callback idempotently', async () => {
    const invoice = await plisioService.createInvoice({
      sessionId: testSessionId,
      amountUsd: 25, // 500 Xu
      currency: 'USDT_TRX',
    });

    const initialCredits = db.getSession(testSessionId)?.credits || 0;

    // First webhook dispatch
    const webhookRes1 = await plisioService.handleWebhookCallback({
      order_number: invoice.orderNumber,
      status: 'completed',
      paid_sum: '25.00',
      amount: '25.00',
      currency: 'USDT_TRX',
    });

    expect(webhookRes1.success).toBe(true);
    expect(db.getSession(testSessionId)?.credits).toBe(initialCredits + 500);

    // Second webhook dispatch (duplicate webhook) should NOT double credit
    const webhookRes2 = await plisioService.handleWebhookCallback({
      order_number: invoice.orderNumber,
      status: 'completed',
      paid_sum: '25.00',
      amount: '25.00',
    });

    expect(webhookRes2.success).toBe(true);
    expect(db.getSession(testSessionId)?.credits).toBe(initialCredits + 500);
  });
});
