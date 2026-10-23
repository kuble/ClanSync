import type { HousingResult, HousingState, SaveHousingRoomInput } from "./types";

type Layout = Omit<SaveHousingRoomInput, "revision">;
type Snapshot = { input: SaveHousingRoomInput; dirty: boolean; saving: boolean; error: string | null };

function normalize(input: SaveHousingRoomInput): SaveHousingRoomInput {
  return { ...input, placements: input.placements.map(p => ({ ...p, surface: p.surface ?? "floor" })).sort((a, b) => a.inventoryId.localeCompare(b.inventoryId)) };
}
const equal = (a: Layout, b: Layout) => a.wallpaper === b.wallpaper && a.floor === b.floor && JSON.stringify(a.placements) === JSON.stringify(b.placements);

export function housingInput(state: HousingState): SaveHousingRoomInput {
  return normalize({ revision: state.room.revision, wallpaper: state.room.wallpaper, floor: state.room.floor,
    placements: state.inventory.flatMap(item => item.x !== null && item.y !== null ? [{ inventoryId: item.id, x: item.x, y: item.y, rotation: item.rotation, surface: item.surface ?? "floor" }] : []) });
}

/** Acknowledgements advance the revision without replacing edits made during a save. */
export class HousingAutosave {
  private saved: SaveHousingRoomInput;
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<boolean> | null = null;

  constructor(initial: SaveHousingRoomInput, private save: (input: SaveHousingRoomInput) => Promise<HousingResult>, private delay = 450) {
    this.saved = normalize(initial);
    this.snapshot = { input: this.saved, dirty: false, saving: false, error: null };
  }
  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener); }; };
  private publish(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  edit(layout: Layout) {
    const input = normalize({ ...layout, revision: this.snapshot.input.revision });
    this.publish({ input, dirty: !equal(input, this.saved) });
    clearTimeout(this.timer);
    if (this.snapshot.dirty && !this.snapshot.error) this.timer = setTimeout(() => { void this.flush(); }, this.delay);
  }
  reset(input: SaveHousingRoomInput) {
    if (this.running) return;
    clearTimeout(this.timer);
    this.saved = normalize(input);
    this.publish({ input: this.saved, dirty: false, saving: false, error: null });
  }
  retry = () => { this.publish({ error: null }); return this.flush(); };
  flush = async (): Promise<boolean> => {
    clearTimeout(this.timer);
    if (this.running) return this.running;
    if (this.snapshot.error) return false;
    this.running = Promise.resolve().then(() => this.drain());
    try { return await this.running; } finally { this.running = null; }
  };
  private async drain(): Promise<boolean> {
    while (this.snapshot.dirty) {
      clearTimeout(this.timer);
      const sent = this.snapshot.input;
      this.publish({ saving: true });
      let result: HousingResult;
      try { result = await this.save(sent); }
      catch { result = { ok: false, error: "자동 저장하지 못했습니다. 변경 내용은 유지됩니다. 다시 시도해 주세요." }; }
      if (!result.ok) { this.publish({ saving: false, error: result.error }); return false; }
      this.saved = housingInput(result.state);
      const input = equal(this.snapshot.input, sent) ? this.saved : { ...this.snapshot.input, revision: this.saved.revision };
      this.publish({ input, saving: false, dirty: !equal(input, this.saved) });
    }
    return true;
  }
}
