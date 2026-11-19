'use client';

import React, { useState, useCallback, useEffect } from 'react';
import {
  Sun, Moon, Monitor, Type, CheckCircle, FileText, Copy, LogOut, UserCircle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import AppLogo from '@/components/ui/AppLogo';
import type { AppSettings, SeasonArchive } from '@/types';
import { safeGetAsync, safeGetString, safeSetString } from '@/lib/storage';
import { SeasonHistorySchema } from '@/lib/schemas';
import { generateSeasonReportText } from '@/lib/seasonReport';
import { copyToClipboard } from '@/utils/shareUtils';

const FONT_SIZE_KEY = 'tennis-app-font-size';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const { isAdmin, isConfigured, signOut } = useAuth();

  const [fontSize, setFontSizeState] = useState<AppSettings['fontSize']>('normal');
  const [seasonHistory, setSeasonHistory] = useState<SeasonArchive[]>([]);

  useEffect(() => {
    safeGetAsync('season-history', SeasonHistorySchema).then(history => {
      if (history) setSeasonHistory(history);
    });
  }, []);

  const handleCopySeasonReport = useCallback(async (archive: SeasonArchive) => {
    const ok = await copyToClipboard(generateSeasonReportText(archive));
    showToast(ok ? '시즌 리포트가 복사되었습니다' : '복사에 실패했습니다', ok ? 'success' : 'error');
  }, [showToast]);

  useEffect(() => {
    const saved = safeGetString(FONT_SIZE_KEY) as AppSettings['fontSize'] | undefined;
    if (saved) {
      setFontSizeState(saved);
      applyFontSize(saved);
    }
  }, []);

  const applyFontSize = (size: AppSettings['fontSize']) => {
    const scales = { normal: '1', large: '1.1', xlarge: '1.2' };
    document.documentElement.style.setProperty('--font-scale', scales[size]);
  };

  const handleFontSizeChange = (size: AppSettings['fontSize']) => {
    setFontSizeState(size);
    safeSetString(FONT_SIZE_KEY, size);
    applyFontSize(size);
    showToast('글꼴 크기가 변경되었습니다', 'success');
  };

  const themeOptions: { value: AppSettings['theme']; icon: React.ReactNode; label: string }[] = [
    { value: 'light', icon: <Sun className="w-5 h-5" />, label: '라이트' },
    { value: 'dark', icon: <Moon className="w-5 h-5" />, label: '다크' },
    { value: 'system', icon: <Monitor className="w-5 h-5" />, label: '시스템' },
  ];

  const fontSizeOptions: { value: AppSettings['fontSize']; label: string; sample: string }[] = [
    { value: 'normal', label: '보통', sample: 'Aa' },
    { value: 'large', label: '크게', sample: 'Aa' },
    { value: 'xlarge', label: '아주 크게', sample: 'Aa' },
  ];

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="sticky top-0 z-10 bg-card border-b border-line">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <AppLogo size={26} /> 설정
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {isConfigured && (
          <section className="bg-card border border-line rounded-xl p-4">
            <h2 className="text-sm font-semibold text-ink tracking-tight mb-4">운영진 모드</h2>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <UserCircle className="w-9 h-9 text-ink-faint" />
                <div>
                  <div className="font-medium text-ink">{isAdmin ? '켜져 있음' : '꺼져 있음'}</div>
                  <div className="text-xs text-ink-mute">
                    {isAdmin ? '이 기기에서 경기 입력·시즌 관리를 할 수 있습니다' : '경기 입력은 운영진 코드가 있어야 합니다'}
                  </div>
                </div>
              </div>
              {isAdmin ? (
                <button
                  onClick={() => signOut()}
                  className="flex items-center gap-1.5 text-sm text-ink-mute hover:text-down hover:bg-down/10 px-3 py-2 rounded-lg transition-colors touch-target"
                >
                  <LogOut className="w-4 h-4" /> 끄기
                </button>
              ) : (
                <a href="/login" className="text-sm font-bold text-accent px-3 py-2 touch-target flex items-center">
                  코드 입력
                </a>
              )}
            </div>
          </section>
        )}

        <section className="bg-card border border-line rounded-xl p-4">
          <h2 className="text-sm font-semibold text-ink tracking-tight mb-4">테마</h2>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all touch-target ${
                  theme === option.value
                    ? 'bg-accent-soft text-accent ring-2 ring-accent'
                    : 'bg-card-soft text-ink-soft hover:bg-line'
                }`}
                aria-pressed={theme === option.value}
              >
                {option.icon}
                <span className="text-xs font-medium">{option.label}</span>
                {theme === option.value && <CheckCircle className="w-4 h-4 text-accent" />}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-card border border-line rounded-xl p-4">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-ink-mute" />
            <h2 className="text-sm font-semibold text-ink tracking-tight">글꼴 크기</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFontSizeChange(option.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all touch-target ${
                  fontSize === option.value
                    ? 'bg-accent-soft text-accent ring-2 ring-accent'
                    : 'bg-card-soft text-ink-soft hover:bg-line'
                }`}
                aria-pressed={fontSize === option.value}
              >
                <span className="font-bold" style={{ fontSize: option.value === 'normal' ? '16px' : option.value === 'large' ? '18px' : '20px' }}>
                  {option.sample}
                </span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        {seasonHistory.length > 0 && (
          <section className="bg-card border border-line rounded-xl p-4">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-ink-mute" />
              <h2 className="text-sm font-semibold text-ink tracking-tight">시즌 리포트</h2>
            </div>
            <p className="text-xs text-ink-mute mb-4">
              최종 순위와 선수별 파트너 케미·상대 전적을 텍스트로 복사합니다
            </p>
            <div className="space-y-2">
              {[...seasonHistory].reverse().map((archive) => (
                <button
                  key={archive.id}
                  onClick={() => handleCopySeasonReport(archive)}
                  className="w-full flex items-center gap-3 p-4 bg-card-soft hover:bg-line rounded-xl transition-colors touch-target"
                >
                  <Copy className="w-5 h-5 text-accent flex-shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-ink truncate">{archive.leagueName}</div>
                    <div className="text-xs text-ink-mute">
                      {archive.seasonStart} ~ {archive.seasonEnd} · 정규 {archive.totalMatches}경기
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="text-center text-sm text-ink-faint py-4">
          <p>러브포티 테니스 리그 매니저 v2.0</p>
          <p className="mt-1">by 한PD</p>
        </section>
      </div>
    </div>
  );
}
