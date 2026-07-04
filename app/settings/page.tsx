'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import {
  Sun, Moon, Monitor, Type, Download, Upload, Trash2, CheckCircle, AlertTriangle, FileText, Copy,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { AppSettings, ExportData, Player, LeagueData, SeasonArchive, PlayerCareerStats } from '@/types';
import { safeGetAsync, safeSetAsync, safeRemoveAsync } from '@/lib/storage';
import { safeGetString, safeSetString, safeRemove } from '@/lib/storage';
import { PlayersArraySchema, LeagueDataSchema, SeasonHistorySchema, PlayerCareerStatsArraySchema } from '@/lib/schemas';
import { generateSeasonReportText } from '@/lib/seasonReport';
import { copyToClipboard } from '@/utils/shareUtils';

const FONT_SIZE_KEY = 'tennis-app-font-size';

export default function SettingsPage() {
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fontSize, setFontSizeState] = useState<AppSettings['fontSize']>('normal');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);
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

  const handleExport = useCallback(async () => {
    try {
      const players = await safeGetAsync('tennis-players', PlayersArraySchema) ?? [];
      const leagues: (LeagueData | null)[] = await Promise.all([
        safeGetAsync('league-slot-1', LeagueDataSchema).then(d => d ?? null),
        safeGetAsync('league-slot-2', LeagueDataSchema).then(d => d ?? null),
        safeGetAsync('league-slot-3', LeagueDataSchema).then(d => d ?? null),
      ]);
      const seasonHistory = await safeGetAsync('season-history', SeasonHistorySchema) ?? [];
      const playerCareerStats = await safeGetAsync('player-career-stats', PlayerCareerStatsArraySchema) ?? [];

      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        players,
        leagues,
        settings: { theme, fontSize },
        seasonHistory,
        playerCareerStats,
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tennis-league-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('데이터가 내보내기되었습니다', 'success');
    } catch {
      showToast('내보내기에 실패했습니다', 'error');
    }
  }, [theme, fontSize, showToast]);

  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ExportData;

        if (!data.version || !data.players || !Array.isArray(data.players)) {
          throw new Error('잘못된 데이터 형식입니다');
        }

        await safeSetAsync('tennis-players', data.players);

        if (data.leagues) {
          for (let i = 0; i < data.leagues.length; i++) {
            if (data.leagues[i]) {
              await safeSetAsync(`league-slot-${i + 1}`, data.leagues[i]);
            }
          }
        }

        if (data.settings) {
          if (data.settings.theme) setTheme(data.settings.theme);
          if (data.settings.fontSize) handleFontSizeChange(data.settings.fontSize);
        }

        if (data.seasonHistory) {
          await safeSetAsync('season-history', data.seasonHistory);
        }
        if (data.playerCareerStats) {
          await safeSetAsync('player-career-stats', data.playerCareerStats);
        }

        showToast('데이터를 가져왔습니다', 'success');
        setImportError(null);
      } catch (error) {
        const message = error instanceof Error ? error.message : '가져오기에 실패했습니다';
        setImportError(message);
        showToast(message, 'error');
      }
    };
    reader.readAsText(file);

    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [setTheme, showToast]);

  const handleReset = useCallback(async () => {
    await safeRemoveAsync('tennis-players');
    await safeRemoveAsync('league-slot-1');
    await safeRemoveAsync('league-slot-2');
    await safeRemoveAsync('league-slot-3');
    await safeRemoveAsync('current-league');
    await safeRemoveAsync('previous-rankings');
    await safeRemoveAsync('finished-dates');
    await safeRemoveAsync('season-history');
    await safeRemoveAsync('player-career-stats');
    await safeRemoveAsync('current-season-peaks');
    safeRemove('current-slot-index');

    setSeasonHistory([]);
    setShowResetDialog(false);
    showToast('모든 데이터가 초기화되었습니다', 'success');
  }, [showToast]);

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
    <div className="min-h-screen bg-slate-50 pb-24">
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-slate-900">설정</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">테마</h2>
          <div className="grid grid-cols-3 gap-2">
            {themeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => setTheme(option.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all touch-target ${
                  theme === option.value
                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
                }`}
                aria-pressed={theme === option.value}
              >
                {option.icon}
                <span className="text-xs font-medium">{option.label}</span>
                {theme === option.value && <CheckCircle className="w-4 h-4 text-blue-600" />}
              </button>
            ))}
          </div>
        </section>

        <section className="bg-white rounded-xl p-4 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Type className="w-5 h-5 text-slate-600" />
            <h2 className="text-sm font-bold text-slate-700">글꼴 크기</h2>
          </div>
          <div className="grid grid-cols-3 gap-2">
            {fontSizeOptions.map((option) => (
              <button
                key={option.value}
                onClick={() => handleFontSizeChange(option.value)}
                className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all touch-target ${
                  fontSize === option.value
                    ? 'bg-blue-100 text-blue-600 ring-2 ring-blue-500'
                    : 'bg-slate-50 text-slate-600 hover:bg-slate-100'
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

        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">데이터 관리</h2>
          <div className="space-y-3">
            <button onClick={handleExport} className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors touch-target">
              <Download className="w-5 h-5 text-blue-600" />
              <div className="flex-1 text-left">
                <div className="font-medium text-slate-900">데이터 내보내기</div>
                <div className="text-xs text-slate-500">선수, 리그 데이터를 JSON 파일로 백업</div>
              </div>
            </button>

            <button onClick={() => fileInputRef.current?.click()} className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors touch-target">
              <Upload className="w-5 h-5 text-green-600" />
              <div className="flex-1 text-left">
                <div className="font-medium text-slate-900">데이터 가져오기</div>
                <div className="text-xs text-slate-500">백업 파일에서 데이터 복원</div>
              </div>
            </button>
            <input ref={fileInputRef} type="file" accept=".json" onChange={handleImport} className="hidden" />

            {importError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                {importError}
              </div>
            )}

            <button onClick={() => setShowResetDialog(true)} className="w-full flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors touch-target">
              <Trash2 className="w-5 h-5 text-red-600" />
              <div className="flex-1 text-left">
                <div className="font-medium text-red-700">모든 데이터 초기화</div>
                <div className="text-xs text-red-500">모든 선수 및 리그 데이터 삭제</div>
              </div>
            </button>
          </div>
        </section>

        {seasonHistory.length > 0 && (
          <section className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex items-center gap-2 mb-1">
              <FileText className="w-5 h-5 text-slate-600" />
              <h2 className="text-sm font-bold text-slate-700">시즌 리포트</h2>
            </div>
            <p className="text-xs text-slate-500 mb-4">
              최종 순위와 선수별 파트너 케미·상대 전적을 텍스트로 복사합니다
            </p>
            <div className="space-y-2">
              {[...seasonHistory].reverse().map((archive) => (
                <button
                  key={archive.id}
                  onClick={() => handleCopySeasonReport(archive)}
                  className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors touch-target"
                >
                  <Copy className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <div className="flex-1 text-left min-w-0">
                    <div className="font-medium text-slate-900 truncate">{archive.leagueName}</div>
                    <div className="text-xs text-slate-500">
                      {archive.seasonStart} ~ {archive.seasonEnd} · 정규 {archive.totalMatches}경기
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </section>
        )}

        <section className="text-center text-sm text-slate-400 py-4">
          <p>러브포티 테니스 리그 매니저 v2.0</p>
          <p className="mt-1">by 한PD</p>
        </section>
      </div>

      <ConfirmDialog
        isOpen={showResetDialog}
        title="모든 데이터 초기화"
        message="선수 정보, 리그 데이터가 모두 삭제됩니다. 복원할 수 없습니다."
        confirmText="초기화"
        variant="danger"
        requireDoubleConfirm
        onConfirm={handleReset}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  );
}
