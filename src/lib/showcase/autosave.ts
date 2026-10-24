import type { ShowcaseDocument } from "./domain";

type SaveResult = { ok: true; revision: number } | { ok: false; error: string };
type Snapshot = { document: ShowcaseDocument; revision: number; dirty: boolean; saving: boolean; error: string | null };
const equal = (a: ShowcaseDocument, b: ShowcaseDocument) => JSON.stringify(a) === JSON.stringify(b);

/** Commit on release. Serialize requests and keep newer placements when an older save returns. */
export class ShowcaseAutosave {
  private saved: ShowcaseDocument;
  private snapshot: Snapshot;
  private save: (document: ShowcaseDocument, revision: number) => Promise<SaveResult>;
  private listeners = new Set<() => void>();
  private running: Promise<boolean> | null = null;

  constructor(document: ShowcaseDocument, revision: number, save: (document: ShowcaseDocument, revision: number) => Promise<SaveResult>) {
    this.saved = document;
    this.snapshot = { document, revision, dirty: false, saving: false, error: null };
    this.save = save;
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  edit(document: ShowcaseDocument) {
    if (equal(document, this.snapshot.document)) return;
    this.publish({ document, dirty: !equal(document, this.saved) });
    void this.flush();
  }
  retry = () => { this.publish({ error: null }); return this.flush(); };
  flush = async (): Promise<boolean> => {
    if (this.running) return this.running;
    if (this.snapshot.error) return false;
    this.running = Promise.resolve().then(() => this.drain());
    try { return await this.running; } finally { this.running = null; }
  };
  private async drain() {
    while (this.snapshot.dirty) {
      const sent = this.snapshot.document;
      this.publish({ saving: true });
      let result: SaveResult;
      try { result = await this.save(sent, this.snapshot.revision); }
      catch { result = { ok: false, error: "자동 저장하지 못했습니다. 변경 내용은 유지됩니다. 다시 시도해 주세요." }; }
      if (!result.ok) { this.publish({ saving: false, error: result.error }); return false; }
      this.saved = sent;
      this.publish({ revision: result.revision, dirty: !equal(this.snapshot.document, sent) });
    }
    this.publish({ saving: false });
    return true;
  }
}
