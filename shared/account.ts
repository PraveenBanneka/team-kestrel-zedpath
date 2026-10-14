// Student accounts (CR-001, Praveen 2026-10-05): the rules both the phone and the server validate against.
// Accounts hold a username only (no name, email or phone: NFR-030). Passwords never leave the phone: the phone
// stretches them with PBKDF2 and sends only the derived key; the server stores a hash of that key.
import type { ProfileInput } from './api.ts';
import type { Contact } from './contact.ts';

export const USERNAME_RE = /^[a-z0-9_.]{3,24}$/;
export const PASSWORD_MIN = 8;
export const PASSWORD_MAX = 128;
export const KDF = 'PBKDF2-SHA256-600000' as const;
export const KDF_ITERATIONS = 600_000;
export const KEY_HEX_RE = /^[0-9a-f]{64}$/;                 // 256-bit derived key, lowercase hex
export const RECOVERY_RE = /^[A-Z2-7]{4}(-[A-Z2-7]{4}){3}$/;  // 16 base32 characters = 80 bits
export const SESSION_DAYS = 30;
export const MAX_ACHIEVEMENTS = 30;
export const ACTIVITY_MAX = 80;

export const ACHIEVEMENT_KINDS = ['SPORT', 'COMPETITION', 'CLUB', 'ARTS', 'OTHER'] as const;
export const LEVELS = ['SCHOOL', 'ZONAL', 'DISTRICT', 'PROVINCIAL', 'NATIONAL', 'INTERNATIONAL'] as const;
export const PLACES = ['FIRST', 'SECOND', 'THIRD', 'TAKING_PART'] as const;
/** Mirrored by the CHECK on student_interest.interest (migration 0003); a test pins the two together. */
export const INTERESTS = ['Building apps', 'Maths', 'Science and labs', 'Working with people', 'Business and money', 'Teaching',
  'Health and caring', 'Art and design', 'Languages', 'Law and society', 'Nature and farming', 'Making and engineering', 'Sport'] as const;

export type Level = typeof LEVELS[number];
export type Place = typeof PLACES[number];
export interface Achievement { id: string; activity: string; kind: typeof ACHIEVEMENT_KINDS[number]; level: Level; place: Place; year: number }
export interface Extras { achievements: Achievement[]; interests: string[] }

/**
 * Special intake hint (handbook 2025/26 Section 6, printed p.166 to p.167): up to 0.5% of places per course for
 * 1st/2nd/3rd places at national level or achievements at international level between 01.01.2023 and 31.12.2025,
 * for candidates within a Z-score of 0.2000 of their district cut-off; extra places for elite sportspeople in
 * Sports Science and Physical Education. ZedPath only flags that it MAY apply and links the section.
 */
export function specialIntakeHint(e: Extras): { applies: boolean; sport: boolean } {
  const recent = e.achievements.filter(a => a.year >= 2023 && a.year <= 2025);
  const qualifying = recent.filter(a => a.level === 'INTERNATIONAL' || (a.level === 'NATIONAL' && a.place !== 'TAKING_PART'));
  return { applies: qualifying.length > 0, sport: qualifying.some(a => a.kind === 'SPORT') };
}

/** CR-006: preset profile pictures (no photo upload). Mirrored by the CHECK on account.avatar (migration 0010). */
export const AVATARS = ['a01', 'a02', 'a03', 'a04', 'a05', 'a06', 'a07', 'a08', 'a09', 'a10', 'a11', 'a12'] as const;
export type Avatar = typeof AVATARS[number];
export const isAvatar = (x: unknown): x is Avatar => (AVATARS as readonly unknown[]).includes(x);

/** Lower-cased, trimmed; the only form ever stored or compared. */
export const normaliseUsername = (u: string) => u.trim().toLowerCase();

export interface SaltResponse { salt: string; kdf: typeof KDF }
export interface SignupRequest { username: string; key: string; profile: ProfileInput | null; extras: Extras; inviteCode?: string;
  contact: Contact; consent: string }
export interface LoginRequest { username: string; key: string }
export interface RecoverRequest { username: string; code: string; key: string }
export interface SignupResponse { username: string; recoveryCode: string }
/** role SENIOR = a verified senior (CR-002): no A/L results stored; `senior` says what they study. */
export interface MeResponse { username: string; role: 'STUDENT' | 'SENIOR'; senior: { course: string; institution: string; year: number } | null;
  /** CR-003: compulsory contact details; null only for accounts made before CR-003 (the app asks them to complete it). */
  contact: Contact | null;
  /** CR-006: the chosen preset picture; null = initials. */
  avatar: Avatar | null;
  /** CR-007: a throwaway demo account (read-only in groups, deleted 24 hours after it was made). */
  demo: boolean;
  profile: ProfileInput | null; extras: Extras }
export interface SaveMeRequest { profile: ProfileInput; extras: Extras }
