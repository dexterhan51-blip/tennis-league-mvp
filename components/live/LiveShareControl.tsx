'use client';

import { useState } from 'react';
import { Radio, Copy, Check, X, Loader2, LinkIcon, Unlink } from 'lucide-react';
import { copyToClipboard } from '@/utils/shareUtils';
import { useAuth } from '@/contexts/AuthContext';

interface LiveShareControlProps {
  isConfigured: boolean;
  isPublished: boolean;
  isSyncing: boolean;
  shareUrl: string | null;
  onPublish: () => Promise<{ success: boolean; error?: string }>;
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
  const { isAdmin } = useAuth();
  const [showDialog, setShowDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copied, setCopied] = useState(false);
  const [showUnpublishConfirm, setShowUnpublishConfirm] = useState(false);

  // 온라인 공개는 관리자 전용
  if (!isConfigured || !isAdmin) return null;

  const handlePublish = async () => {
    setIsSubmitting(true);
    setErrorMsg('');
    const result = await onPublish();
    setIsSubmitting(false);
    if (result.success) {
      setShowDialog(false);
    } else {
      setErrorMsg(result.error || '온라인 공개에 실패했습니다.');
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

  // 이미 공개 중인 상태
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
            aria-label="온라인 공개 중지"
          >
            <Unlink size={14} />
          </button>
        </div>

        {/* 공개 중지 확인 */}
        {showUnpublishConfirm && (
          <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in p-6">
              <h3 className="text-lg font-bold text-slate-900 mb-2">온라인 공개 중지</h3>
              <p className="text-sm text-slate-500 mb-6">공개를 중지하면 회원들이 이 리그를 볼 수 없게 됩니다.</p>
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

  // 공개 시작 버튼
  return (
    <>
      <button
        onClick={() => setShowDialog(true)}
        className="flex items-center gap-1 bg-clay-50 text-clay-600 px-3 py-1.5 rounded-lg font-bold text-xs border border-clay-200 touch-target cursor-pointer active:scale-[0.98] transition-transform"
        aria-label="온라인 공개"
      >
        <Radio size={14} /> 온라인 공개
      </button>

      {/* 공개 확인 다이얼로그 */}
      {showDialog && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl animate-scale-in overflow-hidden">
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                  <Radio size={20} className="text-clay-600" /> 온라인 공개
                </h3>
                <button onClick={() => { setShowDialog(false); setErrorMsg(''); }} className="p-1 hover:bg-slate-100 rounded-full touch-target">
                  <X size={20} className="text-slate-400" />
                </button>
              </div>

              <p className="text-sm text-slate-500 mb-4">
                이 리그를 서버에 올려 로그인한 회원 누구나 실시간으로 볼 수 있게 합니다.
                이후 경기 기록은 자동으로 동기화됩니다.
              </p>
              {errorMsg && <p className="text-xs text-red-500 mb-4">{errorMsg}</p>}
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
                disabled={isSubmitting}
                className="flex-1 py-3 rounded-xl font-medium text-white bg-clay-600 hover:bg-clay-700 disabled:bg-slate-300 disabled:cursor-not-allowed transition-colors touch-target flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={16} className="animate-spin" /> 공개 중...
                  </>
                ) : (
                  <>
                    <LinkIcon size={16} /> 공개 시작
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
