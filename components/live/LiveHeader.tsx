'use client';

import { Wifi, WifiOff, Loader2, AlertTriangle } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';

type ConnectionStatus = 'connecting' | 'connected' | 'disconnected' | 'error';

interface LiveHeaderProps {
  leagueName: string;
  connectionStatus: ConnectionStatus;
  updatedAt: string;
}

function formatTimeAgo(isoString: string): string {
  if (!isoString) return '';
  const diff = Date.now() - new Date(isoString).getTime();
  const seconds = Math.floor(diff / 1000);
  if (seconds < 10) return '방금 전';
  if (seconds < 60) return `${seconds}초 전`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  return `${hours}시간 전`;
}

const statusConfig: Record<ConnectionStatus, { icon: typeof Wifi; label: string; color: string }> = {
  connecting: { icon: Loader2, label: '연결 중', color: 'text-amber-500 bg-amber-500/10' },
  connected: { icon: Wifi, label: '실시간', color: 'text-up bg-up/10' },
  disconnected: { icon: WifiOff, label: '연결 끊김', color: 'text-ink-mute bg-card-soft' },
  error: { icon: AlertTriangle, label: '오류', color: 'text-down bg-down/10' },
};

export function LiveHeader({ leagueName, connectionStatus, updatedAt }: LiveHeaderProps) {
  const { icon: Icon, label, color } = statusConfig[connectionStatus];

  return (
    <div className="bg-card rounded-2xl border border-line p-4">
      <div className="flex items-center justify-between mb-1">
        <div className="flex items-center gap-2">
          <AppLogo size={28} />
          <h1 className="text-xl font-black text-ink tracking-tight truncate">{leagueName || '리그'}</h1>
        </div>
        <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ${color}`}>
          <Icon className={`w-3 h-3 ${connectionStatus === 'connecting' ? 'animate-spin' : ''}`} />
          {label}
        </div>
      </div>
      {updatedAt && (
        <p className="text-xs text-ink-faint">
          마지막 업데이트: {formatTimeAgo(updatedAt)}
        </p>
      )}
    </div>
  );
}
