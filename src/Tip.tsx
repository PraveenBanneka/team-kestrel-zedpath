// A how-to tip that is easy to spot (review 2026-10-18: grey helper text was missed). The words before the first colon
// are the lead, in bold; the rest is the steps.
import { Lightbulb } from 'lucide-react';

export function Tip({ text }: { text: string }) {
  const i = text.indexOf(':');
  return (
    <p className="tip-box">
      <Lightbulb size={20} aria-hidden="true" />
      <span>{i > 0 ? <><b>{text.slice(0, i + 1)}</b>{text.slice(i + 1)}</> : text}</span>
    </p>);
}
