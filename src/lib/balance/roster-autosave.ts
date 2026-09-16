import type { BalanceRoster } from "./roster-schema";

export type RosterVersion = { roster: BalanceRoster; revision: number };
export type RosterSaveResult =
  | ({ ok: true } & RosterVersion)
  | {
      ok: false;
      error: string;
      conflict?: RosterVersion & { editable: boolean };
    };
export type RosterFlushResult = { ok: true; revision: number } | { ok: false };
type SaveError = {
  message: string;
  remote?: RosterVersion & { editable: boolean };
};
type Snapshot = RosterVersion & {
  dirty: boolean;
  saving: boolean;
  error: SaveError | null;
  remoteLoads: number;
};

const equal = (a: BalanceRoster, b: BalanceRoster) =>
  JSON.stringify(a) === JSON.stringify(b);

/** Serializes writes while keeping newer local edits and revisioned realtime snapshots separate. */
export class RosterAutosave {
  private saved: BalanceRoster;
  private snapshot: Snapshot;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setTimeout> | undefined;
  private running: Promise<RosterFlushResult> | null = null;
  private remoteDuringSave: RosterVersion | null = null;

  constructor(
    initial: RosterVersion,
    private save: (value: RosterVersion) => Promise<RosterSaveResult>,
    private delay = 400,
  ) {
    this.saved = initial.roster;
    this.snapshot = {
      ...initial,
      dirty: false,
      saving: false,
      error: null,
      remoteLoads: 0,
    };
  }

  getSnapshot = () => this.snapshot;
  subscribe = (listener: () => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
  private publish(patch: Partial<Snapshot>) {
    this.snapshot = { ...this.snapshot, ...patch };
    for (const listener of this.listeners) listener();
  }
  cancelTimer = () => {
    clearTimeout(this.timer);
    this.timer = undefined;
  };
  edit(roster: BalanceRoster) {
    const error = this.snapshot.error?.remote ? this.snapshot.error : null;
    this.publish({ roster, dirty: !equal(roster, this.saved), error });
    this.cancelTimer();
    if (!error && this.snapshot.dirty)
      this.timer = setTimeout(() => {
        void this.flush();
      }, this.delay);
  }

  receiveRemote(remote: RosterVersion) {
    if (remote.revision <= this.snapshot.revision) return;
    if (
      this.snapshot.error?.remote &&
      remote.revision <= this.snapshot.error.remote.revision
    )
      return;
    if (this.running) {
      if (
        !this.remoteDuringSave ||
        remote.revision > this.remoteDuringSave.revision
      )
        this.remoteDuringSave = remote;
      return;
    }
    // Preferences and settings share the round revision but do not edit its roster.
    if (equal(remote.roster, this.saved) && !this.snapshot.error?.remote) {
      this.publish({ revision: remote.revision });
      return;
    }
    if (this.snapshot.dirty) {
      this.cancelTimer();
      this.publish({
        error: {
          message:
            "다른 화면에서 명단이 변경되었습니다. 내 변경은 보관되어 있습니다.",
          remote: { ...remote, editable: true },
        },
      });
    } else this.acceptRemote(remote);
  }

  private acceptRemote(remote: RosterVersion) {
    this.saved = remote.roster;
    this.publish({
      ...remote,
      dirty: false,
      error: null,
      remoteLoads: this.snapshot.remoteLoads + 1,
    });
  }

  loadRemote() {
    const remote = this.snapshot.error?.remote;
    if (remote && !this.running) this.acceptRemote(remote);
  }

  retry = async (): Promise<RosterFlushResult> => {
    const remote = this.snapshot.error?.remote;
    if (remote) {
      if (!remote.editable) return { ok: false };
      this.saved = remote.roster;
      this.publish({
        revision: remote.revision,
        dirty: !equal(this.snapshot.roster, remote.roster),
      });
    }
    this.publish({ error: null });
    return this.flush();
  };

  flush = async (): Promise<RosterFlushResult> => {
    this.cancelTimer();
    if (this.running) return this.running;
    if (this.snapshot.error) return { ok: false };
    // Defer the loop so the promise is registered even when a no-op resolves synchronously.
    this.running = Promise.resolve().then(() => this.drain());
    try {
      return await this.running;
    } finally {
      this.running = null;
      if (this.remoteDuringSave) {
        const remote = this.remoteDuringSave;
        this.remoteDuringSave = null;
        this.receiveRemote(remote);
      }
    }
  };

  private async drain(): Promise<RosterFlushResult> {
    while (this.snapshot.dirty) {
      if (this.snapshot.error) return { ok: false };
      const sent = {
        roster: this.snapshot.roster,
        revision: this.snapshot.revision,
      };
      this.publish({ saving: true });
      let result: RosterSaveResult;
      try {
        result = await this.save(sent);
      } catch {
        result = {
          ok: false,
          error: "명단을 저장하지 못했습니다. 변경은 보관되어 있습니다.",
        };
      }
      if (!result.ok) {
        if (
          result.conflict?.editable &&
          result.conflict.revision > sent.revision &&
          equal(result.conflict.roster, this.saved)
        ) {
          this.publish({ revision: result.conflict.revision, saving: false });
          continue;
        }
        this.publish({
          saving: false,
          error: { message: result.error, remote: result.conflict },
        });
        return { ok: false };
      }
      this.saved = result.roster;
      this.publish({
        revision: result.revision,
        saving: false,
        dirty: !equal(this.snapshot.roster, result.roster),
      });
      const remote = this.remoteDuringSave;
      this.remoteDuringSave = null;
      if (remote && remote.revision > result.revision) {
        if (equal(remote.roster, this.saved)) {
          this.publish({ revision: remote.revision });
          continue;
        }
        if (this.snapshot.dirty) {
          this.publish({
            error: {
              message:
                "다른 화면에서 명단이 변경되었습니다. 내 변경은 보관되어 있습니다.",
              remote: { ...remote, editable: true },
            },
          });
          return { ok: false };
        }
        this.acceptRemote(remote);
      }
    }
    return { ok: true, revision: this.snapshot.revision };
  }
}
