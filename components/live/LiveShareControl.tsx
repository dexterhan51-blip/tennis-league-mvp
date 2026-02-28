'use client';

import { useState } from 'react';
import { Radio, Copy, Check, X, Loader2, LinkIcon, Unlink } from 'lucide-react';
import { copyToClipboard } from '@/utils/shareUtils';

interface LiveShareControlProps {
  isConfigured: boolean;
  isPublished: boolean;
  isSyncing: boolean;
  shareUrl: string | null;
  onPublish: (pin: string) => Promise<{ success: boolean; error?: string }>;
  onUnpublish: () => Promise<void>;
}

export function LiveShareControl({
  isConfigured,
  isPublished,
  isSyncing,
  shareUrl,
  onPublish,
  onUnpublish,
}: LiveShareControlProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  if (!isConfigured) return null;

  const handlePublish = async () => {
    if (pinInput.length !== 4) {
      setErrorMsg('4자리 PIN을 입력하세요.');
      return;
    }
    setIsSubmitting(true);
    setErrorMsg('');
    const result = await onPublish(pinInput);
    setIsSubmitting(false);
    if (result.success) {
      setShowDialog(false);
      setPinInput('');
    } else {
      setErrorMsg(result.error || '공유에 실패했습니다.');
    }
  };

  const handleCopyUrl = async () => {
    if (!shareUrl) return;
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleUnpublish = async () => {
    await onUnpublish();
    setShowUnpublishConfirm(false);
  };

  // 이미 공유 중인 상태
  if (isPublished) {
    return (
      <>
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyUrl}
            className="flex items-center gap-1.5 bg-green-50 border border-green-200 text-green-700 px-3 py-1.5 rounded-lg font-bold text-xs touch-target cursor-pointer active:scale-[0.98] transition-transform"
            aria-label="공유 URL 복사"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? '복사됨' : 'URL 복사'}
            {isSyncing && <Loader2 size={12} className="animate-spin" />}
          </button>
          <button
            onClick={() => setShowUnpublishConfirm(true)}
            className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors touch-target"
            aria-label="공유 중지"
          >
            <Unlink size={14} />
          </button>
        </div>

        {/* 공유 중지 확인 */}
        {showUnpublishConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">실시간 공유 중지</h3>
              <p className="text-sm text-slate-500 mb-6">공유를 중지하면 대시보드 URL이 비활성화됩니다.</p>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowUnpublishConfirm(false)}
                  className="flex-1 py-3 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
                >
                  취소
                </button>
                <button
                  onClick={handleUnpublish}
                  className="flex-1 py-3 rounded-xl font-medium text-white bg-red-500 hover:bg-red-600 transition-colors touch-target"
                >
                  중지
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    );
  }

  // 공유 시작 버튼
  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-1 bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg font-bold text-xs border border-blue-200 touch-target cursor-pointer active:scale-[0.98] transition-transform"
        aria-label="실시간 공유"
      >
        <Radio size={14} /> 실시간 공유
      </button>

      {/* PIN 입력 다이얼로그 */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Radio size={20} className="text-blue-600" /> 실시간 공유
                </h3>
                <button onClick={() => { setShowDialog(false); setErrorMsg(''); }} className="p-1 hover:bg-slate-100 rounded-full touch-target">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                리그 데이터를 실시간으로 공유합니다. 관리용 4자리 PIN을 설정하세요.
              </p>

              <div className="mb-4">
                <label className="block text-xs font-bold text-slate-500 mb-2">관리 PIN (4자리 숫자)</label>
                <input
                  type="number"
                  inputMode="numeric"
                  maxLength={4}
                  value={pinInput}
                  onChange={(e) => {
                    const v = e.target.value.slice(0, 4);
                    setPinInput(v);
                    setErrorMsg('');
                  }}
                  placeholder="0000"
                  className="w-full text-center text-2xl font-black tracking-[0.5em] py-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none transition-colors"
                />
                {errorMsg && <p className="text-xs text-red-500 mt-2">{errorMsg}</p>}
              </div>

              <p className="text-[10px] text-slate-400 mb-4">
                PIN은 리그 데이터 수정 시 사용됩니다. 대시보드는 누구나 URL로 열람 가능합니다.
              </p>
            </div>

            <div className="flex gap-3 p-4 border-t border-slate-200">
              <button
                onClick={() => { setShowDialog(false); setErrorMsg(''); }}
                className="flex-1 py-3 rounded-xl font-medium text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors touch-target"
              >
                취소
              </button>
              <button
                onClick={handlePublish}
                disabled={isSubmitting || pinInput.length !== 4}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors touch-target flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 생성 중...
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} /> 공유 시작
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
