// src/app/services/desk-state.service.ts
import { computed, inject, Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import {
  blankFilters,
  DEFAULT_MARKET_RULES,
  Enquiry,
  Market,
  MarketRule,
  MsgTpl,
  SendLog,
  uuid,
} from '../models/desk.models';

export type SyncState = 'saved' | 'saving' | 'offline';

interface Stored {
  enquiries: Enquiry[];
  currentId: string;
  dirty: string[]; // saved locally, not yet confirmed by the server
  deleted: string[]; // deleted locally, server delete pending
}

/**
 * Local-first store.
 *  - Every change is written to localStorage immediately (instant, works offline).
 *  - The same change is pushed to Express/Mongo ~0.6 s later (debounced per enquiry).
 *  - Anything the server hasn't confirmed stays in a queue and is retried on
 *    reconnect and every 15 s, so nothing is lost.
 *
 * ASSUMPTION: `environment.apiUrl` is your API root (e.g. https://host/api) and
 * your existing auth interceptor adds the token. Change `base` if yours differs.
 */
@Injectable({ providedIn: 'root' })
export class DeskStateService {
  private http = inject(HttpClient);
  private readonly base = `${environment.API_URL}/api/desk`;

  private readonly KEY = 'rkj-desk-v2';
  private readonly LEGACY_KEY = 'rkj-desk-v1';
  private readonly LEGACY_LOG_KEY = 'rkj-desk-log-v1';
  private readonly LOG_KEY = 'rkj-desk-pending-logs-v1';
  private readonly RULES_KEY = 'rkj-desk-rules-v1';

  readonly enquiries = signal<Enquiry[]>([]);
  readonly currentId = signal<string>('');
  readonly syncState = signal<SyncState>('saved');
  /** Loaded from GET /market-rules; defaults until then (or when offline). */
  readonly marketRules =
    signal<Record<Market, MarketRule>>(DEFAULT_MARKET_RULES);

  /** Never undefined: the list always holds at least one enquiry. */
  readonly current = computed<Enquiry>(
    () =>
      this.enquiries().find((e) => e.id === this.currentId()) ??
      this.enquiries()[0],
  );

  private dirty = new Set<string>();
  private deleted = new Set<string>();
  private pendingLogs: SendLog[] = [];
  private rev = new Map<string, number>(); // bumps on every local change, to detect edits made mid-request
  private timers = new Map<string, ReturnType<typeof setTimeout>>();
  private retryTimer?: ReturnType<typeof setTimeout>;
  private flushing = false;

  constructor() {
    this.restore();
    this.pendingLogs =
      this.read<SendLog[]>(this.LOG_KEY) ?? this.migrateLegacyLogs();
    const rules = this.read<Record<Market, MarketRule>>(this.RULES_KEY);
    if (rules) this.marketRules.set(rules);

    window.addEventListener('online', () => this.flushAll());
    void this.loadRemote();
  }

  // =====================================================================
  // Public API (used by the component)
  // =====================================================================
  add() {
    const e = this.blank();
    this.enquiries.update((l) => [e, ...l]);
    this.currentId.set(e.id);
    this.markDirty(e.id, true);
  }

  select(id: string) {
    this.currentId.set(id);
    this.persist();
  }

  patchCurrent(patch: Partial<Enquiry>) {
    const id = this.currentId();
    this.enquiries.update((l) =>
      l.map((e) => (e.id === id ? { ...e, ...patch } : e)),
    );
    this.markDirty(id);
  }

  remove(id: string) {
    clearTimeout(this.timers.get(id));
    this.timers.delete(id);
    this.dirty.delete(id);
    this.deleted.add(id);
    this.enquiries.update((l) => l.filter((e) => e.id !== id));

    if (!this.enquiries().length) {
      const e = this.blank();
      this.enquiries.set([e]);
      this.markDirty(e.id, true);
    }
    if (this.currentId() === id) this.currentId.set(this.enquiries()[0].id);
    this.persist();
    void this.flushAll();
  }

  /** The server fills in the executive from the login token. */
  logSend(entry: { enquiryId: string; template: MsgTpl; codes: string[] }) {
    this.pendingLogs.push({ ...entry, id: uuid(), at: Date.now() });
    this.persist();
    void this.flushAll();
  }

  /** Admin only (server enforces). Not wired to a screen yet. */
  async saveMarketRules(rules: Record<Market, MarketRule>) {
    const res = await firstValueFrom(
      this.http.put<{ rules: Record<Market, MarketRule> }>(
        `${this.base}/market-rules`,
        { rules },
      ),
    );
    this.setRules(res.rules);
  }

  // =====================================================================
  // Local persistence (synchronous = instant)
  // =====================================================================
  private persist() {
    this.write<Stored>(this.KEY, {
      enquiries: this.enquiries(),
      currentId: this.currentId(),
      dirty: [...this.dirty],
      deleted: [...this.deleted],
    });
    this.write(this.LOG_KEY, this.pendingLogs);
  }

  private restore() {
    const saved = this.read<Stored>(this.KEY);
    if (saved?.enquiries?.length) {
      this.enquiries.set(saved.enquiries);
      this.dirty = new Set(saved.dirty ?? []);
      this.deleted = new Set(saved.deleted ?? []);
      this.currentId.set(
        saved.enquiries.some((e) => e.id === saved.currentId)
          ? saved.currentId
          : saved.enquiries[0].id,
      );
      return;
    }

    // First run after upgrade: pull in the old localStorage-only data and push it to the DB.
    const legacy = this.read<{ enquiries: any[]; currentId: string }>(
      this.LEGACY_KEY,
    );
    const list: Enquiry[] = (legacy?.enquiries ?? []).map((e) =>
      this.normalize(e),
    );
    if (list.length) {
      this.enquiries.set(list);
      list.forEach((e) => this.dirty.add(e.id));
      this.currentId.set(
        list.some((e) => e.id === legacy?.currentId)
          ? legacy!.currentId
          : list[0].id,
      );
    } else {
      const e = this.blank();
      this.enquiries.set([e]);
      this.currentId.set(e.id);
      this.dirty.add(e.id);
    }
    this.persist();
  }

  private migrateLegacyLogs(): SendLog[] {
    const old = this.read<any[]>(this.LEGACY_LOG_KEY) ?? [];
    return old
      .filter((l) => l?.enquiryId && l?.template)
      .map((l) => ({
        id: l.id ?? uuid(),
        enquiryId: l.enquiryId,
        template: l.template,
        codes: l.codes ?? [],
        at: l.at ?? Date.now(),
      }));
  }

  // =====================================================================
  // Server sync
  // =====================================================================
  private markDirty(id: string, immediate = false) {
    this.dirty.add(id);
    this.rev.set(id, (this.rev.get(id) ?? 0) + 1);
    this.persist(); // local copy first — this is the "instant save"
    this.syncState.set('saving');

    clearTimeout(this.timers.get(id));
    this.timers.set(
      id,
      setTimeout(() => void this.flushOne(id), immediate ? 0 : 600),
    );
  }

  private async flushOne(id: string) {
    this.timers.delete(id);
    const e = this.enquiries().find((x) => x.id === id);
    if (!e || !this.dirty.has(id)) return;
    const r = this.rev.get(id);
    try {
      await firstValueFrom(this.http.put(`${this.base}/enquiries/${id}`, e));
      if (this.rev.get(id) === r) this.dirty.delete(id); // not edited again while saving
      this.persist();
      this.refreshState();
    } catch {
      this.goOffline();
    }
  }

  /** Pushes everything pending: dirty enquiries (one bulk call), deletes, then send logs. */
  async flushAll() {
    if (this.flushing) return;
    this.flushing = true;
    try {
      const batch = this.enquiries().filter((e) => this.dirty.has(e.id));
      if (batch.length) {
        const revs = new Map(batch.map((e) => [e.id, this.rev.get(e.id)]));
        await firstValueFrom(
          this.http.post(`${this.base}/enquiries/sync`, { enquiries: batch }),
        );
        for (const e of batch)
          if (this.rev.get(e.id) === revs.get(e.id)) this.dirty.delete(e.id);
      }
      for (const id of [...this.deleted]) {
        await firstValueFrom(this.http.delete(`${this.base}/enquiries/${id}`));
        this.deleted.delete(id);
      }
      for (const log of [...this.pendingLogs]) {
        await firstValueFrom(this.http.post(`${this.base}/send-logs`, log));
        this.pendingLogs = this.pendingLogs.filter((l) => l.id !== log.id);
      }
      this.persist();
      this.refreshState();
    } catch {
      this.goOffline();
    } finally {
      this.flushing = false;
    }
  }

  private async loadRemote() {
    try {
      const remote = await firstValueFrom(
        this.http.get<Enquiry[]>(`${this.base}/enquiries`),
      );
      this.mergeRemote(remote);
      try {
        const r = await firstValueFrom(
          this.http.get<{ rules: Record<Market, MarketRule> }>(
            `${this.base}/market-rules`,
          ),
        );
        this.setRules(r.rules);
      } catch {
        /* keep cached / default rules */
      }
      await this.flushAll();
    } catch {
      this.goOffline();
    }
  }

  /** Server wins, except for enquiries with local edits the server hasn't seen yet. */
  private mergeRemote(remote: Enquiry[]) {
    const local = this.enquiries();
    const localMap = new Map(local.map((e) => [e.id, e]));
    const out = new Map<string, Enquiry>();

    for (const r of remote) {
      if (this.deleted.has(r.id)) continue;
      out.set(
        r.id,
        this.dirty.has(r.id) && localMap.has(r.id)
          ? localMap.get(r.id)!
          : this.normalize(r),
      );
    }
    for (const l of local)
      if (this.dirty.has(l.id) && !out.has(l.id)) out.set(l.id, l);

    let list = [...out.values()].sort((a, b) => b.createdAt - a.createdAt);
    if (!list.length) {
      const e = this.blank();
      list = [e];
      this.dirty.add(e.id);
    }
    this.enquiries.set(list);
    if (!list.some((e) => e.id === this.currentId()))
      this.currentId.set(list[0].id);
    this.persist();
  }

  private refreshState() {
    const pending =
      this.dirty.size || this.deleted.size || this.pendingLogs.length;
    this.syncState.set(pending ? 'saving' : 'saved');
  }

  private goOffline() {
    this.syncState.set('offline');
    if (this.retryTimer) return;
    this.retryTimer = setTimeout(() => {
      this.retryTimer = undefined;
      void this.flushAll();
    }, 15_000);
  }

  private setRules(rules: Record<Market, MarketRule>) {
    this.marketRules.set(rules);
    this.write(this.RULES_KEY, rules);
  }

  // =====================================================================
  // Helpers
  // =====================================================================
  private normalize(e: any): Enquiry {
    return {
      id: e.id,
      name: e.name ?? '',
      phone: e.phone ?? '',
      channel: e.channel ?? 'WhatsApp',
      market: e.market ?? 'India',
      need: e.need ?? '',
      occasion: e.occasion ?? e.occ ?? '',
      stage: e.stage ?? 0,
      sentAt: e.sentAt ?? null,
      picked: e.picked ?? [],
      q: e.q ?? '',
      f: { ...blankFilters(), ...(e.f ?? {}) },
      createdAt: e.createdAt ?? Date.now(),
    };
  }

  private blank(): Enquiry {
    return this.normalize({ id: uuid(), createdAt: Date.now() });
  }

  private read<T>(key: string): T | null {
    try {
      return JSON.parse(localStorage.getItem(key) || 'null');
    } catch {
      return null;
    }
  }

  private write<T>(key: string, value: T) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch {
      /* storage unavailable – ignore */
    }
  }
}
