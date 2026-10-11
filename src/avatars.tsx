// Preset profile pictures (CR-006): 12 illustrated avatars, no photo upload (nothing to moderate, safe for minors).
// The codes are fixed in shared/account.ts AVATARS and mirrored by a CHECK in D1; this file only decides their look.
import { Atom, Bike, BookOpen, Calculator, Code2, FlaskConical, Globe2, Leaf, Music, Palette, Rocket, Trophy, type LucideIcon } from 'lucide-react';
import { AVATARS, type Avatar } from '../shared/account.ts';

const LOOK: Record<Avatar, { icon: LucideIcon; color: string }> = {
  a01: { icon: Rocket, color: '#3461C9' }, a02: { icon: Atom, color: '#6A4FC9' }, a03: { icon: BookOpen, color: '#1F8A70' },
  a04: { icon: Calculator, color: '#C26B00' }, a05: { icon: Code2, color: '#0E7C9A' }, a06: { icon: FlaskConical, color: '#B4458C' },
  a07: { icon: Globe2, color: '#2E7D4F' }, a08: { icon: Leaf, color: '#4E7A1E' }, a09: { icon: Music, color: '#A33A3A' },
  a10: { icon: Palette, color: '#8A4FC9' }, a11: { icon: Trophy, color: '#B8860B' }, a12: { icon: Bike, color: '#24478C' },
};
export const AVATAR_CODES = AVATARS;
const isAvatar = (a: string | null | undefined): a is Avatar => !!a && a in LOOK;
const initials = (s: string) => s.replace(/^Sample( senior)? · /, '').split(/[\s·,._]+/).filter(w => /^\p{L}/u.test(w)).slice(0, 2).map(w => w[0]!.toUpperCase()).join('');   // letters only: nimal_123 -> N
const toneOf = (s: string) => ['#1F8A70', '#3461C9', '#B4458C', '#C26B00', '#6A4FC9', '#0E7C9A', '#A33A3A', '#4E7A1E'][[...s].reduce((h, c) => (h * 31 + c.charCodeAt(0)) >>> 0, 7) % 8];

/** A person's picture: their preset avatar, or their initials on a steady colour. Decorative (the name is shown next to it). */
export function PersonAvatar({ avatar, name, size = 40 }: { avatar: string | null | undefined; name: string; size?: number }) {
  if (isAvatar(avatar)) {
    const { icon: Icon, color } = LOOK[avatar];
    return <span className="person-avatar" aria-hidden="true" style={{ width: size, height: size, background: color }}><Icon size={size * 0.52} color="#fff" strokeWidth={2.2} /></span>;
  }
  return <span className="person-avatar" aria-hidden="true" style={{ width: size, height: size, background: toneOf(name), fontSize: size * 0.38 }}>{initials(name) || '?'}</span>;
}
