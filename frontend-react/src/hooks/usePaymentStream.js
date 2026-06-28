import { useEffect, useRef, useCallback, useState } from 'react';

const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

export function usePaymentStream(studentId, onUpdate) {
  const [connected, setConnected] = useState(false);
  const esRef = useRef(null);

  const connect = useCallback(() => {
    if (!studentId) return;
    if (esRef.current) esRef.current.close();

    const es = new EventSource(`${API_BASE}/public/status/stream/${encodeURIComponent(studentId)}`);
    esRef.current = es;

    es.onopen = () => setConnected(true);
    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'payment_recorded') onUpdate?.(data);
      } catch {}
    };
    es.onerror = () => {
      setConnected(false);
      es.close();
      setTimeout(connect, 3000);
    };
  }, [studentId, onUpdate]);

  useEffect(() => {
    connect();
    return () => { esRef.current?.close(); setConnected(false); };
  }, [connect]);

  return { connected };
}
