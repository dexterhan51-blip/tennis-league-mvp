import { parseFcpxml, tallyEvents, FcpxmlImportError } from '@/lib/fcpxmlImport';

const board = (offset: string, pa: string, pb: string, ga: number, gb: number, names = ['가', '나', '다', '라']) => `
  <title ref="r2" offset="${offset}" name="점수판" start="3600s" duration="5s">
    <text><text-style ref="ts1">/</text-style></text>
    <text><text-style ref="ts2">1004 테스트코트</text-style></text>
    <text><text-style ref="ts3">${pa}</text-style></text>
    <text><text-style ref="ts4">${pb}</text-style></text>
    <text><text-style ref="ts5">${ga}</text-style></text>
    <text><text-style ref="ts6">${gb}</text-style></text>
    ${names.map((n, i) => `<text><text-style ref="n${i}">${n}</text-style></text>`).join('')}
  </title>`;
const event = (ref: string, offset: string) => `<title ref="${ref}" offset="${offset}" name="x" start="3600s" duration="1s"/>`;

// 자막은 본편 클립(start=100s)에 붙어 있어 offset 이 클립 안쪽 시간 기준이다 → 절대 시각 = offset - 100
const xml = (body: string, project = '261004_3경기') => `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE fcpxml>
<fcpxml version="1.14">
  <resources>
    <effect id="r2" name="0_복식점수판" uid="x"/>
    <effect id="r3" name="B_04_네트"/>
    <effect id="r4" name="A_08_득점_기록용"/>
    <effect id="r5" name="A_02_폴트"/>
    <effect id="r6" name="B_03_더블폴트"/>
    <effect id="r7" name="0_경기종료_승리_A"/>
    <effect id="r8" name="000_장소"/>
    <effect id="r9" name="24_헛스윙_붕"/>
  </resources>
  <library><event name="e"><project name="${project}"><sequence duration="60s"><spine>
    <asset-clip ref="a1" offset="0s" name="본편" start="100s" duration="60s">
      ${body}
    </asset-clip>
  </spine></sequence></project></event></library>
</fcpxml>`;

const game = [
  `<title ref="r8" offset="100s" name="장소" start="3600s" duration="3s"><text><text-style ref="p">테스트 코트 &amp; 클럽</text-style></text></title>`,
  board('100s', '0', '0', 0, 0),
  event('r3', '104s'), // B 네트 → A 득점
  board('105s', '15', '0', 0, 0),
  board('107s', '15', '0', 0, 0), // 같은 상태가 이어 붙은 자막은 무시
  event('r5', '108s'), // A 첫 서브 폴트 (포인트 변화 없음)
  event('r4', '109s'),
  board('110s', '30', '0', 0, 0),
  event('r9', '111s'), // 효과음 자막은 기록이 아니다
  event('r6', '112s'),
  board('113s', '40', '0', 0, 0),
  `<title ref="r7" offset="118s" name="끝" start="3600s" duration="4s"><text><text-style ref="e1">vs 다 · 라</text-style></text><text><text-style ref="e2">1 : 0</text-style></text></title>`,
].join('\n');

describe('parseFcpxml', () => {
  it('점수판과 기록용 자막에서 경기를 복원한다', () => {
    const r = parseFcpxml(xml(game));
    expect(r.date).toBe('2026-10-04');
    expect(r.place).toBe('테스트 코트 & 클럽');
    expect(r.teamA).toEqual(['가', '나']);
    expect(r.teamB).toEqual(['다', '라']);
    expect([r.scoreA, r.scoreB]).toEqual([1, 0]);
    expect(r.warnings).toEqual([]);
    // 포인트 3개 + 경기종료 자막으로 넘어간 마지막 포인트
    expect(r.pointLog.map((p) => p.winner)).toEqual(['A', 'A', 'A', 'A']);
    expect(r.pointLog[0]).toMatchObject({ t: 5, pointA: 1, pointB: 0, gameA: 0, gameB: 0 });
    expect(r.pointLog[3]).toMatchObject({ t: 18, pointA: 4, pointB: 0, gameA: 1, gameB: 0, gameWon: 'A' });
    expect(tallyEvents(r.events)).toEqual({
      A: { winner: 1, net: 0, out: 0, fault: 1, 'double-fault': 0 },
      B: { winner: 0, net: 1, out: 0, fault: 0, 'double-fault': 1 },
    });
  });

  it('단식은 이름 두 개를 한 명씩 나눈다', () => {
    const body = [board('100s', '0', '0', 0, 0, ['가', '다']), board('105s', '0', '15', 0, 0, ['가', '다'])].join('');
    const r = parseFcpxml(xml(body));
    expect(r.teamA).toEqual(['가']);
    expect(r.teamB).toEqual(['다']);
    expect(r.pointLog.map((p) => p.winner)).toEqual(['B']);
    expect(r.warnings.join(' ')).toContain('경기종료 자막이 없어');
  });

  it('듀스에서 어드밴티지가 풀리면 상대가 딴 포인트로 본다', () => {
    const body = [board('100s', '40', '40', 0, 0), board('105s', 'AD', '40', 0, 0), board('110s', '40', '40', 0, 0)].join('');
    expect(parseFcpxml(xml(body)).pointLog.map((p) => p.winner)).toEqual(['A', 'B']);
  });

  it('한글이 자모로 풀려(NFD) 저장된 파일도 읽는다', () => {
    const r = parseFcpxml(xml(game).normalize('NFD'));
    expect([r.scoreA, r.scoreB]).toEqual([1, 0]);
    expect(r.teamA).toEqual(['가', '나']);
  });

  it('프로젝트 이름에 날짜가 없으면 알려준다', () => {
    const r = parseFcpxml(xml(game, '결승전'));
    expect(r.date).toBeNull();
    expect(r.warnings.join(' ')).toContain('날짜');
  });

  it('점수판이 없거나 FCPXML 이 아니면 이유를 말해준다', () => {
    expect(() => parseFcpxml('<html></html>')).toThrow(FcpxmlImportError);
    expect(() => parseFcpxml(xml(event('r3', '104s')))).toThrow('점수판 자막을 찾지 못했습니다');
  });
});
