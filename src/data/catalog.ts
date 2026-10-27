// The 120 book rachanas, as the build embeds them: one gzip-and-base64 pack holding the library list, the composer data,
// and for each rachana its compiled file and its book source. Unpacked once, on first use.
//
// (Earlier builds could also fetch the files one by one, or read them from side files next to a page opened from disk.
// The v2 build always embeds the pack, so those paths are gone.)

export interface IndexRow { id: string; dev: string; rom: string; alt: string[]; sec: string; raga: string; talas: string[]; laya: number; parts: string[]; sec_s: number; standing: string }
type Gunzip = (data: Uint8Array) => Uint8Array;

export class Catalog {
  private packBase64: string;
  private gunzip: Gunzip;
  private pack: Record<string, unknown> | null = null;

  constructor(packBase64: string, gunzip: Gunzip) { this.packBase64 = packBase64; this.gunzip = gunzip; }

  private unpack(): Record<string, unknown> {
    if (!this.pack) {
      const s = atob(this.packBase64), bin = new Uint8Array(s.length);
      for (let i = 0; i < s.length; i++) bin[i] = s.charCodeAt(i);
      this.pack = JSON.parse(new TextDecoder().decode(this.gunzip(bin)));
    }
    return this.pack!;
  }

  /** One file of the pack, e.g. 'data/index.json', 'data/r/ajey.json', 'data/src/ajey.json'. Rejects with "missing <path>". */
  async load<T = any>(path: string): Promise<T> {
    const p = this.unpack();
    if (p[path] === undefined) throw new Error('missing ' + path);
    return p[path] as T;
  }
  index(): Promise<IndexRow[]> { return this.load<IndexRow[]>('data/index.json'); }
  rachana(id: string) { return this.load('data/r/' + id + '.json'); }
  source(id: string) { return this.load('data/src/' + id + '.json'); }
}
