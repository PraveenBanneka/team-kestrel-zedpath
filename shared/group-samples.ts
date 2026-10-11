// Sample conversations for course groups (video 2, Praveen 2026-10-11: groups should open with chats already there, and
// seniors in them, so a student sees how a group works). Trust rule: sample data is labelled as sample. Every author
// here starts with "Sample", every message carries `sample: true` (the phone shows a "Sample" tag), no badge says
// "verified", and the ids are not message ids, so nobody can report, block or reply to a made-up person.
// The advice is general and points to the official sources and ZedPath's cited pages; it states no cut-off or date.
// These are NOT stored: the group's room adds them to the history it sends, before the real messages.
import type { ChatMessage } from './groups.ts';

type Line = [author: string, badge: string | null, body: string];
const STUDENT = (name: string) => `Sample · ${name}`;
const SENIOR = (course: string, year: number) => `Sample senior · ${course}, year ${year}`;

const THREADS: Record<string, Line[]> = {
  BATCH: [
    [STUDENT('Dinithi'), null, 'Anyone else from our batch still deciding what to put first on the UGC list?'],
    [STUDENT('Kasun'), null, 'Same here. I added 8 courses to My list and ordered them by what I actually want, not only the Safe ones.'],
    [STUDENT('Ishara'), SENIOR('Management', 2), 'Good way to do it. Put the course you want most first, even if it is a Reach: you are offered the highest choice on your list that you qualify for.'],
    [STUDENT('Dinithi'), null, 'Is the interest-free loan only for private degrees?'],
    [STUDENT('Ishara'), SENIOR('Management', 2), 'It is for approved private institutes. Ask ZedPath shows the official rules with the page they come from, read them before you apply.'],
  ],
  'COURSE:001': [
    [STUDENT('Tharindu'), null, 'Bio stream, Colombo district. Is Medicine realistic if my Z is just under last year\'s cut-off?'],
    [STUDENT('Amaya'), SENIOR('Medicine', 3), 'Check the 5-year chart on the course page: cut-offs move every year. Put Medicine first and keep some Safe courses below it.'],
    [STUDENT('Tharindu'), null, 'What is first year actually like?'],
    [STUDENT('Amaya'), SENIOR('Medicine', 3), 'A lot of anatomy, physiology and biochemistry. Start a study group in the first week, it helps more than anything.'],
    [STUDENT('Rashmi'), null, 'Does Medicine have an aptitude test?'],
    [STUDENT('Amaya'), SENIOR('Medicine', 3), 'The course page says it for each course. For Medicine there is none, selection is by Z-score.'],
  ],
  'COURSE:008': [
    [STUDENT('Hasitha'), null, 'Maths stream here. How do they decide which engineering field you get?'],
    [STUDENT('Nadun'), SENIOR('Engineering', 2), 'You choose your field after the first year, based on your first-year results. So the first year matters a lot.'],
    [STUDENT('Hasitha'), null, 'Should I list every university that offers Engineering?'],
    [STUDENT('Nadun'), SENIOR('Engineering', 2), 'List the ones you would really go to, in the order you prefer. Compare them side by side in ZedPath first.'],
  ],
  'COURSE:012': [
    [STUDENT('Sanduni'), null, 'Do I need to know programming before starting Computer Science?'],
    [STUDENT('Ravindu'), SENIOR('Computer Science', 2), 'No, first year starts from the basics. Trying a little Python before you start makes it easier though.'],
    [STUDENT('Sanduni'), null, 'Is Combined Maths needed?'],
    [STUDENT('Ravindu'), SENIOR('Computer Science', 2), 'The course page lists the exact subjects from the UGC handbook, with the page number. Check it there.'],
  ],
  'COURSE:016': [
    [STUDENT('Pasindu'), null, 'Commerce stream, Colombo. Management or Commerce degree, which is better?'],
    [STUDENT('Ishara'), SENIOR('Management', 2), 'Depends on you. Open both in Compare: you can see the entry rules, places and your chances side by side.'],
    [STUDENT('Pasindu'), null, 'Can I do CA while doing the degree?'],
    [STUDENT('Ishara'), SENIOR('Management', 2), 'Many of us do a professional course alongside. Plan it for after the first semester, when you know your timetable.'],
  ],
  'COURSE:018': [
    [STUDENT('Hiruni'), null, 'Which universities offer Commerce?'],
    [STUDENT('Malith'), SENIOR('Commerce', 3), 'Open the Commerce course in ZedPath: every university offering it is listed with your chance for each.'],
    [STUDENT('Hiruni'), null, 'Thanks! And internships?'],
    [STUDENT('Malith'), SENIOR('Commerce', 3), 'Most of us do one in the final year. Start building your CV from the first year.'],
  ],
  'COURSE:025': [
    [STUDENT('Yasas'), null, 'Law has an aptitude test right? When do they announce it?'],
    [STUDENT('Thilini'), SENIOR('Law', 2), 'Each university announces its own in a press notice. Add the date to your Journey when it is out so you get a reminder.'],
  ],
  COURSE: [
    [STUDENT('Nethmi'), null, 'Hi everyone! Anyone else aiming for this course?'],
    [STUDENT('Chamod'), null, 'Yes! Still deciding the order of my UGC list.'],
    [STUDENT('Ishara'), SENIOR('this course', 2), 'Ask here if you want to know what studying it is really like. For rules and dates, check the cited pages in ZedPath.'],
  ],
};

/** The room's key for its samples: 'BATCH', 'COURSE:<code>' when that course has its own thread, else 'COURSE'. */
export const sampleKey = (kind: 'COURSE' | 'BATCH', courseCode: string | null) =>
  kind === 'BATCH' ? 'BATCH' : THREADS[`COURSE:${courseCode}`] ? `COURSE:${courseCode}` : 'COURSE';

/** The sample messages for a room, oldest first, dated the day before the group feature went live. */
export function samplesFor(key: string): ChatMessage[] {
  const lines = THREADS[key] ?? THREADS.COURSE;
  return lines.map(([author, badge, body], i) => ({ id: `sample-${key}-${i}`, author, badge, body, sample: true,
    at: new Date(Date.UTC(2026, 9, 10, 4, 30 + i * 7)).toISOString() }));
}
export const SAMPLE_KEYS = Object.keys(THREADS);
