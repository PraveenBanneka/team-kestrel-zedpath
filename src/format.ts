// Display helpers shared by the app's screens: the UGC tables are in capitals and use compact codes.

/** "2024/2025" -> "24/25" */
export function shortYear(y: string): string { return y.replace(/^\d{2}(\d{2})\/\d{2}(\d{2})$/, '$1/$2'); }

/** "UNIVERSITY OF SRI JAYEWARDENEPURA" -> "University of Sri Jayewardenepura"; mixed-case text is left as it is. */
export function titleCase(s: string): string {
  if (s !== s.toUpperCase()) return s;
  return s.toLowerCase().replace(/\b([a-z])/g, m => m.toUpperCase()).replace(/\b(Of|And|In|The|For|&)\b/g, w => w.toLowerCase())
    .replace(/\b(Ict|It|Mit|Tesl|Sp|Sab|Tv|Bis|Ucsc)\b/gi, w => w.toUpperCase()).replace(/^./, c => c.toUpperCase());
}

/** "UNIVERSITY OF COLOMBO" -> "Colombo"; "TRINCOMALEE CAMPUS, EASTERN UNIVERSITY, SRI LANKA" -> "Trincomalee Campus, Eastern" */
export function shortInstitution(s: string): string {
  return titleCase(s).replace(/,?\s*Sri Lanka$/i, '').replace(/^University of /, '').replace(/ University$/, '');
}

/** "03 years; 04-year Honours at UCSC, ... (p70)" -> "3 years (honours option)" */
export function shortDuration(s: string): string {
  const first = s.replace(/\s*\(p\d+\)/g, '').split(/[;(]/)[0].trim().replace(/^0(\d)/, '$1').replace(/Years?/i, 'years');
  return /honours/i.test(s) && !/honours/i.test(first) ? `${first} (honours option)` : first;
}
