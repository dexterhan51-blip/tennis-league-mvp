// 파이널컷 편집 파일(FCPXML)에서 경기 기록을 읽어 온다.
// 한피디의 편집본에는 점수판·기록용 자막이 시간 순서대로 깔려 있어서, 그 자막만 읽으면
// 포인트 흐름과 "어떻게 끝났는지"(득점·아웃·네트·폴트·더블폴트)를 그대로 복원할 수 있다.
//
// 읽는 자막 (모션 템플릿 이름 기준)
//   …점수판…             글자 순서: [장소 표기] 포인트A 포인트B 게임A 게임B 선수이름들
//   A_08_득점… / B_…      그 팀이 낸 득점
//   A_01_아웃 A_04_네트 A_03_더블폴트   그 팀의 에러 (포인트는 상대에게)
//   A_02_폴트             첫 서브 폴트 (포인트는 안 넘어감, 횟수만 센다)
//   …경기종료_승리_A      최종 게임 스코어 "4 : 0"
//   000_장소              장소 이름
//
// DOM 없이 동작하는 순수 함수다 (브라우저·테스트 양쪽에서 같은 코드).

import type { PointLogEntry, RallyEvent, RallyEventKind } from '@/types';

// ── 아주 작은 XML 읽기 ───────────────────────────────────────

interface XmlNode {
  tag: string;
  attrs: Record<string, string>;
  children: XmlNode[];
  text: string;
}

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
function decode(s: string): string {
  return s.replace(/&(#x?[0-9a-fA-F]+|\w+);/g, (whole, name: string) => {
    if (name[0] === '#') {
      const code = name[1] === 'x' ? parseInt(name.slice(2), 16) : parseInt(name.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return ENTITIES[name] ?? whole;
  });
}

function parseXml(xml: string): XmlNode {
  const root: XmlNode = { tag: '#root', attrs: {}, children: [], text: '' };
  const stack: XmlNode[] = [root];
  const token = /<!--[\s\S]*?-->|<\?[\s\S]*?\?>|<!\[CDATA\[([\s\S]*?)\]\]>|<!DOCTYPE[^>]*>|<\/([^\s>]+)\s*>|<([^\s/>]+)((?:\s+[^\s=/>]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = token.exec(xml))) {
    const top = stack[stack.length - 1];
    if (m[1] !== undefined) top.text += m[1];
    else if (m[2]) {
      if (stack.length > 1) stack.pop();
    } else if (m[3]) {
      const attrs: Record<string, string> = {};
      const attr = /([^\s=/>]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
      let a: RegExpExecArray | null;
      while ((a = attr.exec(m[4] ?? ''))) attrs[a[1]] = decode(a[2] ?? a[3] ?? '');
      const node: XmlNode = { tag: m[3], attrs, children: [], text: '' };
      top.children.push(node);
      if (!m[5]) stack.push(node);
    } else if (m[6]) top.text += decode(m[6]);
  }
  return root;
}

function findAll(node: XmlNode, tag: string, out: XmlNode[] = []): XmlNode[] {
  for (const c of node.children) {
    if (c.tag === tag) out.push(c);
    findAll(c, tag, out);
  }
  return out;
}

function allText(node: XmlNode): string {
  return node.text + node.children.map(allText).join('');
}

/** "13733/60s" · "5s" → 초 */
function seconds(value: string | undefined): number {
  if (!value) return 0;
  const v = value.replace(/s$/, '');
  if (v.includes('/')) {
    const [a, b] = v.split('/').map(Number);
    return b ? a / b : 0;
  }
  return Number(v) || 0;
}

// ── 자막 뽑기 ────────────────────────────────────────────────

interface Title {
  t: number;
  effect: string;
  texts: string[];
}

const TIMED = new Set(['asset-clip', 'clip', 'gap', 'title', 'video', 'ref-clip', 'sync-clip', 'mc-clip', 'audition']);

function collectTitles(spine: XmlNode, effectName: Map<string, string>): Title[] {
  const titles: Title[] = [];
  // 자식의 offset 은 부모의 "안쪽 시간" 기준이라, 절대 시각 = 부모 절대 시각 + (offset - 부모 start)
  const walk = (node: XmlNode, base: number) => {
    for (const c of node.children) {
      if (c.tag === 'spine') {
        walk(c, base);
        continue;
      }
      if (!TIMED.has(c.tag)) continue;
      const at = base + seconds(c.attrs.offset);
      if (c.tag === 'title') {
        titles.push({
          t: at,
          effect: effectName.get(c.attrs.ref ?? '') ?? c.attrs.name ?? '',
          texts: c.children.filter((x) => x.tag === 'text').map((x) => allText(x).trim()),
        });
      }
      walk(c, at - seconds(c.attrs.start));
    }
  };
  walk(spine, 0);
  return titles.sort((a, b) => a.t - b.t);
}

// ── 기록 복원 ────────────────────────────────────────────────

export interface ImportedMatch {
  /** 편집 프로젝트 이름 (예: 261004_10경기) */
  projectName: string;
  /** 'YYYY-MM-DD' — 프로젝트 이름 앞 6자리(YYMMDD)에서. 못 읽으면 null */
  date: string | null;
  place: string | null;
  teamA: string[];
  teamB: string[];
  scoreA: number;
  scoreB: number;
  pointLog: PointLogEntry[];
  events: RallyEvent[];
  /** 읽으면서 확신하지 못한 부분 (화면에 그대로 보여준다) */
  warnings: string[];
}

export class FcpxmlImportError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FcpxmlImportError';
  }
}

const LADDER: Record<string, number> = { '0': 0, '15': 1, '30': 2, '40': 3, AD: 4, 'A': 4, 어드: 4 };
const EVENT_KINDS: [RegExp, RallyEventKind][] = [
  [/더블폴트/, 'double-fault'],
  [/폴트/, 'fault'],
  [/아웃/, 'out'],
  [/네트/, 'net'],
  [/득점/, 'winner'],
];

interface Board {
  t: number;
  pa: number;
  pb: number;
  ga: number;
  gb: number;
  names: string[];
  label: string;
}

function readBoard(title: Title): Board | null {
  const fields = title.texts.filter((x) => x && x !== '/');
  // 점수 4칸(포인트A 포인트B 게임A 게임B)이 연달아 나오는 첫 위치를 찾는다
  const isPoint = (x: string) => x.toUpperCase() in LADDER;
  const isGame = (x: string) => /^\d{1,2}$/.test(x);
  for (let i = 0; i + 3 < fields.length; i++) {
    if (isPoint(fields[i]) && isPoint(fields[i + 1]) && isGame(fields[i + 2]) && isGame(fields[i + 3])) {
      return {
        t: title.t,
        pa: LADDER[fields[i].toUpperCase()],
        pb: LADDER[fields[i + 1].toUpperCase()],
        ga: Number(fields[i + 2]),
        gb: Number(fields[i + 3]),
        names: fields.slice(i + 4),
        label: fields.slice(0, i).join(' '),
      };
    }
  }
  return null;
}

export function parseFcpxml(xml: string): ImportedMatch {
  // 맥에서 만든 파일은 한글이 자모로 풀려(NFD) 저장되는 경우가 있어 먼저 합친다 — 안 그러면 '점수판' 같은 이름이 안 맞는다
  const root = parseXml(xml.normalize('NFC'));
  if (findAll(root, 'fcpxml').length === 0) throw new FcpxmlImportError('파이널컷 편집 파일(FCPXML)이 아닙니다.');

  const effectName = new Map(findAll(root, 'effect').map((e) => [e.attrs.id ?? '', e.attrs.name ?? '']));
  const project = findAll(root, 'project')[0];
  const spine = project ? findAll(project, 'spine')[0] : undefined;
  if (!project || !spine) throw new FcpxmlImportError('편집 프로젝트(타임라인)를 찾지 못했습니다.');

  const titles = collectTitles(spine, effectName);
  const warnings: string[] = [];

  // 점수판: 같은 상태가 이어 붙은 자막은 하나로 본다
  const boards: Board[] = [];
  for (const title of titles) {
    if (!/점수판/.test(title.effect)) continue;
    const board = readBoard(title);
    if (!board) continue;
    const last = boards[boards.length - 1];
    if (last && last.pa === board.pa && last.pb === board.pb && last.ga === board.ga && last.gb === board.gb) continue;
    boards.push(board);
  }
  if (boards.length === 0) throw new FcpxmlImportError('점수판 자막을 찾지 못했습니다. 점수판이 들어간 편집본인지 확인해주세요.');

  // 선수 이름: 복식 4명(A1 A2 B1 B2) 또는 단식 2명(A B)
  const names = boards[0].names;
  let teamA: string[];
  let teamB: string[];
  if (names.length >= 4) {
    teamA = names.slice(0, 2);
    teamB = names.slice(2, 4);
  } else if (names.length >= 2) {
    teamA = [names[0]];
    teamB = [names[1]];
  } else {
    throw new FcpxmlImportError('점수판에서 선수 이름을 읽지 못했습니다.');
  }

  // 기록용 자막
  const events: RallyEvent[] = [];
  for (const title of titles) {
    const m = title.effect.match(/^([AB])_\d+_(.+)$/);
    if (!m) continue;
    const kind = EVENT_KINDS.find(([re]) => re.test(m[2]))?.[1];
    if (kind) events.push({ t: Math.round(title.t * 10) / 10, team: m[1] as 'A' | 'B', kind });
  }

  // 최종 스코어: 경기종료 자막의 "4 : 0"
  let finalScore: { a: number; b: number; t: number } | null = null;
  for (const title of titles) {
    if (!/경기종료/.test(title.effect)) continue;
    for (const text of title.texts) {
      const m = text.match(/^(\d{1,2})\s*:\s*(\d{1,2})$/);
      if (m) finalScore = { a: Number(m[1]), b: Number(m[2]), t: title.t };
    }
  }

  // 포인트 흐름: 점수판이 바뀔 때마다 한 포인트
  const pointLog: PointLogEntry[] = [];
  const push = (t: number, prev: Board, winner: 'A' | 'B', gameWon: boolean, next: { ga: number; gb: number }) => {
    pointLog.push({
      t: Math.round(t),
      winner,
      // 게임을 따낸 포인트는 점수판이 0-0 으로 돌아가므로, 직전 점수에 한 점을 더한 값으로 남긴다
      pointA: prev.pa + (winner === 'A' ? 1 : 0),
      pointB: prev.pb + (winner === 'B' ? 1 : 0),
      gameA: next.ga,
      gameB: next.gb,
      ...(gameWon ? { gameWon: winner } : {}),
    });
  };
  for (let i = 1; i < boards.length; i++) {
    const prev = boards[i - 1];
    const cur = boards[i];
    if (cur.ga !== prev.ga || cur.gb !== prev.gb) {
      const winner = cur.ga > prev.ga ? 'A' : 'B';
      push(cur.t, prev, winner, true, cur);
    } else if (cur.pa !== prev.pa || cur.pb !== prev.pb) {
      // 듀스에서 어드밴티지가 풀리는 경우(AD-40 → 40-40)는 점수가 내려간 쪽의 상대가 딴 것
      const winner = cur.pa > prev.pa || cur.pb < prev.pb ? 'A' : 'B';
      push(cur.t, prev, winner, false, cur);
    }
  }

  const lastBoard = boards[boards.length - 1];
  let scoreA = lastBoard.ga;
  let scoreB = lastBoard.gb;
  if (finalScore) {
    // 마지막 포인트는 점수판 대신 경기종료 자막으로 넘어간다
    if (finalScore.a + finalScore.b === scoreA + scoreB + 1) {
      const winner = finalScore.a > scoreA ? 'A' : 'B';
      push(finalScore.t, lastBoard, winner, true, { ga: finalScore.a, gb: finalScore.b });
    } else if (finalScore.a !== scoreA || finalScore.b !== scoreB) {
      warnings.push(`점수판(${scoreA}:${scoreB})과 경기종료 자막(${finalScore.a}:${finalScore.b})이 한 게임 넘게 차이 납니다. 경기종료 자막을 따랐습니다.`);
    }
    scoreA = finalScore.a;
    scoreB = finalScore.b;
  } else {
    warnings.push('경기종료 자막이 없어 마지막 점수판의 게임 수를 최종 스코어로 삼았습니다.');
  }

  // 날짜: 프로젝트 이름 앞 6자리 YYMMDD
  const projectName = project.attrs.name ?? '';
  let date: string | null = null;
  const d = projectName.match(/^(\d{2})(\d{2})(\d{2})/);
  if (d && Number(d[2]) >= 1 && Number(d[2]) <= 12 && Number(d[3]) >= 1 && Number(d[3]) <= 31) {
    date = `20${d[1]}-${d[2]}-${d[3]}`;
  } else {
    warnings.push('프로젝트 이름에서 날짜를 읽지 못했습니다. 날짜를 직접 골라주세요.');
  }

  // 장소: 장소 자막의 첫 줄, 없으면 점수판 머리글에서 숫자를 뗀 값
  const placeTitle = titles.find((x) => /장소/.test(x.effect));
  const place = placeTitle?.texts[0] || lastBoard.label.replace(/^\d+\s*/, '').trim() || null;

  return { projectName, date, place, teamA, teamB, scoreA, scoreB, pointLog, events, warnings };
}

// ── 집계 ─────────────────────────────────────────────────────

export type EventTally = Record<RallyEventKind, number>;

export const EVENT_LABEL: Record<RallyEventKind, string> = {
  winner: '득점',
  net: '네트',
  out: '아웃',
  fault: '폴트',
  'double-fault': '더블폴트',
};

export function emptyTally(): EventTally {
  return { winner: 0, net: 0, out: 0, fault: 0, 'double-fault': 0 };
}

/** 팀별 득점·에러 횟수 */
export function tallyEvents(events: RallyEvent[]): { A: EventTally; B: EventTally } {
  const out = { A: emptyTally(), B: emptyTally() };
  for (const e of events) out[e.team][e.kind]++;
  return out;
}
