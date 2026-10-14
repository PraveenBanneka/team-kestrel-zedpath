// The sample student used by demo mode (src/demo.ts, ?demo=kasun) for the Gate 3 recording. Kept in shared/ so the
// server tests can check that every prefilled value is accepted. Placeholder email and mobile, never contacted.
import type { ProfileInput } from './api.ts';
import type { Extras } from './account.ts';
import type { Contact } from './contact.ts';

export const DEMO_USERNAME = 'kasun_demo';
export const DEMO_CONTACT: Contact = { fullName: 'Kasun Perera', email: 'kasun.perera@example.com', mobile: '0771234567', birthDate: '2006-03-14' };
export const DEMO_PROFILE: ProfileInput = { stream: 'PHYS', district: 'KUR', zE4: 14200, al: { CMATH: 'B', PHY: 'C', CHEM: 'C' } };
export const DEMO_EXTRAS: Extras = {
  // A real national event (All Island School Games, Ministry of Education); Kasun himself is a sample student.
  achievements: [{ id: 'demo1', activity: 'All Island School Games: Athletics (400 m)', kind: 'SPORT', level: 'NATIONAL', place: 'SECOND', year: 2024 }],
  interests: ['Sport', 'Making and engineering', 'Maths'],
};
