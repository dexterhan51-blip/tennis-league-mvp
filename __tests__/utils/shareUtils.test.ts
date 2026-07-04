import { generateBracketText } from '@/utils/shareUtils';
import type { Match, Player, Team } from '@/types';

function player(id: string, name: string, gender: Player['gender'] = 'MALE'): Player {
  return { id, name, gender };
}

const 정민 = player('p1', '정민');
const 진아 = player('p2', '진아', 'FEMALE');
const 성종 = player('p3', '성종');
const 재경 = player('p4', '재경', 'FEMALE');

function team(man: Player, woman: Player): Team {
  return { id: `${man.id}-${woman.id}`, man, woman };
}

function match(id: string, teamA: Team, teamB: Team): Match {
  return {
    id,
    date: '2026-07-04',
    teamA,
    teamB,
    scoreA: 0,
    scoreB: 0,
    isFinished: false,
  };
}

describe('generateBracketText', () => {
  it('헤더와 GAME 목록을 생성한다', () => {
    const text = generateBracketText('러브포티', '2026-07-04', [
      match('m1', team(정민, 진아), team(성종, 재경)),
      match('m2', team(정민, 재경), team(성종, 진아)),
    ]);
    expect(text).toContain('[러브포티 테니스 리그 - 러브포티]');
    expect(text).toContain('2026-07-04 대진표');
    expect(text).toContain('GAME 1: 정민 & 진아 vs 성종 & 재경');
    expect(text).toContain('GAME 2: 정민 & 재경 vs 성종 & 진아');
    expect(text).not.toContain('실시간 현황');
  });

  it('단식 경기는 선수 이름만 표시한다', () => {
    const text = generateBracketText('러브포티', '2026-07-04', [
      match('m1', team(정민, 정민), team(성종, 성종)),
    ]);
    expect(text).toContain('GAME 1: 정민 vs 성종');
  });

  it('라이브 URL이 있으면 실시간 현황 링크를 붙인다', () => {
    const text = generateBracketText(
      '러브포티',
      '2026-07-04',
      [match('m1', team(정민, 진아), team(성종, 재경))],
      'https://example.com/live/abc'
    );
    expect(text).toContain('실시간 현황: https://example.com/live/abc');
  });
});
