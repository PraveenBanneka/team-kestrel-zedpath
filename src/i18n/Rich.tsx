// Renders a translated string that marks emphasis with <b>...</b> (the only markup the dictionaries may use).
// Built from text nodes, never innerHTML, so a dictionary entry can never inject markup.
export function Rich({ text }: { text: string }) {
  return <>{text.split(/(<b>[^<]*<\/b>)/g).filter(Boolean).map((p, i) =>
    p.startsWith('<b>') ? <b key={i}>{p.slice(3, -4)}</b> : <span key={i}>{p}</span>)}</>;
}
