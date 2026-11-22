// Codex/터미널 가져오기: node tools/import-fcpxml.cjs /path/to/file.fcpxmld [--apply]
// 기본값은 미리보기. 운영 서버의 기존 이름/ID를 사용하고, 애매한 이전 경기는 자동 덮어쓰지 않는다.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { createRequire } = require('node:module');
const ts = require('typescript');
const root = path.resolve(__dirname, '..');
function load(relative) {
  const file = path.join(root, relative);
  const mod = { exports: {} };
  const js = ts.transpileModule(fs.readFileSync(file, 'utf8'), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 } }).outputText;
  new Function('exports', 'require', 'module', js)(mod.exports, createRequire(file), mod);
  return mod.exports;
}
const { parseFcpxml } = load('lib/fcpxmlImport.ts');
const { MatchSchema } = load('lib/schemas.ts');
const endpoint = 'https://tennis-league-mvp.vercel.app/api/league';
async function get(view) {
  const r = await fetch(`${endpoint}?${view}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`조회 실패 ${r.status}`);
  return r.json();
}
async function main() {
  const source = process.argv[2];
  if (!source || source.startsWith('--')) throw new Error('FCPXML 파일 또는 번들 경로가 필요합니다.');
  const file = fs.statSync(source).isDirectory() ? path.join(source, 'Info.fcpxml') : source;
  const parsed = parseFcpxml(fs.readFileSync(file, 'utf8'), source.replace(/\/+$/, ''));
  if (!parsed.date || !parsed.matchNumber || parsed.warnings.length) throw new Error(`날짜/경기번호/자막을 확인하세요: ${parsed.warnings.join(' ')}`);
  const data = await get('view=all');
  const rows = [...data.friendly.map((f) => ({ match: f.match, seasonId: null })), ...data.seasons.flatMap((s) => s.matches.map((match) => ({ match, seasonId: s.season.id })))];
  const people = new Map();
  for (const { match } of rows) for (const team of [match.teamA, match.teamB]) for (const p of [team.man, team.woman]) if (p.id.startsWith('guest-named-')) people.set(p.name, p);
  for (const p of data.members) people.set(p.name, p);
  const resolve = (name) => { const p = people.get(name); if (!p) throw new Error(`미등록 이름: ${name}. 앱에서 이름 있는 게스트를 등록한 뒤 다시 실행하세요.`); return p; };
  const a = parsed.teamA.map(resolve), b = parsed.teamB.map(resolve);
  const key = (ps) => [...new Set(ps.map((p) => p.id))].sort().join(',');
  const teamKey = (t) => key([t.man, t.woman]);
  const candidates = rows.filter(({match:m}) => m.date === parsed.date && ((teamKey(m.teamA) === key(a) && teamKey(m.teamB) === key(b)) || (teamKey(m.teamA) === key(b) && teamKey(m.teamB) === key(a))));
  const exact = candidates.filter(({match:m}) => m.matchNumber === parsed.matchNumber || (!m.matchNumber && parsed.projectUid && m.detail?.projectUid === parsed.projectUid));
  if (exact.length > 1 || (!exact.length && candidates.some(({match:m}) => !m.matchNumber))) throw new Error('연결할 기존 경기가 모호합니다. 앱에서 직접 선택해주세요.');
  const existing = exact[0];
  const flipped = existing && teamKey(existing.match.teamA) === key(b);
  const swap = (t) => flipped ? (t === 'A' ? 'B' : 'A') : t;
  const team = (players) => { let [man, woman = man] = players; if (man.gender === 'FEMALE' && woman.gender === 'MALE') [man, woman] = [woman, man]; return { id: crypto.randomUUID(), man, woman }; };
  const identity = `${parsed.date}|${parsed.matchNumber}|${[key(a), key(b)].sort().join('|')}`;
  const match = MatchSchema.parse({
    ...(existing?.match ?? { id: `fcpxml-${crypto.createHash('sha256').update(identity).digest('hex').slice(0,40)}`, date: parsed.date, teamA: team(a), teamB: team(b) }),
    matchNumber: parsed.matchNumber, isFinished: true,
    scoreA: flipped ? parsed.scoreB : parsed.scoreA, scoreB: flipped ? parsed.scoreA : parsed.scoreB,
    pointLog: parsed.pointLog.map(({serverName, ...p}) => ({ ...p, winner: swap(p.winner), pointA: flipped ? p.pointB : p.pointA, pointB: flipped ? p.pointA : p.pointB, gameA: flipped ? p.gameB : p.gameA, gameB: flipped ? p.gameA : p.gameB, ...(p.gameWon ? {gameWon: swap(p.gameWon)} : {}), ...(serverName ? {serverId: resolve(serverName).id} : {}) })),
    detail: { source: 'fcpxml', importedAt: new Date().toISOString(), projectName: parsed.projectName, projectUid: parsed.projectUid, place: parsed.place ?? undefined,
      events: parsed.events.map((e) => ({...e, team: swap(e.team), ...(e.playerName ? {playerId: resolve(e.playerName).id} : {})})) },
  });
  console.log(JSON.stringify({ action: existing ? 'update' : 'create', id: match.id, date: match.date, number: match.matchNumber, teams: [parsed.teamA, parsed.teamB], score: [parsed.scoreA, parsed.scoreB], points: match.pointLog.length, events: match.detail.events.length, unassigned: match.detail.events.filter((e) => !e.playerId).length }, null, 2));
  if (!process.argv.includes('--apply')) return;
  // 읽기 전용 백업을 저장한 뒤 현재 경기 한 건만 쓴다. 인증 값은 출력하지 않는다.
  if (fs.existsSync(path.join(root, '.env.local'))) process.loadEnvFile(path.join(root, '.env.local'));
  if (!process.env.LF_ADMIN_CODE) throw new Error('LF_ADMIN_CODE가 필요합니다.');
  const backup = path.join(root, 'backup', `fcpxml-${Date.now()}.json`);
  fs.mkdirSync(path.dirname(backup), {recursive:true});
  fs.writeFileSync(backup, JSON.stringify({source, previous: existing ?? null, match}), {mode:0o600});
  const body = existing?.seasonId ? {op:'match-upsert', seasonId:existing.seasonId, match} : {op:'friendly-upsert', match};
  const result = await fetch(endpoint, {method:'POST', headers:{'content-type':'application/json','x-admin-code':process.env.LF_ADMIN_CODE}, body:JSON.stringify(body)});
  if (!result.ok) throw new Error(`저장 실패 ${result.status}: ${await result.text()}`);
  const saved = (await get(`view=match&id=${encodeURIComponent(match.id)}`)).found?.match;
  if (!saved || saved.scoreA !== match.scoreA || saved.scoreB !== match.scoreB || JSON.stringify(saved.detail) !== JSON.stringify(match.detail) || JSON.stringify(saved.pointLog) !== JSON.stringify(match.pointLog)) throw new Error('저장 후 재조회 결과가 일치하지 않습니다.');
  console.log('저장 및 재조회 검증 완료');
}
main().catch((error) => { console.error(error.message); process.exitCode = 1; });
