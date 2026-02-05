'use client';

import { useState } from 'react';
import { Share2 } from 'lucide-react';
import { Match, PlayerWithRank } from '@/types';
import { shareMatchResults } from '@/utils/shareUtils';
import { useToast } from '@/contexts/ToastContext';

interface ShareButtonProps {
  leagueName: string;
  matchDate: string;
  matches: Match[];
  rankings: PlayerWithRank[];
  disabled?: boolean;
}

export default function ShareButton({
  leagueName,
  matchDate,
  matches,
  rankings,
  disabled = false,
}: ShareButtonProps) {
  const { showToast } = useToast();
  const [isSharing, setIsSharing] = useState(false);

  const handleShare = async () => {
    if (isSharing || disabled) return;

    // 완료된 경기가 있는지 확인
    const finishedMatches = matches.filter(m => m.date === matchDate && m.isFinished);
    if (finishedMatches.length === 0) {
      showToast('완료된 경기가 없습니다.', 'warning');
      return;
    }

    setIsSharing(true);
    try {
      const result = await shareMatchResults(leagueName, matchDate, matches, rankings);

      if (result.success) {
        if (result.method === 'clipboard') {
          showToast('클립보드에 복사되었습니다.', 'success');
        }
        // Web Share API 성공 시 별도 toast 불필요 (OS가 피드백 제공)
      } else {
        showToast(result.error || '공유에 실패했습니다.', 'error');
      }
    } catch {
      showToast('공유 중 오류가 발생했습니다.', 'error');
    } finally {
      setIsSharing(false);
    }
  };

  return (
    <button
      onClick={handleShare}
      disabled={isSharing || disabled}
      className={`px-4 bg-green-600 text-white rounded-xl font-bold flex items-center justify-center gap-2 shadow-lg hover:bg-green-700 transition-colors touch-target ${
        (isSharing || disabled) ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      aria-label="경기 결과 공유"
    >
      <Share2 size={18} className={isSharing ? 'animate-pulse' : ''} />
    </button>
  );
}
