// Press and hold (about half a second) on a row, used to start choosing several courses (Courses, My list). A hold
// that turns into a scroll (the finger moves more than 10 px) is cancelled. The click that follows a hold is swallowed,
// so a hold never also opens the row. The browser's long-press menu is suppressed on those rows.
import { useRef } from 'react';

export function useHold(onHold: (() => void) | undefined, ms = 450) {
  const h = useRef<{ timer: number; x: number; y: number; fired: boolean } | null>(null);
  const handlers = onHold ? {
    onPointerDown: (e: React.PointerEvent) => {
      const s = { timer: 0, x: e.clientX, y: e.clientY, fired: false };
      s.timer = window.setTimeout(() => { s.fired = true; onHold(); navigator.vibrate?.(15); }, ms);
      h.current = s;
    },
    onPointerMove: (e: React.PointerEvent) => {
      const s = h.current; if (s && !s.fired && Math.hypot(e.clientX - s.x, e.clientY - s.y) > 10) { clearTimeout(s.timer); h.current = null; }
    },
    onPointerUp: () => { if (h.current && !h.current.fired) clearTimeout(h.current.timer); },
    onPointerCancel: () => { if (h.current) clearTimeout(h.current.timer); h.current = null; },
    onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
  } : {};
  /** Call first in onClick: true when this click ended a hold (and should do nothing else). */
  const consumed = () => { const was = !!h.current?.fired; h.current = null; return was; };
  return { handlers, consumed };
}
