// lib/youtube.ts
// 유튜브 URL 검증 + 정규화 유틸. 순수 함수, 의존성 없음.
// 운영자 입력값에서 videoId(11자)를 추출해 안전한 watch URL을 만든다.
// (href에는 항상 우리가 조립한 https://www.youtube.com/watch?v=<id> 만 들어가므로
//  javascript: 등 위험 스킴이 끼어들 여지가 없다.)

const VIDEO_ID_RE = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  'youtube.com',
  'm.youtube.com',
  'music.youtube.com',
  'youtube-nocookie.com',
]);

export interface YouTubeRef {
  id: string;
  /** 정규화된 시청 URL (저장/링크용) */
  watchUrl: string;
  /** 썸네일 URL (선택적 표시용) */
  thumbnailUrl: string;
}

/**
 * 다양한 유튜브 URL 형태를 받아 videoId를 추출한다.
 * 지원: youtu.be/<id>, youtube.com/watch?v=<id>, /shorts/<id>, /embed/<id>, /live/<id>, /v/<id>
 * 유튜브 호스트가 아니거나 id가 11자 규격이 아니면 null.
 */
export function parseYouTube(input: string): YouTubeRef | null {
  if (!input) return null;
  let raw = input.trim();
  if (!raw) return null;
  // 사용자가 스킴 없이 'youtu.be/...'만 붙여넣는 경우 보정
  if (!/^https?:\/\//i.test(raw)) raw = `https://${raw}`;

  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;

  const host = u.hostname.replace(/^www\./i, '').toLowerCase();
  let id = '';

  if (host === 'youtu.be') {
    id = u.pathname.slice(1).split('/')[0];
  } else if (YOUTUBE_HOSTS.has(host)) {
    if (u.pathname === '/watch') {
      id = u.searchParams.get('v') ?? '';
    } else {
      const m = u.pathname.match(/^\/(?:shorts|embed|live|v)\/([^/?#]+)/);
      if (m) id = m[1];
    }
  } else {
    return null; // 유튜브 호스트가 아님
  }

  if (!VIDEO_ID_RE.test(id)) return null;

  return {
    id,
    watchUrl: `https://www.youtube.com/watch?v=${id}`,
    thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
  };
}

/** 유효한 유튜브 URL인지 여부만 반환 */
export function isYouTubeUrl(input: string): boolean {
  return parseYouTube(input) !== null;
}
