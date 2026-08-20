'use client';

import type { Gender } from '@/types';

interface PlayerAvatarProps {
  photo?: string;
  gender: Gender;
  name: string;
  /** Tailwind 크기 클래스 (예: 'w-7 h-7') */
  sizeClass?: string;
  /** 이니셜 폴백 글자 크기 클래스 */
  emojiClass?: string;
}

/** 라이브 대시보드용 선수 아바타 — 사진이 없으면 이름 이니셜로 폴백 */
export function PlayerAvatar({
  photo,
  gender,
  name,
  sizeClass = 'w-7 h-7',
  emojiClass = 'text-sm',
}: PlayerAvatarProps) {
  if (photo) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- 사진은 data URL이라 next/image 최적화 대상이 아님
      <img
        src={photo}
        alt={name}
        className={`${sizeClass} rounded-full object-cover border border-line-strong flex-shrink-0`}
      />
    );
  }
  return (
    <div
      className={`${sizeClass} rounded-full flex items-center justify-center flex-shrink-0 ${
        gender === 'MALE' ? 'bg-tint-m-bg text-tint-m-fg' : 'bg-tint-f-bg text-tint-f-fg'
      }`}
      aria-label={name}
    >
      <span className={`${emojiClass} font-bold`}>{name.charAt(0)}</span>
    </div>
  );
}
