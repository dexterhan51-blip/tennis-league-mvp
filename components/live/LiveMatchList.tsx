'use client';

import { CheckCircle, Clock, Youtube, ExternalLink } from 'lucide-react';
import type { Match, Player } from '@/types';
import { PlayerAvatar } from '@/components/live/PlayerAvatar';

interface LiveMatchListProps {
  matches: Match[];
  finished: number;
  total: number;
  players?: Player[];
}

type PhotoMap = Map<string, string | undefined>;

function PlayerLabel({ player, photoOf }: { player: Player; photoOf: PhotoMap }) {
  return (
    <span className="inline-flex items-center gap-1">
      <PlayerAvatar
        photo={photoOf.get(player.id) ?? player.photo}
        gender={player.gender}
        name={player.name}
        sizeClass="w-5 h-5"
        emojiClass="text-[10px]"
      />
      <span className="text-sm font-medium text-slate-900">{player.name}</span>
    </span>
  );
}

function TeamDisplay({ man, woman, photoOf }: { man: Player; woman: Player; photoOf: PhotoMap }) {
  if (man.id === woman.id) {
    return <PlayerLabel player={man} photoOf={photoOf} />;
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <PlayerLabel player={man} photoOf={photoOf} />
      <span className="text-xs text-slate-400">&</span>
      <PlayerLabel player={woman} photoOf={photoOf} />
    </span>
  );
}

export function LiveMatchList({ matches, finished, total, players }: LiveMatchListProps) {
  // 경기에 박제된 선수 스냅샷에는 사진이 없을 수 있으므로 최신 선수 목록의 사진을 우선 사용
  const photoOf: PhotoMap = new Map((players ?? []).map(p => [p.id, p.photo]));

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm font-bold text-slate-900">경기 결과</h2>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-2 py-0.5 bg-green-50 text-green-600 rounded-full font-medium">
            완료 {finished}
          </span>
          {total - finished > 0 && (
            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-full font-medium">
              진행 {total - finished}
            </span>
          )}
        </div>
      </div>

      {matches.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-4">이 날짜의 경기가 없습니다.</p>
      ) : (
        <div className="space-y-2">
          {matches.map((match, idx) => {
            const isFinished = match.isFinished;
            const aWon = match.scoreA > match.scoreB;
            const bWon = match.scoreB > match.scoreA;
            const isDraw = match.scoreA === match.scoreB && isFinished;

            return (
              <div
                key={match.id}
                className={`rounded-xl border p-3 transition-all ${
                  isFinished
                    ? 'border-green-200 bg-green-50/30'
                    : 'border-slate-200 bg-slate-50/50'
                }`}
              >
                {/* 게임 번호 + 상태 */}
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">GAME {idx + 1}</span>
                  {isFinished ? (
                    <CheckCircle className="w-3.5 h-3.5 text-green-500" />
                  ) : (
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                  )}
                </div>

                {/* 팀 A */}
                <div className={`flex items-center justify-between py-1 ${aWon ? 'opacity-100' : isFinished ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    {aWon && <span className="text-xs font-bold bg-clay-100 text-clay-600 px-1.5 py-0.5 rounded">WIN</span>}
                    <TeamDisplay man={match.teamA.man} woman={match.teamA.woman} photoOf={photoOf} />
                  </div>
                  <span className={`text-lg font-black ${aWon ? 'text-clay-600' : 'text-slate-500'}`}>
                    {isFinished ? match.scoreA : '-'}
                  </span>
                </div>

                {/* vs 구분선 */}
                <div className="text-center text-[10px] text-slate-300 font-bold my-0.5">VS</div>

                {/* 팀 B */}
                <div className={`flex items-center justify-between py-1 ${bWon ? 'opacity-100' : isFinished ? 'opacity-60' : ''}`}>
                  <div className="flex items-center gap-2">
                    {bWon && <span className="text-xs font-bold bg-clay-100 text-clay-600 px-1.5 py-0.5 rounded">WIN</span>}
                    <TeamDisplay man={match.teamB.man} woman={match.teamB.woman} photoOf={photoOf} />
                  </div>
                  <span className={`text-lg font-black ${bWon ? 'text-clay-600' : 'text-slate-500'}`}>
                    {isFinished ? match.scoreB : '-'}
                  </span>
                </div>

                {isDraw && (
                  <div className="text-center mt-1">
                    <span className="text-xs font-medium text-yellow-600 bg-yellow-50 px-2 py-0.5 rounded-full">무승부</span>
                  </div>
                )}

                {match.videoUrl && (
                  <a
                    href={match.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                  >
                    <Youtube className="w-3.5 h-3.5" /> 영상 보기 <ExternalLink className="w-3 h-3" />
                  </a>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
