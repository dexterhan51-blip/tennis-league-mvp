import { EVENT_LABEL } from '@/lib/fcpxmlImport';
import type { RallyEvent, RallyEventKind } from '@/types';

/** 이름 없는 이전 기록은 개인 실적으로 배분하지 않는다. */
export default function PersonalEventTable({ events, players }: { events: RallyEvent[]; players: { id?: string; name: string }[] }) {
  const kinds = (Object.keys(EVENT_LABEL) as RallyEventKind[]).filter((k) => events.some((e) => e.kind === k));
  const mine = (e: RallyEvent, p: { id?: string; name: string }) => e.playerId ? e.playerId === p.id : e.playerName === p.name;
  if (!events.some((e) => e.playerId || e.playerName)) return <p className="mt-2 text-xs text-ink-mute">개인 이름이 없는 기록입니다. 팀 합계로만 표시합니다.</p>;
  return (
    <div className="mt-3 overflow-x-auto">
      <table className="w-full text-xs text-ink"><caption className="text-left font-bold mb-2">개인별 자막 기록</caption>
        <thead><tr><th scope="col" className="text-left p-1">기록</th>{players.map((p) => <th scope="col" className="p-1 whitespace-nowrap" key={p.id ?? p.name}>{p.name}</th>)}</tr></thead>
        <tbody>{kinds.map((k) => <tr className="border-t border-line" key={k}><th scope="row" className="text-left p-1.5 whitespace-nowrap">{EVENT_LABEL[k]}</th>{players.map((p) => <td className="text-center num" key={p.id ?? p.name}>{events.filter((e) => e.kind === k && mine(e, p)).length}</td>)}</tr>)}</tbody>
      </table>
      <p className="mt-2 text-[10px] text-ink-mute">서브 표시로 귀속 {events.filter((e) => e.attribution === 'server' && players.some((p) => mine(e, p))).length}건 · 개인 미확인 {events.filter((e) => !e.playerId && !e.playerName).length}건. 폴트와 더블폴트는 각각의 자막 횟수입니다.</p>
    </div>
  );
}
