// A short green confirmation near the bottom of the screen (Praveen 2026-10-23: "a green thing with a tick when courses are
// added"). The live region is always in the page, so screen readers announce each message; it hides itself after a moment.
import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react';
import { CheckCircle2 } from 'lucide-react';

export function useToast(ms = 2600): [ReactElement, (text: string) => void] {
  const [msg, setMsg] = useState<{ text: string; n: number } | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const show = useCallback((text: string) => {
    setMsg(m => ({ text, n: (m?.n ?? 0) + 1 }));          // a new n restarts the pop-in, even for the same words
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setMsg(null), ms);
  }, [ms]);
  useEffect(() => () => window.clearTimeout(timer.current), []);
  const el = (
    <div className="toast-host" role="status" aria-live="polite">
      {msg && <div className="toast" key={msg.n}><CheckCircle2 size={22} aria-hidden="true" /><span>{msg.text}</span></div>}
    </div>);
  return [el, show];
}
