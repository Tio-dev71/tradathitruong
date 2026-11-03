import React, { useState, useEffect, useRef } from 'react';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../services/soundEngine';

interface TopupPackage {
  credits: number;
  usd: number;
  label: string;
  badge?: string;
  popular?: boolean;
}

const PACKAGES: TopupPackage[] = [
  { credits: 100, usd: 5, label: 'Gói Trà Khởi Nghiệp', badge: '5u = 100 Xu' },
  { credits: 200, usd: 10, label: 'Gói Thợ Săn Kèo', badge: '10u = 200 Xu' },
  { credits: 500, usd: 25, label: 'Gói Bắt Đáy Đại Hiệp', badge: '25u = 500 Xu', popular: true },
  { credits: 1000, usd: 50, label: 'Gói Cá Mập Quán Nước', badge: '50u = 1000 Xu' },
];

const CRYPTO_CURRENCIES = [
  { id: 'USDT_TRX', name: 'USDT (TRC-20)', desc: 'Mạng Tron - Phí cực rẻ' },
  { id: 'USDT_BSC', name: 'USDT (BEP-20)', desc: 'Mạng BNB Smart Chain' },
  { id: 'SOL', name: 'Solana (SOL)', desc: 'Mạng Solana nhanh' },
  { id: 'TRX', name: 'Tron (TRX)', desc: 'Đồng coin mạng Tron' },
  { id: 'BNB', name: 'BNB (BNB Chain)', desc: 'Binance Coin' },
  { id: 'BTC', name: 'Bitcoin (BTC)', desc: 'Vua tiền mã hóa' },
  { id: 'ETH', name: 'Ethereum (ETH)', desc: 'Mạng Ethereum' },
];

interface InvoiceData {
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

export const TopupModal: React.FC = () => {
  const { isTopupOpen, setIsTopupOpen, player } = useGameStore();

  const [selectedPackage, setSelectedPackage] = useState<TopupPackage>(PACKAGES[0]);
  const [customUsd, setCustomUsd] = useState<string>('');
  const [selectedCurrency, setSelectedCurrency] = useState<string>('USDT_TRX');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<string>('new');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [isCopied, setIsCopied] = useState<boolean>(false);
  const [isSuccess, setIsSuccess] = useState<boolean>(false);
  const [isChecking, setIsChecking] = useState<boolean>(false);

  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Reset state when modal opens
  useEffect(() => {
    if (isTopupOpen) {
      setIsSuccess(false);
      setInvoice(null);
      setPaymentStatus('new');
      setStatusMessage('');
      setCustomUsd('');
      setSelectedPackage(PACKAGES[0]);
    } else {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
        pollIntervalRef.current = null;
      }
    }
  }, [isTopupOpen]);

  // Clean up polling on unmount
  useEffect(() => {
    return () => {
      if (pollIntervalRef.current) {
        clearInterval(pollIntervalRef.current);
      }
    };
  }, []);

  if (!isTopupOpen) return null;

  const currentUsd = customUsd ? parseFloat(customUsd) || 0 : selectedPackage.usd;
  const currentCredits = Math.floor((currentUsd / 5) * 100);

  // Tạo hóa đơn nạp xu qua Plisio
  const handleCreateInvoice = async () => {
    if (!player) return;
    if (currentUsd < 5) {
      alert('Số tiền nạp tối thiểu là 5 USD (tương đương 100 Xu).');
      return;
    }

    soundEngine.playUiClick();
    setIsLoading(true);
    setStatusMessage('Đang kết nối cổng thanh toán Plisio...');

    try {
      const res = await fetch('/api/payments/plisio/create-invoice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: player.id,
          amountUsd: currentUsd,
          currency: selectedCurrency,
        }),
      });

      const data = await res.json();
      if (data.success && data.data) {
        setInvoice(data.data);
        setPaymentStatus(data.data.status || 'new');
        setStatusMessage(data.data.message || 'Hóa đơn đã được tạo thành công! Vui lòng chuyển tiền.');
        startPolling(data.data.orderNumber);
      } else {
        alert(data.error || 'Không thể tạo hóa đơn nạp xu');
      }
    } catch (err: any) {
      alert('Lỗi kết nối máy chủ: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Bắt đầu tự động kiểm tra mỗi 5s
  const startPolling = (orderNumber: string) => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
    }

    pollIntervalRef.current = setInterval(() => {
      checkStatus(orderNumber, true);
    }, 5000);
  };

  // Kiểm tra trạng thái thanh toán từ Plisio (API check)
  const checkStatus = async (orderNumber: string, isSilent = false) => {
    if (!isSilent) {
      setIsChecking(true);
      soundEngine.playUiClick();
    }

    try {
      const res = await fetch(`/api/payments/plisio/check/${orderNumber}`);
      const data = await res.json();

      if (data.success) {
        setPaymentStatus(data.status);
        setStatusMessage(data.message);

        if (data.paid && data.status === 'completed') {
          setIsSuccess(true);
          soundEngine.playCoin();
          if (pollIntervalRef.current) {
            clearInterval(pollIntervalRef.current);
            pollIntervalRef.current = null;
          }
        }
      }
    } catch (err) {
      if (!isSilent) {
        console.error('Lỗi kiểm tra thanh toán:', err);
      }
    } finally {
      if (!isSilent) {
        setIsChecking(false);
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(true);
    soundEngine.playUiClick();
    setTimeout(() => setIsCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/85 backdrop-blur-md animate-fade-in pointer-events-auto">
      <div className="relative w-full max-w-xl max-h-[92vh] overflow-y-auto rounded-3xl bg-[#1c120c] border-2 border-amber-600/70 p-5 sm:p-7 shadow-[0_0_50px_rgba(217,119,6,0.35)] text-stone-200">
        
        {/* Nút đóng */}
        <button
          onClick={() => {
            soundEngine.playUiClick();
            setIsTopupOpen(false);
          }}
          className="absolute top-4 right-4 text-stone-400 hover:text-white p-2 rounded-xl bg-stone-900/60 hover:bg-stone-800 transition cursor-pointer"
        >
          ✕
        </button>

        {/* Header */}
        <div className="flex items-center gap-3.5 mb-5 border-b border-amber-800/50 pb-4">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-2xl shadow-lg border border-yellow-300">
            🪙
          </div>
          <div>
            <h2 className="text-xl sm:text-2xl font-black text-amber-300 tracking-wide uppercase">
              NẠP XU VÍ PLISIO
            </h2>
            <p className="text-xs text-amber-200/80 font-medium">
              Tỷ giá quy ước: <span className="font-bold text-amber-400">5 USDT = 100 Xu</span> (1 cốc trà 10 xu, 1 quẻ xóc đĩa 15 xu)
            </p>
          </div>
        </div>

        {/* Current user & xu info */}
        <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-stone-900/90 border border-stone-800 mb-5">
          <div className="flex items-center gap-2 text-xs">
            <span className="text-stone-400">Đại hiệp:</span>
            <span className="font-bold text-amber-300">{player?.nickname}</span>
            <span className="text-[10px] px-2 py-0.5 rounded bg-amber-950 text-amber-400 border border-amber-800/60">
              {player?.role}
            </span>
          </div>
          <div className="flex items-center gap-1.5 text-xs font-black text-yellow-400">
            <span>Ví hiện có:</span>
            <span className="px-2.5 py-1 rounded-xl bg-amber-950/80 border border-amber-500/60">
              🪙 {player?.credits ?? 0} Xu
            </span>
          </div>
        </div>

        {/* MAIN BODY: STEP 1 (Chọn gói) hoặc STEP 2 (Thanh toán Plisio) hoặc STEP 3 (Thành công) */}
        {isSuccess ? (
          /* TRẠNG THÁI THÀNH CÔNG */
          <div className="text-center py-6 sm:py-8 space-y-4">
            <div className="inline-block p-4 rounded-full bg-emerald-950 border-2 border-emerald-500 text-4xl animate-bounce shadow-[0_0_30px_rgba(16,185,129,0.5)]">
              🎉
            </div>
            <h3 className="text-2xl font-black text-emerald-400">
              NẠP XU THÀNH CÔNG!
            </h3>
            <p className="text-stone-300 text-sm max-w-md mx-auto">
              Đã cộng <span className="font-bold text-amber-300">+{invoice?.credits} Xu</span> vào hầu bao của bạn qua ví Plisio. Tha hồ thưởng trà, nghe bà soi kèo & gieo quẻ!
            </p>
            <div className="pt-3">
              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setIsTopupOpen(false);
                }}
                className="px-8 py-3 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm uppercase tracking-wide shadow-xl transition cursor-pointer"
              >
                Vào Quán Uống Trà Ngay!
              </button>
            </div>
          </div>
        ) : !invoice ? (
          /* BƯỚC 1: CHỌN GÓI VÀ LOẠI COIN */
          <div className="space-y-5">
            {/* Chọn gói Xu */}
            <div>
              <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5">
                1. Chọn Gói Nạp (5u = 100 Xu)
              </label>
              <div className="grid grid-cols-2 gap-2.5 sm:gap-3">
                {PACKAGES.map((pkg) => {
                  const isSelected = selectedPackage.credits === pkg.credits && !customUsd;
                  return (
                    <button
                      key={pkg.credits}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setSelectedPackage(pkg);
                        setCustomUsd('');
                      }}
                      className={`relative p-3.5 rounded-2xl text-left border transition cursor-pointer ${
                        isSelected
                          ? 'bg-gradient-to-br from-amber-700/80 to-amber-900/90 border-amber-400 shadow-[0_0_20px_rgba(217,119,6,0.3)]'
                          : 'bg-stone-900/70 hover:bg-stone-900 border-stone-800 text-stone-300'
                      }`}
                    >
                      {pkg.popular && (
                        <span className="absolute -top-2 right-2 px-2 py-0.5 rounded-full bg-red-600 text-[10px] font-black text-white shadow">
                          HOT
                        </span>
                      )}
                      <div className="font-black text-lg text-amber-200">
                        {pkg.credits} Xu
                      </div>
                      <div className="text-xs text-stone-400 mt-0.5">
                        {pkg.label}
                      </div>
                      <div className="text-xs font-bold text-amber-400 mt-2">
                        {pkg.usd} USDT (${pkg.usd})
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Hoặc nhập số tiền tùy chọn */}
            <div>
              <label className="block text-xs font-medium text-stone-400 mb-1.5">
                Hoặc nhập số USD tùy chọn (Tối thiểu $5):
              </label>
              <div className="relative">
                <input
                  type="number"
                  min="5"
                  step="5"
                  placeholder="Nhập số USDT (ví dụ: 15, 30...)"
                  value={customUsd}
                  onChange={(e) => {
                    setCustomUsd(e.target.value);
                  }}
                  className="w-full px-4 py-2.5 rounded-xl bg-stone-900 border border-stone-700 text-white text-sm focus:outline-none focus:border-amber-500 font-mono"
                />
                <div className="absolute right-3 top-2.5 text-xs font-bold text-amber-400">
                  = {currentCredits} Xu
                </div>
              </div>
            </div>

            {/* Chọn loại Cryptocurrency trên Plisio */}
            <div>
              <label className="block text-xs font-bold text-amber-300 uppercase tracking-wider mb-2.5">
                2. Chọn Đồng Coin Thanh Toán Trên Ví Plisio
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {CRYPTO_CURRENCIES.map((coin) => {
                  const isSelected = selectedCurrency === coin.id;
                  return (
                    <button
                      key={coin.id}
                      type="button"
                      onClick={() => {
                        soundEngine.playUiClick();
                        setSelectedCurrency(coin.id);
                      }}
                      className={`p-2.5 rounded-xl text-left border text-xs transition cursor-pointer ${
                        isSelected
                          ? 'bg-amber-950/80 border-amber-400 text-amber-200 font-bold'
                          : 'bg-stone-900/50 hover:bg-stone-900 border-stone-800 text-stone-400'
                      }`}
                    >
                      <div className="font-bold text-stone-200">{coin.name}</div>
                      <div className="text-[10px] text-stone-500 truncate">{coin.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Tóm tắt & Nút Tạo hóa đơn */}
            <div className="pt-2">
              <button
                disabled={isLoading || currentUsd < 5}
                onClick={handleCreateInvoice}
                className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 hover:from-amber-400 to-yellow-500 hover:to-yellow-400 text-stone-950 font-black text-sm uppercase tracking-wider shadow-xl transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <span className="animate-spin text-lg">⏳</span>
                    <span>Đang kết nối Plisio...</span>
                  </>
                ) : (
                  <>
                    <span>⚡</span>
                    <span>Tạo Hóa Đơn Plisio (${currentUsd} USDT ➔ {currentCredits} Xu)</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* BƯỚC 2: HÓA ĐƠN VÀ KIỂM TRA THANH TOÁN */
          <div className="space-y-4">
            {/* Thông tin đơn hàng */}
            <div className="p-4 rounded-2xl bg-stone-900/90 border border-stone-800 space-y-2 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Mã đơn hàng:</span>
                <span className="font-mono font-bold text-amber-300">{invoice.orderNumber}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Số tiền:</span>
                <span className="font-bold text-white">${invoice.amountUsd} USD (Nhận {invoice.credits} Xu)</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Đồng coin:</span>
                <span className="font-bold text-amber-400">{invoice.currency}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-stone-400">Trạng thái:</span>
                <span className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                  paymentStatus === 'completed'
                    ? 'bg-emerald-950 text-emerald-400 border border-emerald-700'
                    : paymentStatus === 'pending'
                    ? 'bg-blue-950 text-blue-300 border border-blue-700 animate-pulse'
                    : 'bg-amber-950 text-amber-300 border border-amber-700 animate-pulse'
                }`}>
                  {paymentStatus === 'completed' ? '✓ Đã Thanh Toán' : paymentStatus === 'pending' ? '⏳ Đang Xác Nhận...' : '⚡ Chờ Thanh Toán'}
                </span>
              </div>
            </div>

            {/* QR Code & Địa chỉ ví */}
            {invoice.walletHash && (
              <div className="p-4 rounded-2xl bg-black/60 border border-stone-800 text-center space-y-3">
                <div className="text-xs text-stone-400 font-medium">
                  Quét mã QR hoặc chuyển đúng số tiền vào địa chỉ ví bên dưới:
                </div>

                {invoice.qrCode && (
                  <div className="flex justify-center">
                    <img
                      src={invoice.qrCode}
                      alt="QR Code"
                      className="w-36 h-36 rounded-xl border border-stone-700 p-1 bg-white shadow-md"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <div className="text-[11px] text-stone-500">Địa chỉ ví nhận ({invoice.currency}):</div>
                  <div className="flex items-center gap-2 max-w-md mx-auto">
                    <input
                      type="text"
                      readOnly
                      value={invoice.walletHash}
                      className="w-full px-3 py-1.5 rounded-lg bg-stone-900 border border-stone-700 text-xs font-mono text-amber-300 select-all"
                    />
                    <button
                      onClick={() => handleCopy(invoice.walletHash || '')}
                      className="px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-stone-950 font-bold text-xs cursor-pointer transition shrink-0"
                    >
                      {isCopied ? '✓ Đã Copy' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Link mở trang thanh toán Plisio */}
            {invoice.invoiceUrl && (
              <div className="text-center">
                <a
                  href={invoice.invoiceUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-400 hover:text-amber-300 underline"
                >
                  <span>Mở trang thanh toán Plisio trong tab mới</span>
                  <span>↗</span>
                </a>
              </div>
            )}

            {/* Thông điệp trạng thái */}
            {statusMessage && (
              <div className="text-center text-xs text-amber-300/90 font-mono py-1">
                {statusMessage}
              </div>
            )}

            {/* Nút kiểm tra API */}
            <div className="pt-1">
              <button
                disabled={isChecking}
                onClick={() => checkStatus(invoice.orderNumber)}
                className="w-full py-3 px-4 rounded-2xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs uppercase tracking-wider shadow transition cursor-pointer flex items-center justify-center gap-2"
              >
                {isChecking ? (
                  <>
                    <span className="animate-spin text-sm">⏳</span>
                    <span>Đang kiểm tra từ Plisio...</span>
                  </>
                ) : (
                  <>
                    <span>🔄</span>
                    <span>Kiểm Tra Thanh Toán Ngay (API Check)</span>
                  </>
                )}
              </button>
            </div>

            {/* Nút Quay lại tạo đơn mới */}
            <div className="text-center pt-2">
              <button
                onClick={() => {
                  soundEngine.playUiClick();
                  setInvoice(null);
                  if (pollIntervalRef.current) {
                    clearInterval(pollIntervalRef.current);
                    pollIntervalRef.current = null;
                  }
                }}
                className="text-xs text-stone-500 hover:text-stone-300 underline cursor-pointer"
              >
                ← Chọn gói khác
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

