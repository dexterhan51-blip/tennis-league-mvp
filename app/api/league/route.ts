// 러브포티 데이터 서버 함수 (버셀).
//   GET  /api/league?view=…   누구나 읽기 (순위·경기 기록은 공개)
//   POST /api/league          운영진만 쓰기 — 요청 머리말 x-admin-code 가 버셀 환경변수 LF_ADMIN_CODE 와 같아야 한다
// 저장소는 lib/server/store.ts (Upstash Redis).

import { createHash, timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { MatchSchema, PlayersArraySchema, PlayerStatSchema, ScheduleItemSchema } from '@/lib/schemas';
import * as store from '@/lib/server/store';
import type { Match, PlayerStat } from '@/types';

export const dynamic = 'force-dynamic';

const json = (body: unknown, status = 200) =>
  NextResponse.json(body, { status, headers: { 'cache-control': 'no-store' } });

function fail(e: unknown) {
  if (e instanceof store.StoreError) return json({ error: e.message }, e.status);
  if (e instanceof z.ZodError) return json({ error: '요청 형식이 올바르지 않습니다.' }, 400);
  console.error('[api/league]', e);
  return json({ error: '서버 오류가 발생했습니다.' }, 500);
}

// ── 읽기 ─────────────────────────────────────────────────────

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams;
  const id = q.get('id') ?? '';
  try {
    switch (q.get('view')) {
      case 'rev':
        return json({ rev: await store.getRev() });
      case 'live':
        return json(await store.getLive());
      case 'seasons':
        return json({ seasons: await store.listSeasons() });
      case 'season': {
        const season = await store.getSeason(id);
        return json({ season, matches: season ? await store.getSeasonMatches(id) : [] });
      }
      case 'all':
        return json(await store.getAll());
      case 'match':
        return json({ found: await store.findMatch(id) });
      case 'schedule':
        return json({ schedule: await store.listSchedule() });
      case 'members':
        return json({ members: await store.getMembers() });
      case 'friendly':
        return json({ friendly: await store.listFriendly(q.get('since') ?? undefined) });
      default:
        return json({ error: '알 수 없는 요청입니다.' }, 400);
    }
  } catch (e) {
    return fail(e);
  }
}

// ── 쓰기 ─────────────────────────────────────────────────────

const sha = (s: string) => createHash('sha256').update(s).digest();

function isAdminCode(given: string | null): boolean {
  const expected = process.env.LF_ADMIN_CODE;
  if (!expected || !given) return false;
  return timingSafeEqual(sha(given), sha(expected));
}

const id = z.string().min(1).max(100);
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);

const Op = z.discriminatedUnion('op', [
  z.object({ op: z.literal('verify') }),
  z.object({
    op: z.literal('season-create'),
    seasonNo: z.number().int().positive(),
    name: z.string().trim().min(1).max(60),
    players: PlayersArraySchema,
    startsOn: date.optional(),
  }),
  z.object({ op: z.literal('season-players'), seasonId: id, players: PlayersArraySchema }),
  z.object({ op: z.literal('season-rename'), seasonId: id, name: z.string().trim().min(1).max(60) }),
  z.object({
    op: z.literal('season-archive'),
    seasonId: id,
    endsOn: date,
    finalRankings: z.array(PlayerStatSchema),
    championPlayerId: z.string().optional(),
  }),
  z.object({ op: z.literal('season-delete'), seasonId: id }),
  z.object({ op: z.literal('match-upsert'), seasonId: id, match: MatchSchema }),
  z.object({ op: z.literal('match-delete'), matchId: id }),
  z.object({ op: z.literal('friendly-upsert'), match: MatchSchema }),
  z.object({ op: z.literal('friendly-delete'), matchId: id }),
  z.object({ op: z.literal('members-set'), players: PlayersArraySchema }),
  z.object({ op: z.literal('schedule-upsert'), item: ScheduleItemSchema }),
  z.object({ op: z.literal('schedule-delete'), id }),
]);

export async function POST(req: NextRequest) {
  try {
    if (!process.env.LF_ADMIN_CODE) return json({ error: '운영진 코드가 서버에 설정되지 않았습니다.' }, 503);

    const ip = (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || 'unknown';
    if (await store.isLockedOut(ip)) {
      return json({ error: '코드를 여러 번 틀렸습니다. 10분 뒤에 다시 시도해주세요.' }, 429);
    }
    if (!isAdminCode(req.headers.get('x-admin-code'))) {
      await store.recordFailure(ip);
      return json({ error: '운영진 코드가 올바르지 않습니다.' }, 401);
    }

    const body = Op.parse(await req.json());
    switch (body.op) {
      case 'verify':
        return json({ ok: true });
      case 'season-create':
        return json({ season: await store.createSeason(body) });
      case 'season-players':
        await store.updateSeasonPlayers(body.seasonId, body.players);
        break;
      case 'season-rename':
        await store.renameSeason(body.seasonId, body.name);
        break;
      case 'season-archive':
        await store.archiveSeason(body.seasonId, {
          endsOn: body.endsOn,
          finalRankings: body.finalRankings as PlayerStat[],
          championPlayerId: body.championPlayerId,
        });
        break;
      case 'season-delete':
        await store.deleteSeason(body.seasonId);
        break;
      case 'match-upsert':
        await store.upsertLeagueMatch(body.seasonId, body.match as Match);
        break;
      case 'match-delete':
        await store.deleteLeagueMatch(body.matchId);
        break;
      case 'friendly-upsert':
        await store.upsertFriendlyMatch(body.match as Match);
        break;
      case 'friendly-delete':
        await store.deleteFriendlyMatch(body.matchId);
        break;
      case 'members-set':
        await store.setMembers(body.players);
        break;
      case 'schedule-upsert':
        await store.upsertSchedule(body.item);
        break;
      case 'schedule-delete':
        await store.deleteSchedule(body.id);
        break;
    }
    return json({ ok: true });
  } catch (e) {
    return fail(e);
  }
}
