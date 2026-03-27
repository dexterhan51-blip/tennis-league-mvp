'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { getSupabase, isSupabaseConfigured } from '@/lib/supabase';
import type { RealtimeChannel } from '@supabase/supabase-js';

interface Bookings {
  [key: string]: string;
}

type ConnectionStatus = 'idle' | 'connecting' | 'connected' | 'disconnected' | 'error';

interface UseBookingSyncReturn {
  isConfigured: boolean;
  isPublished: boolean;
  isSubscribed: boolean;
  isSyncing: boolean;
  connectionStatus: ConnectionStatus;
  pinCode: string | null;
  publish: (pin: string) => Promise<{ success: boolean; error?: string }>;
  unpublish: () => Promise<void>;
  subscribe: (pin: string) => Promise<{ success: boolean; error?: string }>;
  unsubscribe: () => void;
}

const BOOKING_SHARE_ID_KEY = 'booking-share-id';
const BOOKING_SHARE_PIN_KEY = 'booking-share-pin';
const BOOKING_SUBSCRIBE_PIN_KEY = 'booking-subscribe-pin';
const BOOKING_SUBSCRIBE_ID_KEY = 'booking-subscribe-id';

export function useBookingSync(
  bookings: Bookings,
  onRemoteUpdate: (bookings: Bookings) => void,
): UseBookingSyncReturn {
  // Publisher state
  const [shareId, setShareId] = useState<string | null>(null);
  const [sharePin, setSharePin] = useState<string | null>(null);

  // Subscriber state
  const [subId, setSubId] = useState<string | null>(null);
  const [subPin, setSubPin] = useState<string | null>(null);

  const [isSyncing, setIsSyncing] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('idle');
  const syncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const channelRef = useRef<RealtimeChannel | null>(null);
  const isConfigured = isSupabaseConfigured();

  const isPublished = !!shareId;
  const isSubscribed = !!subId;
  const pinCode = sharePin || subPin;

  // Restore saved state
  useEffect(() => {
    try {
      const savedShareId = localStorage.getItem(BOOKING_SHARE_ID_KEY);
      const savedSharePin = localStorage.getItem(BOOKING_SHARE_PIN_KEY);
      if (savedShareId && savedSharePin) {
        setShareId(savedShareId);
        setSharePin(savedSharePin);
      }

      const savedSubId = localStorage.getItem(BOOKING_SUBSCRIBE_ID_KEY);
      const savedSubPin = localStorage.getItem(BOOKING_SUBSCRIBE_PIN_KEY);
      if (savedSubId && savedSubPin) {
        setSubId(savedSubId);
        setSubPin(savedSubPin);
      }
    } catch { /* ignore */ }
  }, []);

  // Auto-sync when bookings change (publisher only)
  useEffect(() => {
    if (!shareId || !sharePin) return;

    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      syncToSupabase(shareId, sharePin);
    }, 1500);

    return () => {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bookings, shareId, sharePin]);

  // Subscribe to realtime updates (subscriber)
  useEffect(() => {
    if (!subId) return;

    const supabase = getSupabase();
    if (!supabase) return;

    setConnectionStatus('connecting');

    // Initial load
    supabase
      .from('shared_bookings')
      .select('bookings')
      .eq('id', subId)
      .eq('is_active', true)
      .single()
      .then(({ data, error }) => {
        if (!error && data) {
          onRemoteUpdate(data.bookings as Bookings);
          setConnectionStatus('connected');
        } else {
          setConnectionStatus('error');
        }
      });

    // Realtime subscription
    const channel = supabase
      .channel(`booking-${subId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_bookings',
          filter: `id=eq.${subId}`,
        },
        (payload) => {
          const newData = payload.new as { bookings: Bookings; is_active: boolean };
          if (newData.is_active) {
            onRemoteUpdate(newData.bookings);
          } else {
            setConnectionStatus('disconnected');
          }
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          setConnectionStatus('connected');
        } else if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          setConnectionStatus('disconnected');
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [subId]);

  // Also subscribe to own published data for realtime (publisher sees others' changes)
  useEffect(() => {
    if (!shareId || subId) return; // Don't double-subscribe

    const supabase = getSupabase();
    if (!supabase) return;

    setConnectionStatus('connected');

    const channel = supabase
      .channel(`booking-pub-${shareId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'shared_bookings',
          filter: `id=eq.${shareId}`,
        },
        (payload) => {
          const newData = payload.new as { bookings: Bookings; is_active: boolean };
          if (newData.is_active) {
            onRemoteUpdate(newData.bookings);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
      channelRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [shareId, subId]);

  const syncToSupabase = useCallback(async (id: string, pin: string) => {
    const supabase = getSupabase();
    if (!supabase) return;

    setIsSyncing(true);
    try {
      await supabase
        .from('shared_bookings')
        .update({
          bookings,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id)
        .eq('pin_code', pin);
    } catch (e) {
      console.warn('[booking-sync] Failed to sync:', e);
    } finally {
      setIsSyncing(false);
    }
  }, [bookings]);

  const publish = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Supabase가 설정되지 않았습니다.' };

    setIsSyncing(true);
    try {
      const { data, error } = await supabase
        .from('shared_bookings')
        .insert({
          pin_code: pin,
          bookings,
          is_active: true,
        })
        .select('id')
        .single();

      if (error) throw error;

      const id = data.id;
      setShareId(id);
      setSharePin(pin);
      localStorage.setItem(BOOKING_SHARE_ID_KEY, id);
      localStorage.setItem(BOOKING_SHARE_PIN_KEY, pin);

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '공유에 실패했습니다.';
      return { success: false, error: message };
    } finally {
      setIsSyncing(false);
    }
  }, [bookings]);

  const unpublish = useCallback(async () => {
    const supabase = getSupabase();
    if (!supabase || !shareId || !sharePin) return;

    try {
      await supabase
        .from('shared_bookings')
        .update({ is_active: false })
        .eq('id', shareId)
        .eq('pin_code', sharePin);
    } catch (e) {
      console.warn('[booking-sync] Unpublish failed:', e);
    }

    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setShareId(null);
    setSharePin(null);
    setConnectionStatus('idle');
    localStorage.removeItem(BOOKING_SHARE_ID_KEY);
    localStorage.removeItem(BOOKING_SHARE_PIN_KEY);
  }, [shareId, sharePin]);

  const subscribe = useCallback(async (pin: string): Promise<{ success: boolean; error?: string }> => {
    const supabase = getSupabase();
    if (!supabase) return { success: false, error: 'Supabase가 설정되지 않았습니다.' };

    try {
      const { data, error } = await supabase
        .from('shared_bookings')
        .select('id, bookings')
        .eq('pin_code', pin)
        .eq('is_active', true)
        .single();

      if (error || !data) {
        return { success: false, error: 'PIN 코드에 해당하는 공유를 찾을 수 없습니다.' };
      }

      setSubId(data.id);
      setSubPin(pin);
      localStorage.setItem(BOOKING_SUBSCRIBE_ID_KEY, data.id);
      localStorage.setItem(BOOKING_SUBSCRIBE_PIN_KEY, pin);
      onRemoteUpdate(data.bookings as Bookings);

      return { success: true };
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : '참여에 실패했습니다.';
      return { success: false, error: message };
    }
  }, [onRemoteUpdate]);

  const unsubscribe = useCallback(() => {
    const supabase = getSupabase();
    if (channelRef.current && supabase) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }

    setSubId(null);
    setSubPin(null);
    setConnectionStatus('idle');
    localStorage.removeItem(BOOKING_SUBSCRIBE_ID_KEY);
    localStorage.removeItem(BOOKING_SUBSCRIBE_PIN_KEY);
  }, []);

  return {
    isConfigured,
    isPublished,
    isSubscribed,
    isSyncing,
    connectionStatus,
    pinCode,
    publish,
    unpublish,
    subscribe,
    unsubscribe,
  };
}
