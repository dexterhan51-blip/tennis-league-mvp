import { Player, Match } from '@/types';
import { mergeLocalOnlyIntoServer } from '@/utils/leagueMerge';

// --- Helper factories ---

const P = (id: string, name: string, gender: 'MALE' | 'FEMALE' = 'MALE'): Player => ({
  id,
  name,
  gender,
});

const M = (id: string, date: string, a: [Player, Player], b: [Player, Player]): Match => ({
  id,
  date,
  teamA: { id: `ta-${id}`, man: a[0], woman: a[1] },
  teamB: { id: `tb-${id}`, man: b[0], woman: b[1] },
  scoreA: 6,
  scoreB: 3,
  isFinished: true,
});

const m1 = P('p1', '성종');
const m2 = P('p2', '민수');
const w1 = P('w1', '지윤', 'FEMALE');
const w2 = P('w2', '유진', 'FEMALE');

describe('mergeLocalOnlyIntoServer', () => {
  it('로컬 전용 경기가 없으면 서버 데이터를 그대로 반환한다', () => {
    const shared = M('m1', '2026-07-20', [m1, w1], [m2, w2]);
    const result = mergeLocalOnlyIntoServer(
      { players: [m1, m2, w1, w2], matches: [shared] },
      { players: [m1, m2, w1, w2], matches: [shared] }
    );
    expect(result.localOnlyMatchCount).toBe(0);
    expect(result.matches).toHaveLength(1);
    expect(result.players).toHaveLength(4);
  });

  it('서버에 없는 로컬 경기를 보존하고 개수를 보고한다', () => {
    const serverMatch = M('m1', '2026-07-20', [m1, w1], [m2, w2]);
    const localOnly = M('m2', '2026-07-25', [m1, w2], [m2, w1]);
    const result = mergeLocalOnlyIntoServer(
      { players: [m1, m2, w1, w2], matches: [serverMatch] },
      { players: [m1, m2, w1, w2], matches: [serverMatch, localOnly] }
    );
    expect(result.localOnlyMatchCount).toBe(1);
    expect(result.matches.map((m) => m.id)).toEqual(['m1', 'm2']);
  });

  it('같은 id의 경기는 서버 버전을 우선한다 (영상 링크 등 서버 수정 유지)', () => {
    const serverMatch = { ...M('m1', '2026-07-20', [m1, w1], [m2, w2]), videoUrl: 'https://www.youtube.com/watch?v=abc' };
    const localMatch = M('m1', '2026-07-20', [m1, w1], [m2, w2]);
    const result = mergeLocalOnlyIntoServer(
      { players: [m1, m2, w1, w2], matches: [serverMatch] },
      { players: [m1, m2, w1, w2], matches: [localMatch] }
    );
    expect(result.matches[0].videoUrl).toBe('https://www.youtube.com/watch?v=abc');
  });

  it('병합 결과는 날짜순으로 정렬되고 같은 날짜의 기존 순서는 유지된다', () => {
    const s1 = M('s1', '2026-07-20', [m1, w1], [m2, w2]);
    const s2 = M('s2', '2026-07-27', [m1, w2], [m2, w1]);
    const l1 = M('l1', '2026-07-25', [m1, w1], [m2, w2]);
    const l2 = M('l2', '2026-07-25', [m1, w2], [m2, w1]);
    const result = mergeLocalOnlyIntoServer(
      { players: [m1, m2, w1, w2], matches: [s1, s2] },
      { players: [m1, m2, w1, w2], matches: [l1, l2] }
    );
    expect(result.matches.map((m) => m.id)).toEqual(['s1', 'l1', 'l2', 's2']);
  });

  it('보존한 경기에 출전했지만 서버 로스터에 없는 선수를 함께 보존한다', () => {
    const newbie = P('p9', '신입');
    const localOnly = M('m2', '2026-07-25', [newbie, w1], [m2, w2]);
    const result = mergeLocalOnlyIntoServer(
      { players: [m1, m2, w1, w2], matches: [] },
      { players: [m1, m2, w1, w2, newbie], matches: [localOnly] }
    );
    expect(result.players.map((p) => p.id)).toContain('p9');
  });

  it('게스트 선수와 경기에 나오지 않는 로컬 선수는 로스터에 추가하지 않는다', () => {
    const guest = P('guest-male', '게스트');
    const bystander = P('p8', '미출전');
    const localOnly = M('m2', '2026-07-25', [guest, w1], [m2, w2]);
    const result = mergeLocalOnlyIntoServer(
      { players: [m2, w1, w2], matches: [] },
      { players: [m2, w1, w2, guest, bystander], matches: [localOnly] }
    );
    expect(result.players.map((p) => p.id)).not.toContain('guest-male');
    expect(result.players.map((p) => p.id)).not.toContain('p8');
  });

  it('날짜가 없는 경기도 안전하게 정렬된다', () => {
    const noDate = { ...M('l1', '', [m1, w1], [m2, w2]), date: '' };
    const s1 = M('s1', '2026-07-20', [m1, w1], [m2, w2]);
    const result = mergeLocalOnlyIntoServer(
      { players: [m1, m2, w1, w2], matches: [s1] },
      { players: [m1, m2, w1, w2], matches: [noDate] }
    );
    expect(result.matches).toHaveLength(2);
    expect(result.localOnlyMatchCount).toBe(1);
  });
});
