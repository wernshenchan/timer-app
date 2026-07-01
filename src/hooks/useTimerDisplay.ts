import { useState, useEffect, useCallback } from 'react';
import { useTimeStore } from '@/store/timeStore';

export function formatTime(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

export function formatTimeDecimal(totalSeconds: number): string {
  const hours = totalSeconds / 3600;
  return `${hours.toFixed(2)}h`;
}

export function formatTimeFlex(totalSeconds: number, decimal: boolean): string {
  return decimal ? formatTimeDecimal(totalSeconds) : formatTime(totalSeconds);
}

export function formatTimeShort(totalSeconds: number): string {
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m ${totalSeconds % 60}s`;
}

export function formatTimeShortFlex(totalSeconds: number, decimal: boolean): string {
  if (decimal) return formatTimeDecimal(totalSeconds);
  return formatTimeShort(totalSeconds);
}

export function useRunningTimer(projectId: string, decimal = false): string {
  const [display, setDisplay] = useState(decimal ? '0.00h' : '00:00:00');
  const getRunningSeconds = useTimeStore((s) => s.getRunningSeconds);

  const update = useCallback(() => {
    const secs = getRunningSeconds(projectId);
    setDisplay(formatTimeFlex(secs, decimal));
  }, [projectId, getRunningSeconds, decimal]);

  useEffect(() => {
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [update]);

  return display;
}
