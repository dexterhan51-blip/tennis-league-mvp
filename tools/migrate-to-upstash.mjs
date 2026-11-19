// Supabase 백업(JSON) → Upstash Redis 이전 도구. 한 번 쓰고 남겨 두는 기록용 스크립트.
//
//   node tools/migrate-to-upstash.mjs backup/supabase-2026-11-19          # 무엇이 들어갈지만 보여준다
//   node tools/migrate-to-upstash.mjs backup/supabase-2026-11-19 --write  # 실제로 넣는다
//
// · 접속 정보는 .env.local 의 KV_REST_API_URL / KV_REST_API_TOKEN 을 읽는다
// · 저장 형식은 lib/server/store.ts 와 같다 (키 이름표 lf:)
// · 같은 id 는 덮어쓰므로 여러 번 돌려도 결과가 같다. 다른 게임의 키(jj:, sn:, cm:, ac: …)는 건드리지 않는다

import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

const [dir, flag] = process.argv.slice(2);
if (!dir) {
  console.error('사용법: node tools/migrate-to-upstash.mjs <백업 폴더> [--write]');
  process.exit(1);
}
const write = flag === '--write';

const env = Object.fromEntries(
  readFileSync('.env.local', 'utf8')
    .split('\n')
    .map((l) => l.match(/^([A-Z0-9_]+)=(.*)$/))
    .filter(Boolean)
    .map((m) => [m[1], m[2].replace(/^"|"$/g, '')])
);
const url = env.KV_REST_API_URL;
const token = env.KV_REST_API_TOKEN;
if (!url || !token) {
  console.error('.env.local 에 KV_REST_API_URL / KV_REST_API_TOKEN 이 없습니다.');
  process.exit(1);
}

async function redis(cmds) {
  const res = await fetch(`${url}/pipeline`, {
    method: 'POST',
    headers: { authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(cmds),
  });
  const out = await res.json();
  if (!res.ok || !Array.isArray(out) || out.some((x) => x.error)) {
    throw new Error(`저장소 요청 실패: ${JSON.stringify(out).slice(0, 300)}`);
  }
  return out.map((x) => x.result);
}

const read = (name) => {
  const p = join(dir, `${name}.json`);
  return existsSync(p) ? JSON.parse(readFileSync(p, 'utf8')) : [];
};

const seasons = read('seasons');
const matches = read('league_matches');
const friendly = read('friendly_matches');
const seasonIds = new Set(seasons.map((s) => s.id));
const orphans = matches.filter((m) => !seasonIds.has(m.season_id));

console.log(`백업: 시즌 ${seasons.length} · 리그 경기 ${matches.length} · 친선경기 ${friendly.length}`);
if (orphans.length > 0) console.log(`⚠ 시즌이 없는 경기 ${orphans.length}건은 건너뜁니다`);
if (seasons.filter((s) => s.status === 'live').length > 1) {
  console.error('진행 중 시즌이 2개 이상입니다. 백업을 확인하세요.');
  process.exit(1);
}

const [existingSeasons, existingRev] = await redis([['HLEN', 'lf:seasons'], ['GET', 'lf:rev']]);
console.log(`저장소 현재 상태: 시즌 ${existingSeasons}개 · 변경 번호 ${existingRev ?? 0}`);

const cmds = [];
for (const s of seasons) cmds.push(['HSET', 'lf:seasons', s.id, JSON.stringify(s)]);
matches.forEach((row, index) => {
  if (!seasonIds.has(row.season_id)) return;
  // at = 처음 등록된 시각 — 같은 날 경기의 순서를 Supabase 때와 같게 유지한다.
  // 대진을 한꺼번에 만들면 등록 시각이 완전히 같으므로, 백업에 담긴 순서(= 원래 보이던 순서)를 소수점으로 덧붙여 가른다.
  const stored = { at: (Date.parse(row.created_at) || 0) + index / 1000, match: row.match };
  cmds.push(['HSET', `lf:m:${row.season_id}`, row.id, JSON.stringify(stored)]);
  cmds.push(['HSET', 'lf:mi', row.id, row.season_id]);
});
for (const row of friendly) {
  cmds.push(['HSET', 'lf:friendly', row.id, JSON.stringify({ id: row.id, match_date: row.match_date, match: row.match })]);
}
cmds.push(['INCR', 'lf:rev']);

if (!write) {
  console.log(`명령 ${cmds.length}개를 보낼 예정입니다. 실제로 넣으려면 --write 를 붙이세요.`);
  process.exit(0);
}

// 요청 하나가 너무 커지지 않게 나눠 보낸다 (선수 사진이 들어 있는 시즌은 수십 KB)
const CHUNK = 40;
for (let i = 0; i < cmds.length; i += CHUNK) await redis(cmds.slice(i, i + CHUNK));

// 넣은 것을 다시 세어 백업과 맞는지 확인
const counts = await redis([
  ['HLEN', 'lf:seasons'],
  ['HLEN', 'lf:mi'],
  ['HLEN', 'lf:friendly'],
  ...seasons.map((s) => ['HLEN', `lf:m:${s.id}`]),
]);
const perSeason = seasons.map((s, i) => `시즌 ${s.season_no}: ${counts[3 + i]}건`);
console.log(`이전 완료 — 시즌 ${counts[0]} · 경기 색인 ${counts[1]} · 친선 ${counts[2]}`);
console.log(perSeason.join(' / '));
const expected = matches.length - orphans.length;
if (counts[0] < seasons.length || counts[1] < expected) {
  console.error(`✗ 개수가 백업보다 적습니다 (기대: 시즌 ${seasons.length} · 경기 ${expected})`);
  process.exit(1);
}
console.log('✓ 개수가 백업과 일치합니다');
