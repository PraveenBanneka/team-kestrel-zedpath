// Reference data that is fixed by the UGC handbook 2025/26 (printed page numbers cited per item).

/** The 25 administrative districts, in the order the UGC tables print them; BR-007 flags (handbook p.9). */
export const DISTRICTS: { code: string; name: string; disadvantaged: boolean }[] = [
  ['COL', 'COLOMBO', false], ['GAM', 'GAMPAHA', false], ['KAL', 'KALUTARA', false], ['MTL', 'MATALE', false],
  ['KAN', 'KANDY', false], ['NUW', 'NUWARA ELIYA', true], ['GAL', 'GALLE', false], ['MTR', 'MATARA', false],
  ['HAM', 'HAMBANTOTA', true], ['JAF', 'JAFFNA', true], ['KIL', 'KILINOCHCHI', true], ['MAN', 'MANNAR', true],
  ['MUL', 'MULLAITIVU', true], ['VAV', 'VAVUNIYA', true], ['TRI', 'TRINCOMALEE', true], ['BAT', 'BATTICALOA', true],
  ['AMP', 'AMPARA', true], ['PUT', 'PUTTALAM', true], ['KUR', 'KURUNEGALA', false], ['ANU', 'ANURADHAPURA', true],
  ['POL', 'POLONNARUWA', true], ['BAD', 'BADULLA', true], ['MON', 'MONARAGALA', true], ['KEG', 'KEGALLE', false],
  ['RAT', 'RATNAPURA', true],
].map(([code, name, disadvantaged]) => ({ code: code as string, name: name as string, disadvantaged: disadvantaged as boolean }));

/** Six A/L streams (handbook p.20). */
export const STREAMS: { code: string; name: string }[] = [
  { code: 'ARTS', name: 'Arts' }, { code: 'COMMERCE', name: 'Commerce' }, { code: 'BIO', name: 'Biological Science' },
  { code: 'PHYS', name: 'Physical Science' }, { code: 'ET', name: 'Engineering Technology' }, { code: 'BST', name: 'Biosystems Technology' },
];

/**
 * Institution kinds: 16 universities, 2 campuses, 2 higher educational institutes (handbook p.12 to p.13).
 * Campus parents: Sripalee Campus belongs to the University of Colombo; Trincomalee Campus to Eastern University.
 */
export const INSTITUTION_KIND: Record<string, { kind: 'UNIVERSITY' | 'CAMPUS' | 'HEI'; parent?: string }> = {
  S: { kind: 'CAMPUS', parent: 'A' }, W: { kind: 'CAMPUS', parent: 'H' }, T: { kind: 'HEI' }, Y: { kind: 'HEI' },
};

/** Names printed differently in the cut-off table than in the handbook's Uni-Code list. */
export const INSTITUTION_ALIASES: Record<string, string> = {
  'UNIVERSITY OF COLOMBO SRI PALEE CAMPUS': 'S',
  'SWAMI VIPULANANDA INSTITUTE OF AESTHETIC STUDIES': 'Y',
  'UNIVERSITY OF JAYEWARDENEPURA': 'C',   // misprint in the 2025/26 table (missing "Sri"), page 4 column 27
};
