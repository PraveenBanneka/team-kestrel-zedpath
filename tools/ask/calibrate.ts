// Retrieval check for Ask ZedPath: for questions whose answer page is known (verified in the handbook by hand),
// shows the rank and score of the right page, plus the best score for off-topic questions. Used to set MIN_SCORE
// on evidence. Needs the dev server with DEV_TOOLS=1. Run:  node tools/ask/calibrate.ts
const DEV = process.env.ZEDPATH_DEV_URL ?? 'http://localhost:5173';
type Hit = { id: string; score: number; page: number | null; head: string };
const search = async (q: string): Promise<Hit[]> => (await (await fetch(`${DEV}/api/dev/search`, { method: 'POST',
  headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ q, k: 8 }) })).json()) as Hit[];

// [question, page(s) where the answer is printed]. Pages checked against data/ask/corpus.json.
const ON_TOPIC: [string, number[]][] = [
  ['What are the entry requirements for Medicine?', [50, 51]],
  ['What subjects do I need for Computer Science?', [70, 71]],
  ['Physical Science course requirements', [70]],
  ['Can students with sports achievements get a special intake?', [166, 167]],
  ['වෛද්‍ය විද්‍යාව සඳහා අවශ්‍ය විෂයයන් මොනවාද?', [50, 51]],                 // Sinhala: subjects needed for Medicine
  ['மருத்துவம் படிக்க என்ன பாடங்கள் தேவை?', [50, 51]],                          // Tamil: subjects needed for Medicine
];
const OFF_TOPIC = ['What is the best cricket bat to buy?', 'How do I bake a chocolate cake?', 'Who won the 2018 football world cup?'];

for (const [q, pages] of ON_TOPIC) {
  const hits = await search(q);
  const rank = hits.findIndex(h => h.page !== null && pages.includes(h.page));
  console.log(`${rank >= 0 ? `rank ${rank + 1}, score ${hits[rank].score}` : 'NOT in top 8'}  | top ${hits[0].score} p.${hits[0].page} | ${q}`);
}
for (const q of OFF_TOPIC) console.log(`off-topic best score ${(await search(q))[0].score} | ${q}`);
