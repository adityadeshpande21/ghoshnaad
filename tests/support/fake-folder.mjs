// An in-memory folder with the shape of the File System Access API (directory and file handles), for testing code that reads and writes the
// person's rachana folder. `clock.t` is the "last modified" time given to every write; tests move it to simulate time passing, and `touch` simulates
// the person changing a file outside the app.
export const clock = { t: 1_700_000_000_000 };

export class FakeFileHandle {
  constructor(name, text = '', modified = clock.t) { this.kind = 'file'; this.name = name; this.text = text; this.modified = modified; this.unreadable = false; }
  async getFile() { if (this.unreadable) throw new Error('gone'); const h = this; return { lastModified: h.modified, text: async () => h.text }; }
  async createWritable() { const h = this; let buf = ''; return { write: async d => { buf += d; }, close: async () => { h.text = buf; h.modified = ++clock.t; } }; }
}
export class FakeDir {
  constructor(name = 'rachana', refuseRemove = false) { this.kind = 'directory'; this.name = name; this.entries = new Map(); this.refuseRemove = refuseRemove; }
  async *values() { for (const e of this.entries.values()) yield e; }
  async getFileHandle(name, o = {}) { let e = this.entries.get(name); if (!e) { if (!o.create) throw new Error('not found'); e = new FakeFileHandle(name, '', clock.t); this.entries.set(name, e); } return e; }
  async removeEntry(name) { if (this.refuseRemove || !this.entries.has(name)) throw new Error('refused'); this.entries.delete(name); }
  /** put a file in (a path with / makes the directories) */
  put(path, content, modified = clock.t) {
    const parts = path.split('/'), file = parts.pop();
    let d = this; for (const p of parts) { let n = d.entries.get(p); if (!n) { n = new FakeDir(p); d.entries.set(p, n); } d = n; }
    const h = new FakeFileHandle(file, typeof content === 'string' ? content : JSON.stringify(content), modified); d.entries.set(file, h); return h;
  }
  /** what the person does outside the app */
  touch(path, text) { const h = this.entries.get(path); h.text = text; h.modified = clock.t += 10_000; }
}
