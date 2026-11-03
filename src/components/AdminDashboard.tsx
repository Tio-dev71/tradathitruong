import React, { useState, useEffect } from 'react';
import { useGameStore } from '../store/gameStore';
import { soundEngine } from '../services/soundEngine';
import type { AdminStats } from '../types/signal';

interface Props {
  standalone?: boolean;
}

export const AdminDashboard: React.FC<Props> = ({ standalone = false }) => {
  const { isAdminOpen, setIsAdminOpen } = useGameStore();
  const [token, setToken] = useState('admin-tra-da-2026');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [acceptRate, setAcceptRate] = useState(0.8);
  const [cooldownSec, setCooldownSec] = useState(60);
  const [providerMode, setProviderMode] = useState<'MOCK' | 'WEBHOOK'>('WEBHOOK');
  const [loading, setLoading] = useState(false);
  const [feedbackMsg, setFeedbackMsg] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch(`/api/admin/stats?token=${encodeURIComponent(token)}`);
      if (res.ok) {
        const json = await res.json();
        setStats(json.data);
        setAcceptRate(json.data.acceptRate);
        setCooldownSec(json.data.cooldownSeconds);
        setProviderMode(json.data.providerMode);
        setIsAuthenticated(true);
      } else {
        setIsAuthenticated(false);
      }
    } catch {
      setIsAuthenticated(false);
    }
  };

  useEffect(() => {
    if (isAdminOpen || standalone) {
      fetchStats();
    }
  }, [isAdminOpen, standalone]);

  if (!isAdminOpen && !standalone) return null;

  const handleSaveConfig = async () => {
    soundEngine.playUiClick();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/config?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          acceptRate,
          cooldownSeconds: cooldownSec,
          providerMode,
        }),
      });
      if (res.ok) {
        setFeedbackMsg('✅ Đã cập nhật cấu hình hệ thống thành công!');
        fetchStats();
      } else {
        setFeedbackMsg('❌ Lỗi khi cập nhật cấu hình');
      }
    } catch (e: any) {
      setFeedbackMsg('❌ Lỗi kết nối: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleTestWebhook = async () => {
    soundEngine.playUiClick();
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/test-webhook?token=${encodeURIComponent(token)}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: 'BTC/USDT (PROD FEED)',
          market: 'CRYPTO',
          direction: 'LONG',
          entry: '92,100',
          stopLoss: '90,500',
          takeProfit: ['94,000', '96,500'],
          timeframe: '4H',
          note: 'Tín hiệu Webhook test từ Admin Dashboard',
        }),
      });
      const data = await res.json();
      if (data.success) {
        setFeedbackMsg(`🚀 Test Webhook thành công! EventId: ${data.eventId}`);
        fetchStats();
      } else {
        setFeedbackMsg('❌ Test Webhook thất bại: ' + data.error);
      }
    } catch (e: any) {
      setFeedbackMsg('❌ Lỗi: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={standalone ? "min-h-screen w-full bg-[#120b06] p-4 sm:p-8 flex flex-col items-center justify-start overflow-y-auto select-auto" : "fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 overflow-y-auto"}>
      <div className={`relative w-full ${standalone ? 'max-w-5xl my-4' : 'max-w-4xl max-h-[90vh] overflow-y-auto'} bg-[#1b120a] border-2 border-amber-600 rounded-3xl p-6 sm:p-8 shadow-2xl text-amber-100`}>
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-4 border-b border-amber-900/60">
          <div className="flex items-center gap-3">
            <span className="text-2xl">⚙️</span>
            <div>
              <h2 className="text-xl font-extrabold text-amber-300">
                ADMIN CONTROL PANEL - TRÀ ĐÁ THỊ TRƯỜNG
              </h2>
              <p className="text-xs text-amber-400/70">Giám sát Realtime, Cấu hình Xác Suất 80/20 & Webhook Ingestion</p>
            </div>
          </div>

          {standalone ? (
            <a
              href="/"
              className="text-amber-300 hover:text-white px-3.5 py-2 rounded-xl bg-amber-950 border border-amber-700 text-xs font-bold transition flex items-center gap-1.5 shadow"
            >
              <span>← Vào Quán Trà</span>
            </a>
          ) : (
            <button
              onClick={() => {
                soundEngine.playUiClick();
                setIsAdminOpen(false);
              }}
              className="text-amber-400 hover:text-white p-2 rounded-xl bg-amber-950 border border-amber-800 text-sm cursor-pointer"
            >
              ✕ Đóng
            </button>
          )}
        </div>

        {/* Feedback alert */}
        {feedbackMsg && (
          <div className="mb-4 p-3 rounded-xl bg-amber-950/80 border border-amber-500/60 text-xs font-bold text-amber-200">
            {feedbackMsg}
          </div>
        )}

        {!isAuthenticated ? (
          <div className="p-6 text-center space-y-4">
            <p className="text-sm text-amber-200">Vui lòng nhập Admin Token để truy cập trang quản trị:</p>
            <div className="flex max-w-md mx-auto gap-2">
              <input
                type="password"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                placeholder="Nhập ADMIN_TOKEN..."
                className="flex-1 px-4 py-2 rounded-xl bg-black/60 border border-amber-700 text-white font-mono text-sm"
              />
              <button
                onClick={fetchStats}
                className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-sm cursor-pointer"
              >
                Đăng Nhập
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Realtime Stats Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-900">
                <span className="text-xs text-stone-400 block">ĐANG ONLINE</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  {stats?.onlineCount || 0} người
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-900">
                <span className="text-xs text-stone-400 block">TỔNG XIN KÈO</span>
                <span className="text-2xl font-black text-amber-300 font-mono">
                  {stats?.totalRequests || 0}
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-900">
                <span className="text-xs text-stone-400 block">BÀ ĐỒNG Ý</span>
                <span className="text-2xl font-black text-emerald-300 font-mono">
                  {stats?.totalAccepted || 0} ({stats?.totalRequests ? Math.round((stats.totalAccepted / stats.totalRequests) * 100) : 80}%)
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-amber-900">
                <span className="text-xs text-stone-400 block">BÀ TỪ CHỐI</span>
                <span className="text-2xl font-black text-rose-400 font-mono">
                  {stats?.totalRejected || 0}
                </span>
              </div>
            </div>

            {/* Config Form */}
            <div className="p-5 rounded-2xl bg-black/40 border border-amber-900/60 space-y-4">
              <h3 className="font-bold text-sm text-amber-300 uppercase tracking-wide">
                ⚙️ Cấu Hình Xác Suất & Tín Hiệu
              </h3>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                {/* 80/20 Acceptance Rate */}
                <div>
                  <label className="block text-stone-300 font-bold mb-1">
                    Tỷ Lệ Đồng Ý: {Math.round(acceptRate * 100)}% ({Math.round((1 - acceptRate) * 100)}% Từ chối)
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="1"
                    step="0.05"
                    value={acceptRate}
                    onChange={(e) => setAcceptRate(parseFloat(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                  <div className="flex justify-between text-[10px] text-stone-400 mt-1">
                    <span>0% (Khắt khe)</span>
                    <span>80% (Mặc định)</span>
                    <span>100% (Cho hết)</span>
                  </div>
                </div>

                {/* Cooldown Seconds */}
                <div>
                  <label className="block text-stone-300 font-bold mb-1">
                    Thời Gian Chờ Cooldown (Giây)
                  </label>
                  <input
                    type="number"
                    min="5"
                    max="600"
                    value={cooldownSec}
                    onChange={(e) => setCooldownSec(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-amber-800 text-white font-mono"
                  />
                </div>

                {/* Provider Mode */}
                <div>
                  <label className="block text-stone-300 font-bold mb-1">Nguồn Cung Cấp Tín Hiệu</label>
                  <select
                    value={providerMode}
                    onChange={(e) => setProviderMode(e.target.value as any)}
                    className="w-full px-3 py-1.5 rounded-lg bg-black/60 border border-amber-800 text-amber-200 font-mono"
                  >
                    <option value="MOCK">Mock Engine (Demo)</option>
                    <option value="WEBHOOK">Webhook Ingestion (Live Feed)</option>
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  disabled={loading}
                  onClick={handleSaveConfig}
                  className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-black font-bold text-xs cursor-pointer transition shadow"
                >
                  Lưu Cấu Hình
                </button>

                <button
                  disabled={loading}
                  onClick={handleTestWebhook}
                  className="px-5 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white font-bold text-xs cursor-pointer transition shadow"
                >
                  ⚡ Gửi Test Webhook Signal
                </button>
              </div>
            </div>

            {/* Active Players Table */}
            <div className="p-4 rounded-2xl bg-black/40 border border-amber-900/60">
              <h3 className="font-bold text-sm text-amber-300 mb-2 uppercase">
                👥 Người Chơi Trong Quán ({stats?.activePlayers.length || 0})
              </h3>
              <div className="max-h-36 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-amber-950 text-stone-400 font-mono">
                      <th className="py-1">Biệt danh</th>
                      <th className="py-1">Vai trò</th>
                      <th className="py-1">Session ID</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats?.activePlayers.map((p) => (
                      <tr key={p.id} className="border-b border-amber-950/40">
                        <td className="py-1.5 font-bold text-white">{p.nickname}</td>
                        <td className="py-1.5 text-amber-300">{p.role}</td>
                        <td className="py-1.5 font-mono text-[10px] text-stone-400">{p.id}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Recent Signals & Webhook Events */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Signals */}
              <div className="p-4 rounded-2xl bg-black/40 border border-amber-900/60">
                <h3 className="font-bold text-xs text-amber-300 mb-2 uppercase">
                  📡 Tín Hiệu Trong Hệ Thống ({stats?.signals.length || 0})
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-2 text-xs">
                  {stats?.signals.map((s) => (
                    <div key={s.id} className="p-2 rounded bg-black/50 border border-amber-950 text-[11px]">
                      <div className="flex justify-between items-center font-bold">
                        <span className="text-white">{s.symbol}</span>
                        <span className={`px-1.5 rounded ${s.direction === 'LONG' ? 'bg-emerald-900 text-emerald-300' : 'bg-rose-900 text-rose-300'}`}>
                          {s.direction}
                        </span>
                      </div>
                      <div className="font-mono text-stone-400 text-[10px] mt-0.5">
                        Entry: {s.entry} | SL: {s.stopLoss} | Nguồn: {s.source}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Webhook logs */}
              <div className="p-4 rounded-2xl bg-black/40 border border-amber-900/60">
                <h3 className="font-bold text-xs text-amber-300 mb-2 uppercase">
                  📝 Lịch Sử Webhook Events
                </h3>
                <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs font-mono">
                  {stats?.webhookLogs.length === 0 ? (
                    <p className="text-stone-500 italic">Chưa có webhook event nào</p>
                  ) : (
                    stats?.webhookLogs.map((log) => (
                      <div key={log.eventId} className="p-1.5 rounded bg-black/50 border border-amber-950 text-[11px] flex justify-between">
                        <span className="text-stone-300 truncate max-w-[160px]">{log.eventId}</span>
                        <span className={log.status === 'SUCCESS' ? 'text-emerald-400' : 'text-rose-400'}>
                          {log.status}
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

