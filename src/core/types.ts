// The data the music rules read and write. Everything here is plain JSON: no classes, no DOM, no audio.

export type Swara = 'S' | 'R' | 'G' | 'M' | 'P' | 'D' | 'N';
export type SlotType = 'note' | 'stroke' | 'hold' | 'rest' | 'step';
export type SwellKind = 'grow' | 'fade' | 'swell';
export type SlurKind = 'start' | 'mid' | 'end' | 'single';

/** One note, stroke, hold, rest or footfall inside a matra. */
export interface Slot {
  type: SlotType;
  dev?: string;
  swara?: Swara;
  octave?: number;
  vikrit?: boolean;
  stroke?: string;
  accent?: boolean;
  loud?: boolean;
  fermata?: boolean;
  swell?: SwellKind;
  uncertain?: boolean;
  slur?: SlurKind;
  grace?: Slot[];
  hand?: string;
  foot?: 'L' | 'R';
  w?: number;
}

/** One matra: the unit of time. A group `[ … ]` shares one matra between its slots. */
export interface Matra {
  beat?: number;
  span?: number;
  slots: Slot[];
  group?: boolean;
  cue?: string;
  lyric?: string;
  at?: number;
  step?: { foot: 'L' | 'R'; matras: number };
  charanEnd?: boolean;
}

export interface Gat { matras: Matra[] }

/** Notation line extras as typed by a transcriber (ghosh-notation/1). */
export interface SourceLine {
  t: string;
  pickup?: boolean;
  partial?: boolean;
  lyrics?: string[];
  hands?: string;
  note?: string;
  players?: string;
  label?: string;
  type?: string;
}

export interface SourcePart {
  tala: string;
  laya: number | string;
  lines: (string | SourceLine)[];
  source?: Record<string, unknown> | null;
  status?: string;
  headingTala?: string;
  form?: (string | number)[];
  transcribedBy?: string;
  checkedBy?: string;
}

/** A book rachana as written by a transcriber: format `ghosh-notation/1`. */
export interface SourcePiece {
  format?: string;
  id: string;
  kind?: string;
  title: { dev: string; rom?: string; alt?: string[] };
  section?: string;
  complete?: boolean;
  raga?: { name?: string; aroha?: string; avaroha?: string; arohaNotes?: RagaNote[]; avarohaNotes?: RagaNote[] };
  text?: unknown;
  usage?: unknown;
  standing?: boolean;
  notes?: unknown;
  tags?: unknown;
  tuning?: unknown;
  media?: unknown;
  options?: { talVadya?: Record<string, string> };
  parts: Record<string, SourcePart>;
}

export interface RagaNote { swara: Swara; octave: number; vikrit?: boolean; dev: string }

export interface Warning { part?: string; line?: number; msg: string }

/* ------------------------------------------------------------------ talas */

export interface TalaVariant { beats: number[]; label?: string; confidence?: string }

/** One entry of rules/talas.json. */
export interface TalaDef {
  name: { dev: string; rom: string };
  cycle: number;
  ganSize: number;
  gats: number[] | null;
  count?: string;
  roll?: { strokesPerMatra: number; pattern?: string; confidence?: string };
  steps?: { matrasPerStep: number; gait: string; confidence?: string } | null;
  talVadya: { default: string; variants: Record<string, TalaVariant>; use?: string };
  explain?: Record<string, string>;
}
export type TalaTable = Record<string, TalaDef>;
export interface TalaLibrary { format?: string; description?: string; talas: TalaTable }

/** The tala of a part as the first compile step records it. */
export interface TalaInfo {
  name: string;
  key: string;
  laya: number;
  cycle: number;
  ganSize: number;
  gats: number[] | null;
  stepMatras: number | null;
}

/* ------------------------------------------------- tree (ghosh-notation/2) */

export interface TreeGan {
  gats: Gat[];
  short?: boolean;
  yati?: number;
  span?: number;
}
export interface TreeLine { line: number; src: string; gans: TreeGan[] }
export interface TreeCharan {
  n: number;
  label?: string;
  type?: string;
  repeat: number;
  tala?: TalaInfo;
  laya?: number;
  players?: string;
  notes?: string[];
  pickup?: Matra[];
  lines: TreeLine[];
  endings?: Record<string, { lines: TreeLine[] }>;
}
export interface TreePart {
  instrument: string;
  source: Record<string, unknown> | null;
  status: string;
  tala: TalaInfo;
  headingTala?: string;
  form?: (string | number)[];
  charans: TreeCharan[];
}
export interface TreePiece {
  format: 'ghosh-notation/2';
  id: string;
  kind: string;
  title: SourcePiece['title'];
  section?: string;
  complete?: boolean;
  raga?: SourcePiece['raga'];
  text?: unknown;
  usage?: unknown;
  standing?: boolean;
  notes?: unknown;
  tags?: unknown;
  tuning?: unknown;
  media?: unknown;
  parts: Record<string, TreePart>;
}

/* ------------------------------------------------------ standalone ghosh/3 */

interface Gan3Base { addr: string; charan: string; seg: string; line?: number }
/** A गण that is played: gats of matras. */
export interface PlayedGan3 extends Gan3Base { short?: boolean; yati?: undefined; span?: undefined; gats: Gat[] }
/** A दीर्घ यति: `span` matras of silence, no gats. */
export interface YatiGan3 extends Gan3Base { yati: number; span: number; gats?: undefined; short?: undefined }
export type Gan3 = PlayedGan3 | YatiGan3;
export interface Pickup { charan: string; matras: Matra[] }
export interface Charan3 {
  id: string;
  n: number;
  label?: string;
  type?: string;
  role?: string;
  no?: number;
  repeat: number;
  tala: string;
  laya: number;
  players?: string;
  notes?: string[];
  segments: string[];
}
export interface Part3 {
  instrument: string;
  role: string;
  kind: 'printed' | 'derived';
  rule?: unknown;
  pickups?: Pickup[];
  gans: Gan3[];
}
export interface LayoutLine { line?: number; pickup?: string; gans: string[]; src?: string | string[] }
export interface Prelude {
  id: string;
  label: string;
  type: string;
  tala: string;
  laya: number;
  source: string;
  note: string;
  confidence: string;
  parts: Record<string, { gans: PlayedGan3[] }>;
}
export interface PerformanceStep { id: string; times: number; closing?: boolean }

export interface Piece3 {
  format: 'ghosh/3';
  id: string;
  generated: { by: string; at: string };
  meta: Record<string, unknown> & { title: SourcePiece['title']; performance: { mode: string } };
  rhythm: {
    talas: TalaTable;
    tala: string;
    laya: number;
    charans: Charan3[];
    form: string[];
    performance?: PerformanceStep[];
    prelude?: Prelude;
    countIn: { count: number; words: string[]; matras: number; on: string; note: string };
  };
  parts: Record<string, Part3>;
  layout: {
    lead: string;
    header: Record<string, string>;
    pickupPlacement: string;
    parts: Record<string, { lines: LayoutLine[] }>;
    band?: { lines: LayoutLine[] };
  };
  provenance: Record<string, Record<string, unknown>>;
  media?: unknown;
  tuning?: unknown;
}

/* --------------------------------------------------------------- timeline */

export interface Beat {
  t: number;
  dur: number;
  key: string;
  beat?: number | null;
  sam?: boolean;
  ganStart?: boolean;
  gatStart?: boolean;
  charan: number;
  pass: number;
  tala: string;
  cue?: string;
  lyric?: string;
  step?: 'L' | 'R';
  yati?: number;
  span?: number;
}

export interface Sound extends Omit<Slot, 'type'> {
  t: number;
  dur: number;
  type: SlotType;
  tala: string;
  matraDur: number;
  key: string;
  rollPerMatra?: number;
  beat?: number;
  held?: number;
}

export interface Timeline { beats: Beat[]; sounds: Sound[]; total: number; origin: number }
export type PlayOrder = 'printed' | 'performance' | 'once';
export interface TimelineOptions { tempo?: number; order?: PlayOrder }
