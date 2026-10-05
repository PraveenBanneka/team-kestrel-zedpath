// ZedPath documentation build (implements the layout rules of ZP-DOC-00 Documentation Standard).
//
//   docs/NN-*/ZP-DOC-NN_*.md  ->  .docx (docx-js)  ->  .pdf (Microsoft Word, via to-pdf.ps1)
//   docs/**/diagrams/*.puml   ->  .png (PlantUML, smetana layout; no Graphviz needed)
//
// Markdown is the single source of truth. Generated .docx/.pdf files are never edited by hand.
// Usage (from repo root):  node docs/_build/build.ts [folder-prefix]     e.g.  node docs/_build/build.ts 02
//
// Markdown conventions understood here (documented in ZP-DOC-00):
//   front matter      id, title, subtitle, version, date, status, classification, owner, author, approver,
//                     standard, and repeatable `reviewer:` / `revision: v | date | author | change`
//   # Heading         auto-numbered 1 / 1.1 / 1.1.1 ; add " {-}" to skip numbering, " {.appendix}" on an H1 for A, B...
//   Table: caption    a paragraph directly before a table becomes its numbered caption ("Table 3: ...")
//   ![caption](x.png) a block image becomes a numbered figure ("Figure 2: caption")
//   > **Note:** ...   a blockquote renders as a call-out box
//   <!-- pagebreak --> forces a page break
//   | | |             a table whose header row is empty renders without a header (key/value table)

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { marked, type Token, type Tokens } from 'marked';
import * as d from 'docx';

/** Front matter of a ZP-DOC Markdown file (see ZP-DOC-00, Section "Document front matter"). */
interface Meta {
  id?: string; title?: string; subtitle?: string; version?: string; date?: string; status?: string;
  classification?: string; owner?: string; author?: string; approver?: string; standard?: string; source?: string;
  revision: string[]; reviewer: string[];
  [key: string]: string | string[] | undefined;
}
interface Stats { figures: number; tables: number }
type Block = d.Paragraph | d.Table | d.TableOfContents;

const DOCS = path.resolve(import.meta.dirname, '..');
const JAR = path.join(import.meta.dirname, 'plantuml.jar');
const filter = process.argv[2] || '';

// ---- house style (ZP-DOC-00, Section "Visual identity") ----
const C = { brand: '006B5F', brandDark: '00504A', ink: '1B1F1E', muted: '55605D', rule: 'C9D3D0', headFill: '006B5F',
  zebra: 'F3F8F6', code: 'F2F4F3', callout: 'EAF4F1', white: 'FFFFFF' };
const FONT = 'Calibri', HEAD_FONT = 'Calibri', MONO = 'Consolas';
const PAGE_W = 11906, PAGE_H = 16838, MARGIN = 1134, HEADER_GAP = 567;   // A4, 2.0 cm margins
const CONTENT_W = PAGE_W - 2 * MARGIN;                                    // 9638 DXA
const PX_PER_DXA = 96 / 1440;

// ---------------------------------------------------------------- diagrams
function renderDiagrams(dir: string): void {
  const ddir = path.join(dir, 'diagrams');
  if (!fs.existsSync(ddir)) return;
  const pumls = fs.readdirSync(ddir).filter(f => f.endsWith('.puml'));
  const stale = pumls.filter(f => {
    const png = path.join(ddir, f.replace(/\.puml$/, '.png'));
    return !fs.existsSync(png) || fs.statSync(png).mtimeMs < fs.statSync(path.join(ddir, f)).mtimeMs;
  });
  if (!stale.length) return;
  if (!fs.existsSync(JAR)) throw new Error('docs/_build/plantuml.jar missing: see docs/_build/README.md');
  execFileSync('java', ['-Djava.awt.headless=true', '-jar', JAR, '-tpng', '-Sdpi=170', ...stale.map(f => path.join(ddir, f))], { stdio: 'inherit' });
  console.log(`  diagrams: ${stale.length} rendered`);
}
const pngSize = (f: string): { w: number; h: number } => { const b = fs.readFileSync(f); return { w: b.readUInt32BE(16), h: b.readUInt32BE(20) }; };

// ---------------------------------------------------------------- front matter
function frontMatter(src: string): { meta: Meta; body: string } {
  const m = src.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  const meta: Meta = { revision: [], reviewer: [] };
  if (!m) return { meta, body: src };
  for (const line of m[1].split(/\r?\n/)) {
    const kv = line.match(/^(\w+):\s*(.*)$/);
    if (!kv) continue;
    const cur = meta[kv[1]];
    if (Array.isArray(cur)) cur.push(kv[2].trim()); else meta[kv[1]] = kv[2].trim();
  }
  return { meta, body: src.slice(m[0].length) };
}

// ---------------------------------------------------------------- inline
const textToken = (text: string): Tokens.Text => ({ type: 'text', raw: text, text });
const unescape = (s: string): string => s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'");
function inline(tokens: Token[] | undefined, style: Record<string, unknown> = {}): d.ParagraphChild[] {
  const out: d.ParagraphChild[] = [];
  for (const t of (tokens || []) as any[]) {
    switch (t.type) {
      case 'strong': out.push(...inline(t.tokens, { ...style, bold: true })); break;
      case 'em': out.push(...inline(t.tokens, { ...style, italics: true })); break;
      case 'del': out.push(...inline(t.tokens, { ...style, strike: true })); break;
      case 'codespan': out.push(new d.TextRun({ ...style, text: unescape(t.text), font: MONO, size: (Number(style.size) || 21) - 2, shading: { type: d.ShadingType.CLEAR, fill: C.code, color: 'auto' } })); break;
      case 'br': out.push(new d.TextRun({ break: 1 })); break;
      case 'link': out.push(new d.ExternalHyperlink({ link: t.href, children: inline(t.tokens, { ...style, color: C.brand, underline: {} }) })); break;
      case 'text':
        if (t.tokens && t.tokens.length) out.push(...inline(t.tokens, style));
        else out.push(new d.TextRun({ ...style, text: unescape(t.text) }));
        break;
      case 'escape': out.push(new d.TextRun({ ...style, text: t.text })); break;
      case 'html': {
        const sup = t.text.match(/^<sup>(.*)<\/sup>$/);
        if (sup) out.push(new d.TextRun({ ...style, text: sup[1], superScript: true }));
        break;
      }
      case 'image': break;
      default: if (t.raw) out.push(new d.TextRun({ ...style, text: unescape(t.raw) }));
    }
  }
  return out;
}

// ---------------------------------------------------------------- captions (Word SEQ fields -> List of Figures / Tables)
const caption = (label: 'Figure' | 'Table', text: string, keepNext: boolean): d.Paragraph => new d.Paragraph({
  style: 'Caption', keepNext, alignment: d.AlignmentType.LEFT,
  children: [new d.TextRun({ text: `${label} ` }), new d.SequentialIdentifier(label), new d.TextRun({ text: `: ${text}` })],
});

// ---------------------------------------------------------------- blocks
function imageBlock(t: Tokens.Image, dir: string, stats: Stats): d.Paragraph[] {
  const file = path.resolve(dir, decodeURI(t.href));
  if (!fs.existsSync(file)) return [new d.Paragraph({ children: [new d.TextRun({ text: `[missing image: ${t.href}]`, color: 'C00000' })] })];
  const { w, h } = pngSize(file);
  const scale = Math.min(1, (CONTENT_W * PX_PER_DXA) / w, 860 / h);
  stats.figures++;
  const text = (t.text || '').replace(/^Figure\s*\d*[.:]\s*/i, '');
  return [
    new d.Paragraph({ alignment: d.AlignmentType.CENTER, keepNext: true, spacing: { before: 160, after: 80 },
      children: [new d.ImageRun({ type: 'png', data: fs.readFileSync(file), transformation: { width: Math.round(w * scale), height: Math.round(h * scale) },
        altText: { title: text, description: text, name: path.basename(file) } })] }),
    caption('Figure', text, false),
  ];
}

function table(t: Tokens.Table, stats: Stats, captionText: string | null): Block[] {
  const cols = t.header.length;
  const headerless = t.header.every(h => !h.text.trim());
  const len = (c: { text?: string }): number => Math.min(55, Math.max(5, (c.text || '').length));
  const weights = t.header.map((h, i) => Math.max(headerless ? 5 : len(h), ...t.rows.map(r => len(r[i] || { text: '' }))));
  if (headerless && cols === 2) { weights[0] = Math.min(weights[0], 18); }
  const total = weights.reduce((a, b) => a + b, 0);
  // Never break a word: each column is at least as wide as its longest unbreakable word (about 105 DXA per
  // character at 9.5 pt, plus cell padding), capped so one column cannot take more than 45% of the table.
  const longestWord = (c: { text?: string }): number => Math.max(0, ...(c.text || '').split(/\s+/).map(w => w.replace(/[*`]/g, '').length));
  const minW = t.header.map((h, i) => Math.min(CONTENT_W * 0.45, 260 + 105 * Math.max(longestWord(h), ...t.rows.map(r => longestWord(r[i] || { text: '' })))));
  let widths = weights.map((w, i) => Math.max(minW[i], Math.round(CONTENT_W * w / total)));
  const sum = widths.reduce((a, b) => a + b, 0);
  widths = widths.map(w => Math.round(w * CONTENT_W / sum));
  widths[cols - 1] += CONTENT_W - widths.reduce((a, b) => a + b, 0);
  const b = { style: d.BorderStyle.SINGLE, size: 4, color: C.rule };
  const borders = { top: b, bottom: b, left: b, right: b };
  const align = (i: number) => t.align[i] === 'right' ? d.AlignmentType.RIGHT : t.align[i] === 'center' ? d.AlignmentType.CENTER : d.AlignmentType.LEFT;
  const cell = (c: Tokens.TableCell, i: number, kind: 'head' | 'body', rowIdx: number) => new d.TableCell({
    width: { size: widths[i], type: d.WidthType.DXA }, borders,
    shading: kind === 'head' ? { type: d.ShadingType.CLEAR, fill: C.headFill, color: 'auto' }
      : (headerless && i === 0) ? { type: d.ShadingType.CLEAR, fill: C.zebra, color: 'auto' }
      : (rowIdx % 2 === 1 ? { type: d.ShadingType.CLEAR, fill: C.zebra, color: 'auto' } : undefined),
    margins: { top: 50, bottom: 50, left: 100, right: 100 }, verticalAlign: d.VerticalAlign.CENTER,
    children: [new d.Paragraph({ alignment: align(i), spacing: { after: 0, line: 252 },
      children: inline(c.tokens, kind === 'head' ? { bold: true, size: 19, color: C.white } : (headerless && i === 0) ? { bold: true, size: 19 } : { size: 19 }) })],
  });
  const out: Block[] = [];
  if (captionText) { stats.tables++; out.push(caption('Table', captionText, true)); }
  out.push(new d.Table({
    width: { size: CONTENT_W, type: d.WidthType.DXA }, columnWidths: widths,
    rows: [...(headerless ? [] : [new d.TableRow({ tableHeader: true, cantSplit: true, children: t.header.map((c, i) => cell(c, i, 'head', 0)) })]),
      ...t.rows.map((r, ri) => new d.TableRow({ cantSplit: true, children: r.map((c, i) => cell(c, i, 'body', headerless ? 0 : ri)) }))],
  }));
  out.push(new d.Paragraph({ spacing: { after: 100 }, children: [] }));
  return out;
}

let listInstance = 0;
function list(t: Tokens.List, level = 0): d.Paragraph[] {
  const ref = t.ordered ? 'ordered' : 'bullets';
  const instance = ++listInstance;
  const out: d.Paragraph[] = [];
  for (const item of t.items) {
    let first = true;
    for (const sub of item.tokens as any[]) {
      if (sub.type === 'list') { out.push(...list(sub, level + 1)); continue; }
      if (sub.type === 'space') continue;
      const runs = (sub.type === 'text' || sub.type === 'paragraph') ? inline(sub.tokens || [textToken(sub.text)]) : inline([textToken(sub.raw)]);
      out.push(new d.Paragraph({
        numbering: first ? { reference: ref, level: Math.min(level, 2), instance } : undefined,
        indent: first ? undefined : { left: 360 * (level + 1) + 360 },
        spacing: { after: 50 }, children: runs,
      }));
      first = false;
    }
  }
  return out;
}

function makeNumberer() {
  const n = [0, 0, 0, 0]; let appendix = 0, inAppendix = false;
  return (depth: number, text: string): { label: string; text: string } => {
    if (/\s\{-\}\s*$/.test(text)) return { label: '', text: text.replace(/\s\{-\}\s*$/, '') };
    if (depth === 1 && /\s\{\.appendix\}\s*$/.test(text)) { inAppendix = true; appendix++; n[1] = n[2] = n[3] = 0;
      return { label: `Appendix ${String.fromCharCode(64 + appendix)}`, text: text.replace(/\s\{\.appendix\}\s*$/, '') }; }
    if (depth > 3) return { label: '', text };
    if (depth === 1) { if (!inAppendix) n[0]++; n[1] = n[2] = n[3] = 0; }
    else n[depth - 1]++;
    for (let i = depth; i < 4; i++) n[i] = 0;
    const head = inAppendix ? String.fromCharCode(64 + appendix) : String(n[0]);
    const parts = [head, ...n.slice(1, depth)];
    return { label: parts.join('.'), text };
  };
}

function blocks(tokens: Token[], dir: string, stats: Stats): Block[] {
  const out: Block[] = []; const num = makeNumberer(); let pendingCaption: string | null = null;
  for (let i = 0; i < tokens.length; i++) {
    const t = tokens[i] as any;
    switch (t.type) {
      case 'heading': {
        const { label, text } = num(t.depth, t.text);
        const lvl = [null, d.HeadingLevel.HEADING_1, d.HeadingLevel.HEADING_2, d.HeadingLevel.HEADING_3, d.HeadingLevel.HEADING_4][Math.min(t.depth, 4)];
        const first = marked.lexer(text)[0] as Tokens.Paragraph | undefined;
        const toks: Token[] = first?.tokens || [textToken(text)];
        out.push(new d.Paragraph({ heading: lvl, pageBreakBefore: t.depth === 1, keepNext: true, keepLines: true,
          children: [...(label ? [new d.TextRun({ text: label + (label.startsWith('Appendix') ? ': ' : ' ') })] : []), ...inline(toks)] }));
        break;
      }
      case 'paragraph': {
        const capt = t.text.match(/^Table:\s*(.+)$/s);
        if (capt) { pendingCaption = capt[1].trim(); break; }
        const imgs = ((t.tokens || []) as Token[]).filter(x => x.type === 'image') as Tokens.Image[];
        if (imgs.length && ((t.tokens || []) as Token[]).every(x => x.type === 'image' || (x.type === 'text' && !x.text.trim()))) {
          for (const im of imgs) out.push(...imageBlock(im, dir, stats));
        } else {
          const labelOnly = t.tokens?.length === 1 && t.tokens[0].type === 'strong';   // e.g. "**Acceptance criteria**"
          out.push(new d.Paragraph({ spacing: { after: 120 }, keepNext: labelOnly, children: inline(t.tokens) }));
        }
        break;
      }
      case 'list': out.push(...list(t)); break;
      case 'table': out.push(...table(t, stats, pendingCaption)); pendingCaption = null; break;
      case 'code': {
        const lines = t.text.split('\n');
        lines.forEach((ln: string, k: number) => out.push(new d.Paragraph({
          shading: { type: d.ShadingType.CLEAR, fill: C.code, color: 'auto' }, keepLines: true, keepNext: k < lines.length - 1,
          border: k === 0 ? { top: { style: d.BorderStyle.SINGLE, size: 4, color: C.rule, space: 4 } } : k === lines.length - 1 ? { bottom: { style: d.BorderStyle.SINGLE, size: 4, color: C.rule, space: 4 } } : undefined,
          spacing: { before: k === 0 ? 120 : 0, after: k === lines.length - 1 ? 160 : 0, line: 240 }, indent: { left: 113, right: 113 },
          children: [new d.TextRun({ text: ln || ' ', font: MONO, size: 17 })],
        })));
        break;
      }
      case 'blockquote':
        for (const sub of t.tokens) {
          if (sub.type === 'paragraph') out.push(new d.Paragraph({
            indent: { left: 227, right: 113 }, spacing: { before: 60, after: 120 },
            border: { left: { style: d.BorderStyle.SINGLE, size: 24, color: C.brand, space: 8 } },
            shading: { type: d.ShadingType.CLEAR, fill: C.callout, color: 'auto' },
            children: inline(sub.tokens, { color: C.ink }),
          }));
          else if (sub.type === 'list') out.push(...list(sub));
        }
        break;
      case 'hr': out.push(new d.Paragraph({ spacing: { after: 160 }, border: { bottom: { style: d.BorderStyle.SINGLE, size: 6, color: C.rule, space: 4 } }, children: [] })); break;
      case 'html': if (/<!--\s*pagebreak\s*-->/.test(t.text)) out.push(new d.Paragraph({ children: [new d.PageBreak()] })); break;
      case 'space': break;
      default: if (t.text) out.push(new d.Paragraph({ children: [new d.TextRun(t.text)] }));
    }
  }
  return out;
}

// ---------------------------------------------------------------- front sections
const P = (text: string, opts: { after?: number; align?: (typeof d.AlignmentType)[keyof typeof d.AlignmentType]; run?: Record<string, unknown> } = {}) => new d.Paragraph({ spacing: { after: opts.after ?? 80 }, alignment: opts.align, children: [new d.TextRun({ text, ...opts.run })] });
// Front-matter headings look like headings but have no outline level, so they stay out of the contents.
const unnumberedH1 = (text: string) => new d.Paragraph({ style: 'FrontHeading', children: [new d.TextRun(text)] });
const frontH2 = (text: string, before?: number) => new d.Paragraph({ style: 'FrontSub', spacing: before ? { before } : undefined, children: [new d.TextRun(text)] });

function kvTable(rows: [string, string | undefined][], firstW = 2600): d.Table {
  const b = { style: d.BorderStyle.SINGLE, size: 4, color: C.rule }; const borders = { top: b, bottom: b, left: b, right: b };
  return new d.Table({ width: { size: CONTENT_W, type: d.WidthType.DXA }, columnWidths: [firstW, CONTENT_W - firstW],
    rows: rows.map(([k, v]) => new d.TableRow({ cantSplit: true, children: [
      new d.TableCell({ width: { size: firstW, type: d.WidthType.DXA }, borders, shading: { type: d.ShadingType.CLEAR, fill: C.zebra, color: 'auto' }, margins: { top: 50, bottom: 50, left: 100, right: 100 },
        children: [new d.Paragraph({ spacing: { after: 0 }, children: [new d.TextRun({ text: k, bold: true, size: 19 })] })] }),
      new d.TableCell({ width: { size: CONTENT_W - firstW, type: d.WidthType.DXA }, borders, margins: { top: 50, bottom: 50, left: 100, right: 100 },
        children: [new d.Paragraph({ spacing: { after: 0 }, children: [new d.TextRun({ text: v || '', size: 19 })] })] })] })) });
}

function gridTable(head: string[], rows: string[][], widths: number[]): d.Table {
  const b = { style: d.BorderStyle.SINGLE, size: 4, color: C.rule }; const borders = { top: b, bottom: b, left: b, right: b };
  const total = widths.reduce((a, x) => a + x, 0); widths = widths.map(w => Math.round(w * CONTENT_W / total));
  widths[widths.length - 1] += CONTENT_W - widths.reduce((a, x) => a + x, 0);
  const mk = (txt: string, i: number, head: boolean) => new d.TableCell({ width: { size: widths[i], type: d.WidthType.DXA }, borders,
    shading: head ? { type: d.ShadingType.CLEAR, fill: C.headFill, color: 'auto' } : undefined, margins: { top: 50, bottom: 50, left: 100, right: 100 },
    children: [new d.Paragraph({ spacing: { after: 0 }, children: [new d.TextRun({ text: txt || '', size: 19, bold: head, color: head ? C.white : undefined })] })] });
  return new d.Table({ width: { size: CONTENT_W, type: d.WidthType.DXA }, columnWidths: widths,
    rows: [new d.TableRow({ tableHeader: true, children: head.map((h, i) => mk(h, i, true)) }),
      ...rows.map(r => new d.TableRow({ cantSplit: true, height: { value: 420, rule: d.HeightRule.ATLEAST }, children: r.map((c, i) => mk(c, i, false)) }))] });
}

function frontSections(meta: Meta, stats: Stats): { cover: Block[]; rest: Block[] } {
  const sp = new d.Paragraph({ spacing: { after: 120 }, children: [] });
  const cover = [
    new d.Paragraph({ spacing: { before: 0, after: 0 }, border: { top: { style: d.BorderStyle.SINGLE, size: 48, color: C.brand, space: 12 } },
      children: [new d.TextRun({ text: 'ZEDPATH', bold: true, size: 26, color: C.brand, characterSpacing: 60 })] }),
    P('Team Kestrel · IntelliCon \'26 Buildathon', { run: { size: 18, color: C.muted }, after: 2600 }),
    P(meta.id || '', { run: { size: 22, bold: true, color: C.muted }, after: 60 }),
    P(meta.title || '', { run: { size: 60, bold: true, color: C.ink, font: HEAD_FONT }, after: 120 }),
    new d.Paragraph({ spacing: { after: 900 }, children: [new d.TextRun({ text: meta.subtitle || '', size: 26, color: C.muted })] }),
    kvTable([['Version', meta.version], ['Status', meta.status], ['Date', meta.date], ['Classification', meta.classification || 'Public'], ['Document owner', meta.owner]], 2600),
    new d.Paragraph({ spacing: { before: 2200, after: 40 }, children: [new d.TextRun({ text: '© 2026 Team Kestrel. Published under the classification shown above.', size: 16, color: C.muted })] }),
    new d.Paragraph({ spacing: { after: 0 }, children: [new d.TextRun({ text: 'Uncontrolled when printed or exported. The controlled version is the Markdown source in the repository: ' + meta.source, size: 16, color: C.muted, italics: true })] }),
  ];
  const revRows = meta.revision.map(r => r.split('|').map(s => s.trim()));
  const control = [
    new d.Paragraph({ children: [new d.PageBreak()] }),
    unnumberedH1('Document control'),
    frontH2('Document information'),
    kvTable([['Document ID', meta.id], ['Title', meta.title], ['Version', meta.version], ['Status', meta.status], ['Classification', meta.classification || 'Public'],
      ['Document owner', meta.owner], ['Author', meta.author], ['Conforms to', meta.standard || 'ZP-DOC-00 Documentation Standard'], ['Source file', meta.source],
      ['Repository', 'https://github.com/PraveenBanneka/zedpath']]),
    sp,
    frontH2('Revision history'),
    gridTable(['Version', 'Date', 'Author', 'Description of change'], revRows, [10, 16, 20, 54]),
    sp,
    frontH2('Review and approval'),
    P('This document takes effect when the approver signs below. Until then its status is as shown on the cover.', { run: { size: 19, color: C.muted } }),
    gridTable(['Role', 'Name', 'Signature', 'Date'],
      [...meta.reviewer.map(r => ['Reviewer', r, '', '']), ['Approver', meta.approver || '', '', '']], [22, 38, 22, 18]),
  ];
  const lists: Block[] = [
    new d.Paragraph({ children: [new d.PageBreak()] }),
    unnumberedH1('Contents'),
    new d.TableOfContents('Contents', { hyperlink: true, headingStyleRange: '1-2' }),
  ];
  if (stats.figures) lists.push(frontH2('List of figures', 360),
    new d.TableOfContents('Figures', { hyperlink: true, captionLabelIncludingNumbers: 'Figure' }));
  if (stats.tables) lists.push(frontH2('List of tables', 360),
    new d.TableOfContents('Tables', { hyperlink: true, captionLabelIncludingNumbers: 'Table' }));
  return { cover, rest: [...control, ...lists] };
}

// ---------------------------------------------------------------- document
function headerFooter(meta: Meta): { hdr: d.Header; ftr: d.Footer } {
  const hdr = new d.Header({ children: [new d.Paragraph({
    border: { bottom: { style: d.BorderStyle.SINGLE, size: 4, color: C.rule, space: 4 } },
    children: [new d.TextRun({ text: 'ZedPath', bold: true, size: 16, color: C.brand }), new d.TextRun({ text: `  |  ${meta.title}`, size: 16, color: C.muted }),
      new d.TextRun({ children: [new d.PositionalTab({ alignment: d.PositionalTabAlignment.RIGHT, relativeTo: d.PositionalTabRelativeTo.MARGIN, leader: d.PositionalTabLeader.NONE }), `${meta.id}  ·  v${meta.version}  ·  ${meta.status}`], size: 16, color: C.muted })] })] });
  const ftr = new d.Footer({ children: [new d.Paragraph({
    border: { top: { style: d.BorderStyle.SINGLE, size: 4, color: C.rule, space: 4 } },
    children: [new d.TextRun({ text: `Classification: ${meta.classification || 'Public'}`, size: 16, color: C.muted }),
      new d.TextRun({ children: [new d.PositionalTab({ alignment: d.PositionalTabAlignment.CENTER, relativeTo: d.PositionalTabRelativeTo.MARGIN, leader: d.PositionalTabLeader.NONE }), 'Uncontrolled when printed'], size: 16, color: C.muted }),
      new d.TextRun({ children: [new d.PositionalTab({ alignment: d.PositionalTabAlignment.RIGHT, relativeTo: d.PositionalTabRelativeTo.MARGIN, leader: d.PositionalTabLeader.NONE }), 'Page ', d.PageNumber.CURRENT, ' of ', d.PageNumber.TOTAL_PAGES], size: 16, color: C.muted })] })] });
  return { hdr, ftr };
}

const STYLES = {
  default: { document: { run: { font: FONT, size: 21, color: C.ink }, paragraph: { spacing: { line: 264 } } } },
  paragraphStyles: [
    { id: 'Heading1', name: 'Heading 1', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: HEAD_FONT, size: 34, bold: true, color: C.brand }, paragraph: { spacing: { before: 0, after: 200 }, outlineLevel: 0, border: { bottom: { style: d.BorderStyle.SINGLE, size: 8, color: C.brand, space: 4 } } } },
    { id: 'Heading2', name: 'Heading 2', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: HEAD_FONT, size: 27, bold: true, color: C.ink }, paragraph: { spacing: { before: 300, after: 120 }, outlineLevel: 1 } },
    { id: 'Heading3', name: 'Heading 3', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: HEAD_FONT, size: 23, bold: true, color: C.brandDark }, paragraph: { spacing: { before: 240, after: 80 }, outlineLevel: 2 } },
    { id: 'Heading4', name: 'Heading 4', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { font: HEAD_FONT, size: 21, bold: true, color: C.muted }, paragraph: { spacing: { before: 160, after: 60 }, outlineLevel: 3 } },
    { id: 'FrontHeading', name: 'Front Heading', basedOn: 'Normal', next: 'Normal', run: { font: HEAD_FONT, size: 34, bold: true, color: C.brand }, paragraph: { keepNext: true, spacing: { before: 0, after: 200 }, border: { bottom: { style: d.BorderStyle.SINGLE, size: 8, color: C.brand, space: 4 } } } },
    { id: 'FrontSub', name: 'Front Subheading', basedOn: 'Normal', next: 'Normal', run: { font: HEAD_FONT, size: 25, bold: true, color: C.ink }, paragraph: { keepNext: true, spacing: { before: 240, after: 100 } } },
    { id: 'Caption', name: 'Caption', basedOn: 'Normal', next: 'Normal', quickFormat: true, run: { size: 18, italics: true, color: C.muted }, paragraph: { spacing: { before: 60, after: 160 } } },
  ],
};
const NUMBERING = { config: [
  { reference: 'bullets', levels: [0, 1, 2].map(l => ({ level: l, format: d.LevelFormat.BULLET, text: ['•', '–', '▪'][l], alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1) + 360, hanging: 280 } } } })) },
  { reference: 'ordered', levels: [0, 1, 2].map(l => ({ level: l, format: [d.LevelFormat.DECIMAL, d.LevelFormat.LOWER_LETTER, d.LevelFormat.LOWER_ROMAN][l], text: `%${l + 1}.`, alignment: d.AlignmentType.LEFT, style: { paragraph: { indent: { left: 360 * (l + 1) + 360, hanging: 360 } } } })) },
] };

async function buildDoc(mdFile: string): Promise<string> {
  const dir = path.dirname(mdFile);
  renderDiagrams(dir);
  const { meta, body } = frontMatter(fs.readFileSync(mdFile, 'utf8'));
  meta.source = path.relative(path.resolve(DOCS, '..'), mdFile).replace(/\\/g, '/');
  listInstance = 0;
  const stats: Stats = { figures: 0, tables: 0 };
  const content = blocks(marked.lexer(body), dir, stats);
  const { cover, rest } = frontSections(meta, stats);
  const { hdr, ftr } = headerFooter(meta);
  const page = { size: { width: PAGE_W, height: PAGE_H }, margin: { top: MARGIN + 200, bottom: MARGIN, left: MARGIN, right: MARGIN, header: HEADER_GAP, footer: HEADER_GAP } };
  const doc = new d.Document({
    creator: 'Team Kestrel', lastModifiedBy: 'ZedPath docs build', title: `${meta.id} ${meta.title}`, subject: meta.subtitle || '',
    keywords: 'ZedPath; Team Kestrel; IntelliCon 2026', description: `${meta.id} v${meta.version} (${meta.status})`,
    features: { updateFields: true }, styles: STYLES, numbering: NUMBERING,
    sections: [
      { properties: { page }, children: cover },
      { properties: { page, type: d.SectionType.NEXT_PAGE }, headers: { default: hdr }, footers: { default: ftr }, children: [...rest.slice(1), ...content] },
    ],
  });
  const out = mdFile.replace(/\.md$/, '.docx');
  fs.writeFileSync(out, await d.Packer.toBuffer(doc));
  console.log(`  docx: ${path.relative(DOCS, out)}  (${stats.figures} figures, ${stats.tables} tables)`);
  return out;
}

(async () => {
  const mds = fs.readdirSync(DOCS, { withFileTypes: true })
    .filter(e => e.isDirectory() && /^\d\d-/.test(e.name) && e.name.startsWith(filter))
    .flatMap(e => fs.readdirSync(path.join(DOCS, e.name)).filter(f => /^ZP-DOC-\d\d.*\.md$/.test(f)).map(f => path.join(DOCS, e.name, f)));
  if (!mds.length) { console.log('no docs matched'); return; }
  const built: string[] = [];
  for (const md of mds) { console.log(path.relative(DOCS, md)); built.push(await buildDoc(md)); }
  execFileSync('powershell.exe', ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', path.join(import.meta.dirname, 'to-pdf.ps1'), ...built], { stdio: 'inherit' });
})().catch(e => { console.error(e); process.exit(1); });
