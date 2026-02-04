'use client';

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Sun,
  Moon,
  Monitor,
  Type,
  Download,
  Upload,
  Trash2,
  CheckCircle,
  AlertTriangle,
} from 'lucide-react';
import { useTheme } from '@/contexts/ThemeContext';
import { useToast } from '@/contexts/ToastContext';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import type { AppSettings, ExportData, Player, LeagueData } from '@/types';

const FONT_SIZE_KEY = 'tennis-app-font-size';

export default function SettingsPage() {
  const router = useRouter();
  const { theme, setTheme } = useTheme();
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [fontSize, setFontSizeState] = useState<AppSettings['fontSize']>('normal');
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [importError, setImportError] = useState<string | null>(null);

  // Load font size preference
  useEffect(() => {
    const saved = localStorage.getItem(FONT_SIZE_KEY) as AppSettings['fontSize'] | null;
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
    localStorage.setItem(FONT_SIZE_KEY, size);
    applyFontSize(size);
    showToast('글꼴 크기가 변경되었습니다', 'success');
  };

  // Export data
  const handleExport = useCallback(() => {
    try {
      const players = JSON.parse(localStorage.getItem('tennis-players') || '[]') as Player[];
      const leagues: (LeagueData | null)[] = [
        JSON.parse(localStorage.getItem('league-slot-1') || 'null'),
        JSON.parse(localStorage.getItem('league-slot-2') || 'null'),
        JSON.parse(localStorage.getItem('league-slot-3') || 'null'),
      ];

      const exportData: ExportData = {
        version: '1.0.0',
        exportedAt: new Date().toISOString(),
        players,
        leagues,
        settings: {
          theme,
          fontSize,
        },
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `tennis-league-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      showToast('데이터가 내보내기되었습니다', 'success');
    } catch (error) {
      showToast('내보내기에 실패했습니다', 'error');
    }
  }, [theme, fontSize, showToast]);

  // Import data
  const handleImport = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const data = JSON.parse(event.target?.result as string) as ExportData;

        // Validate data structure
        if (!data.version || !data.players || !Array.isArray(data.players)) {
          throw new Error('잘못된 데이터 형식입니다');
        }

        // Import players
        localStorage.setItem('tennis-players', JSON.stringify(data.players));

        // Import leagues
        if (data.leagues) {
          data.leagues.forEach((league, index) => {
            if (league) {
              localStorage.setItem(`league-slot-${index + 1}`, JSON.stringify(league));
            }
          });
        }

        // Import settings
        if (data.settings) {
          if (data.settings.theme) {
            setTheme(data.settings.theme);
          }
          if (data.settings.fontSize) {
            handleFontSizeChange(data.settings.fontSize);
          }
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

    // Reset file input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [setTheme, showToast]);

  // Reset all data
  const handleReset = useCallback(() => {
    localStorage.removeItem('tennis-players');
    localStorage.removeItem('league-slot-1');
    localStorage.removeItem('league-slot-2');
    localStorage.removeItem('league-slot-3');
    localStorage.removeItem('current-league');
    localStorage.removeItem('current-slot-index');
    localStorage.removeItem('previous-rankings');

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
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200">
        <div className="max-w-md mx-auto px-4 py-4 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 hover:bg-slate-100 rounded-full transition-colors touch-target"
            aria-label="뒤로 가기"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <h1 className="text-lg font-bold text-slate-900">설정</h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-6">
        {/* Theme Section */}
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
                {theme === option.value && (
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                )}
              </button>
            ))}
          </div>
        </section>

        {/* Font Size Section */}
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
                <span
                  className="font-bold"
                  style={{
                    fontSize:
                      option.value === 'normal'
                        ? '16px'
                        : option.value === 'large'
                        ? '18px'
                        : '20px',
                  }}
                >
                  {option.sample}
                </span>
                <span className="text-xs font-medium">{option.label}</span>
              </button>
            ))}
          </div>
        </section>

        {/* Data Management Section */}
        <section className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="text-sm font-bold text-slate-700 mb-4">데이터 관리</h2>
          <div className="space-y-3">
            <button
              onClick={handleExport}
              className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors touch-target"
            >
              <Download className="w-5 h-5 text-blue-600" />
              <div className="flex-1 text-left">
                <div className="font-medium text-slate-900">데이터 내보내기</div>
                <div className="text-xs text-slate-500">
                  선수, 리그 데이터를 JSON 파일로 백업
                </div>
              </div>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="w-full flex items-center gap-3 p-4 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors touch-target"
            >
              <Upload className="w-5 h-5 text-green-600" />
              <div className="flex-1 text-left">
                <div className="font-medium text-slate-900">데이터 가져오기</div>
                <div className="text-xs text-slate-500">
                  백업 파일에서 데이터 복원
                </div>
              </div>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".json"
              onChange={handleImport}
              className="hidden"
            />

            {importError && (
              <div className="flex items-center gap-2 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
                <AlertTriangle className="w-4 h-4" />
                {importError}
              </div>
            )}

            <button
              onClick={() => setShowResetDialog(true)}
              className="w-full flex items-center gap-3 p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors touch-target"
            >
              <Trash2 className="w-5 h-5 text-red-600" />
              <div className="flex-1 text-left">
                <div className="font-medium text-red-700">모든 데이터 초기화</div>
                <div className="text-xs text-red-500">
                  모든 선수 및 리그 데이터 삭제
                </div>
              </div>
            </button>
          </div>
        </section>

        {/* App Info */}
        <section className="text-center text-sm text-slate-400 py-4">
          <p>러브포티 리그 매니저 v1.0.0</p>
          <p className="mt-1">L40 Rank 테니스 리그</p>
        </section>
      </div>

      {/* Reset Confirm Dialog */}
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
