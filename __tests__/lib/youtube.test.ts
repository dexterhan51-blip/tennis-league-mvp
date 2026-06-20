import { parseYouTube, isYouTubeUrl } from '@/lib/youtube';

describe('parseYouTube', () => {
  const ID = 'dQw4w9WgXcQ';

  it('다양한 유튜브 URL 형태에서 videoId 추출 + 정규화', () => {
    const forms = [
      `https://www.youtube.com/watch?v=${ID}`,
      `https://youtube.com/watch?v=${ID}&t=42s`,
      `https://youtu.be/${ID}`,
      `https://youtu.be/${ID}?si=abc`,
      `https://www.youtube.com/shorts/${ID}`,
      `https://m.youtube.com/watch?v=${ID}`,
      `https://www.youtube.com/embed/${ID}`,
      `https://www.youtube.com/live/${ID}`,
      `youtu.be/${ID}`, // 스킴 없이
    ];
    for (const f of forms) {
      const r = parseYouTube(f);
      expect(r).not.toBeNull();
      expect(r?.id).toBe(ID);
      expect(r?.watchUrl).toBe(`https://www.youtube.com/watch?v=${ID}`);
      expect(r?.thumbnailUrl).toContain(ID);
    }
  });

  it('유튜브가 아니거나 위험한 입력은 거부', () => {
    expect(parseYouTube('')).toBeNull();
    expect(parseYouTube('https://vimeo.com/12345')).toBeNull();
    expect(parseYouTube('https://evil.com/watch?v=' + ID)).toBeNull();
    expect(parseYouTube('javascript:alert(1)')).toBeNull();
    expect(parseYouTube('https://youtube.com/watch?v=tooShort')).toBeNull();
    expect(parseYouTube('not a url')).toBeNull();
    // 호스트 위장 시도
    expect(parseYouTube('https://youtube.com.evil.com/watch?v=' + ID)).toBeNull();
  });

  it('isYouTubeUrl 헬퍼', () => {
    expect(isYouTubeUrl(`https://youtu.be/${ID}`)).toBe(true);
    expect(isYouTubeUrl('https://google.com')).toBe(false);
  });
});
