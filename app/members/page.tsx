'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { UserCircle, Shield, Loader2, Pencil, Check, X, ExternalLink } from 'lucide-react';
import { getSupabase } from '@/lib/supabase';
import { useAuth, Profile } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';

// 회원 관리 (관리자 전용): 프로필 조회, 이름/역할 수정.
// 계정 생성/비밀번호 재설정은 Supabase 대시보드에서 처리한다.
export default function MembersPage() {
  const { isAdmin, isLoading, session } = useAuth();
  const { showToast } = useToast();
  const router = useRouter();
  const [members, setMembers] = useState<Profile[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');

  const loadMembers = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase) return;
    const { data, error } = await supabase
      .from('profiles')
      .select('id, name, role, player_id')
      .order('created_at', { ascending: true });
    if (error) {
      showToast('회원 목록을 불러오지 못했습니다.', 'error');
    } else {
      setMembers((data as Profile[]) ?? []);
    }
  }, [showToast]);

  useEffect(() => {
    if (isLoading) return;
    if (!isAdmin) {
      router.replace('/');
      return;
    }
    loadMembers();
  }, [isAdmin, isLoading, router, loadMembers]);

  const handleSaveName = async (id: string) => {
    const supabase = getSupabase();
    if (!supabase || !editName.trim()) return;
    const { error } = await supabase
      .from('profiles')
      .update({ name: editName.trim() })
      .eq('id', id);
    if (error) {
      showToast('이름 변경에 실패했습니다.', 'error');
    } else {
      showToast('이름을 변경했습니다.', 'success');
      setEditingId(null);
      loadMembers();
    }
  };

  const handleToggleRole = async (member: Profile) => {
    if (member.id === session?.user.id) {
      showToast('본인의 관리자 권한은 해제할 수 없습니다.', 'error');
      return;
    }
    const supabase = getSupabase();
    if (!supabase) return;
    const newRole = member.role === 'admin' ? 'member' : 'admin';
    const { error } = await supabase
      .from('profiles')
      .update({ role: newRole })
      .eq('id', member.id);
    if (error) {
      showToast('역할 변경에 실패했습니다.', 'error');
    } else {
      showToast(newRole === 'admin' ? '관리자로 지정했습니다.' : '일반 회원으로 변경했습니다.', 'success');
      loadMembers();
    }
  };

  if (isLoading || !isAdmin) return null;

  return (
    <div className="min-h-screen bg-surface pb-24">
      <div className="sticky top-0 z-10 bg-card border-b border-line">
        <div className="max-w-md mx-auto px-4 py-4">
          <h1 className="text-lg font-bold text-ink tracking-tight flex items-center gap-2">
            <Shield className="w-5 h-5 text-accent" /> 회원 관리
          </h1>
        </div>
      </div>

      <div className="max-w-md mx-auto p-4 space-y-4">
        <div className="bg-accent-soft border border-accent/20 rounded-xl p-4 text-xs text-ink-soft leading-relaxed">
          새 계정 발급과 비밀번호 재설정은 Supabase 대시보드
          (Authentication → Users → Add user)에서 할 수 있습니다.
          여기서는 이름과 역할을 관리합니다.
          <a
            href="https://supabase.com/dashboard/project/pbtyjxjnmcvmdtfhmovz/auth/users"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-accent font-bold ml-1"
          >
            대시보드 열기 <ExternalLink size={12} />
          </a>
        </div>

        {!members ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-8 h-8 text-accent animate-spin" aria-label="로딩 중" />
          </div>
        ) : members.length === 0 ? (
          <div className="bg-card rounded-2xl border border-line p-8 text-center">
            <p className="text-sm text-ink-mute">등록된 회원이 없습니다.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {members.map((member) => (
              <div
                key={member.id}
                className="bg-card rounded-xl border border-line p-4 flex items-center justify-between gap-3"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <UserCircle className="w-9 h-9 text-ink-faint shrink-0" />
                  <div className="min-w-0 flex-1">
                    {editingId === member.id ? (
                      <div className="flex items-center gap-1.5">
                        <input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="w-full px-2 py-1 text-sm bg-card text-ink border border-line-strong rounded-lg focus:outline-none focus:ring-2 focus:ring-accent/40 focus:border-accent"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveName(member.id)}
                          className="p-1.5 text-up hover:bg-up/10 rounded-lg touch-target"
                          aria-label="저장"
                        >
                          <Check size={16} />
                        </button>
                        <button
                          onClick={() => setEditingId(null)}
                          className="p-1.5 text-ink-faint hover:bg-card-soft rounded-lg touch-target"
                          aria-label="취소"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1.5">
                        <span className="font-medium text-ink truncate">
                          {member.name || '(이름 없음)'}
                        </span>
                        {member.id === session?.user.id && (
                          <span className="text-[10px] text-ink-faint">(나)</span>
                        )}
                        <button
                          onClick={() => {
                            setEditingId(member.id);
                            setEditName(member.name);
                          }}
                          className="p-1 text-ink-faint hover:text-ink-mute touch-target"
                          aria-label="이름 수정"
                        >
                          <Pencil size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleToggleRole(member)}
                  className={`shrink-0 text-xs font-bold px-2.5 py-1.5 rounded-lg border transition-colors touch-target ${
                    member.role === 'admin'
                      ? 'text-accent bg-accent-soft border-accent/20 hover:bg-accent-soft'
                      : 'text-ink-mute bg-card-soft border-line hover:bg-line'
                  }`}
                >
                  {member.role === 'admin' ? '관리자' : '회원'}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
