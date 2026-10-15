// University facts from the UGC's "Sri Lanka University Statistics 2024" (compiled by tools/statistics/build-statistics.ts).
// Every fact cites its table and page; flags keep the report's own caveats visible to students.
export type FactKind = 'ADMITTED' | 'STUDENTS' | 'HOSTEL' | 'GRADUATES';
export type FactFlag = 'PROVISIONAL' | 'INCOMPLETE';
export interface InstitutionFact {
  kind: FactKind;
  value: number;            // ADMITTED: selected for 2023/24; STUDENTS: undergraduates; HOSTEL: places; GRADUATES: graduates
  share?: number;           // HOSTEL: % of undergraduates the hostels can house, as printed
  flags: FactFlag[];
  source: { url: string; page: number; table: string; chapter: string };
}
export interface StatisticsFile { title: string; publisher: string; retrievedOn: string; institutions: Record<string, InstitutionFact[]> }
