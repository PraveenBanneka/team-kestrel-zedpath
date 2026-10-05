// Student accounts (CR-001, Praveen 2026-10-05): the rules both the phone and the server validate against.
// Accounts hold a username only (no name, email or phone: NFR-030). Passwords never leave the phone: the phone
// stretches them with PBKDF2 and sends only the derived key; the server stores a hash of that key.
import type { ProfileInput } from './api.ts';

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

/** Lower-cased, trimmed; the only form ever stored or compared. */
export const normaliseUsername = (u: string) => u.trim().toLowerCase();

export interface SaltResponse { salt: string; kdf: typeof KDF }
export interface SignupRequest { username: string; key: string; profile: ProfileInput | null; extras: Extras }
export interface LoginRequest { username: string; key: string }
export interface RecoverRequest { username: string; code: string; key: string }
export interface SignupResponse { username: string; recoveryCode: string }
export interface MeResponse { username: string; profile: ProfileInput | null; extras: Extras }
export interface SaveMeRequest { profile: ProfileInput; extras: Extras }
