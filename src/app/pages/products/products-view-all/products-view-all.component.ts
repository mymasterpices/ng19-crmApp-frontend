import {
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  OnInit,
  signal,
  untracked,
} from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

// PrimeNG v19
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { SelectModule } from 'primeng/select';
import { TagModule } from 'primeng/tag';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { Drawer } from 'primeng/drawer';
import { Tooltip } from 'primeng/tooltip';
import { SliderModule } from 'primeng/slider';

import { Subscription } from 'rxjs';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { DeskStateService } from '../../../services/desk-state.service';
import { environment } from '../../../../environments/environment';
import {
  AVAIL_OPTIONS,
  CHANNELS,
  DeskFilters,
  DIA_WT_OPTIONS,
  Enquiry,
  enquiryStatus,
  GOLD_WT_OPTIONS,
  blankFilters,
  ItemStatus,
  MAKE_TYPES,
  MakeType,
  MARKETS,
  Market,
  MESSAGE_COPY,
  MsgTpl,
  OCCASIONS,
  Opt,
  SORT_OPTIONS,
  STAGE_AFTER_SEND,
  STAGES,
  TagSeverity,
  TEMPLATES,
} from '../../../models/desk.models';

type ViewMode = 'grid' | 'list';
type SortKey = (typeof SORT_OPTIONS)[number]['value'];

interface Facets {
  categories: string[];
  sub_categories: string[];
  metals: string[];
  purities: string[];
  genders: string[];
  collections: string[];
  stone_types: string[];
}

/** Product + values worked out once, so filtering 5000 items stays cheap. */
interface CatalogRow {
  p: any;
  make: MakeType;
  price: number; // India price (₹)
  net: number; // net gold wt (g)
  dia: number; // diamond wt (ct), polki excluded
  cNo: number; // C. No.
  status: ItemStatus;
  added: number;
}

const VIEW_MODE_KEY = 'products-view-mode';
const MAX_PICKS = 6;
/** Facet filters that are sent to the API (product field names). */
const LEGACY_KEYS = ['collection', 'stone_type'] as const;

const norm = (s: unknown) => (s ?? '').toString().trim().toLowerCase();
const range = (s: string) => (s ? s.split('-').map(Number) : null);
const tc = (s: string) =>
  (s || '').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
const opts = (a: string[]): Opt[] => a.map((v) => ({ label: v, value: v }));

@Component({
  selector: 'app-products-view-all',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    TextareaModule,
    SelectModule,
    TagModule,
    DialogModule,
    FileUploadModule,
    MessageModule,
    PaginatorModule,
    DecimalPipe,
    Drawer,
    Tooltip,
    SliderModule,
    ConfirmDialogModule, // <p-confirmdialog /> in the template
  ],
  // ConfirmationService must be provided here (same level as <p-confirmdialog />)
  providers: [ConfirmationService],
  templateUrl: './products-view-all.component.html',
  styleUrl: './products-view-all.component.css',
})
export class ProductsViewAllComponent implements OnInit, OnDestroy {
  private _apiService = inject(ApiService);
  private _authService = inject(AuthService);
  private _messageService = inject(MessageService);
  private _confirm = inject(ConfirmationService);
  readonly desk = inject(DeskStateService);

  // ---------- Static lists for the template ----------
  readonly MARKETS = MARKETS;
  readonly CHANNELS = CHANNELS;
  readonly OCCASIONS = OCCASIONS;
  readonly STAGES = STAGES;
  readonly TEMPLATES = TEMPLATES;
  readonly SORT_OPTIONS = SORT_OPTIONS;
  readonly MAX_PICKS = MAX_PICKS;
  readonly channelOpts = opts(CHANNELS);
  readonly marketOpts = opts(MARKETS);
  readonly occasionOpts = opts(OCCASIONS);

  // Static header-filter option lists
  readonly goldWtOpts = GOLD_WT_OPTIONS;
  readonly diaWtOpts = DIA_WT_OPTIONS;
  readonly makeOpts = opts(MAKE_TYPES);
  readonly availOpts = AVAIL_OPTIONS;

  // ---------- Search-by-tag state (existing) ----------
  searchResult = signal<any[]>([]);
  isUploading = signal<string>('Upload');
  imageFailed = signal<Set<string>>(new Set());

  loggedUser = this._authService.getUserRole();
  visible = false; // CSV drawer
  selectedFile: File | null = null;
  lastScanned: string | null = null;
  sharingCode = signal<string | null>(null);

  /** User role */
  userRole = this._authService.getUserRole();

  /** True while the "Save customer" request is running. */
  customerSaving = signal(false);

  searchFrom = new FormGroup({
    jewel_code: new FormControl('', [Validators.required]),
  });
  csvForm = new FormGroup({
    csv_file: new FormControl<File | null>(null, Validators.required),
  });

  // ---------- View mode (grid / list) ----------
  viewMode = signal<ViewMode>(this.readSavedView());
  sort = signal<SortKey>('best');

  /** C. No. range filter (kept here because DeskFilters has no C. No. key). */
  cNoMin = signal<number | null>(null);
  cNoMax = signal<number | null>(null);

  /** Price range filter; null = no price filter. */
  priceRange = signal<[number, number] | null>(null);

  /** Grid = photo cards (12 per page); List = compact table (50 per page). */
  get limit(): number {
    return this.viewMode() === 'list' ? 50 : 12;
  }

  // ---------- Clock (drives the 24-hr reply timer) ----------
  now = signal(Date.now());
  private tick?: ReturnType<typeof setInterval>;

  // ---------- Current enquiry (filters are remembered per enquiry) ----------
  readonly enquiries = this.desk.enquiries;
  readonly cur = this.desk.current;
  readonly f = computed(() => this.cur().f);
  readonly rules = this.desk.marketRules;
  readonly syncState = this.desk.syncState;

  // ---------- Products ----------
  // Price is calculated in the browser (getGrandTotal), so sorting, the price
  // filter and pagination all run client-side on the full result set.
  private readonly FETCH_ALL = 8000;

  allProducts = signal<any[]>([]);
  page = signal(1);
  loading = signal(false);

  facets = signal<Facets>({
    categories: [],
    sub_categories: [],
    metals: [],
    purities: [],
    genders: [],
    collections: [],
    stone_types: [],
  });

  /** Sold pieces are always hidden (spec §3). */
  readonly rows = computed<CatalogRow[]>(() =>
    this.allProducts()
      .filter((p) => this.statusOf(p) !== 'Sold')
      .map((p) => ({
        p,
        make: this.makeOf(p),
        price: this.indiaPrice(p),
        net: +p.net_wt || 0,
        dia: this.diamondWt(p),
        cNo: +p.c_no || 0,
        status: this.statusOf(p),
        added: Date.parse(p.added_on ?? p.createdAt ?? '') || 0,
      })),
  );

  /** Which optional columns exist in the data → hide filters that can't work yet. */
  readonly has = computed(() => {
    const r = this.rows();
    return {
      brand: r.some((x) => x.p.brand),
      occasion: r.some((x) => x.p.occasion_tags?.length),
      // only offer the availability filter when stock really is split into groups
      status: r.some((x) => x.status !== 'In store'),
    };
  });

  /** Slider limits taken from the loaded products (rounded to ₹1,000). */
  readonly priceBounds = computed(() => {
    const prices = this.rows().map((r) => r.price);
    if (!prices.length) return { min: 0, max: 0 };
    const lo = prices.reduce((a, b) => Math.min(a, b), Infinity);
    const hi = prices.reduce((a, b) => Math.max(a, b), 0);
    return {
      min: Math.floor(lo / 1000) * 1000,
      max: Math.ceil(hi / 1000) * 1000,
    };
  });

  /** What the slider shows: the chosen range, or the full span. */
  readonly priceValue = computed<[number, number]>(
    () => this.priceRange() ?? [this.priceBounds().min, this.priceBounds().max],
  );

  onPriceRange(v: number[]) {
    const { min, max } = this.priceBounds();
    // Handles at both ends = no filter
    this.priceRange.set(v[0] <= min && v[1] >= max ? null : [v[0], v[1]]);
  }

  readonly results = computed(() => {
    const f = this.f();
    const g = range(f.goldWt),
      d = range(f.diaWt);
    const cMin = this.cNoMin(),
      cMax = this.cNoMax();
    const pr = this.priceRange();

    const r = this.rows().filter((x) => {
      if (f.avail !== 'all' && x.status !== 'In store') return false;
      if (f.make && x.make !== f.make) return false;
      if (pr && (x.price < pr[0] || x.price > pr[1])) return false;
      if (g && (x.net < g[0] || x.net > g[1])) return false;
      if (d && (x.dia < d[0] || x.dia > d[1])) return false;
      if (cMin != null && x.cNo < cMin) return false;
      if (cMax != null && x.cNo > cMax) return false;
      return true;
    });

    switch (this.sort()) {
      case 'price_asc':
        return r.sort((a, c) => a.price - c.price);
      case 'price_desc':
        return r.sort((a, c) => c.price - a.price);
      case 'new':
        return r.sort((a, c) => c.added - a.added);
      case 'wt':
        return r.sort((a, c) => a.net - c.net);
      default: // best match: model shots first, then newest
        return r.sort(
          (a, c) =>
            +!!c.p.model_shot_url - +!!a.p.model_shot_url || c.added - a.added,
        );
    }
  });

  readonly total = computed(() => this.results().length);

  readonly visibleProducts = computed(() => {
    const start = (this.page() - 1) * this.limit;
    return this.results()
      .slice(start, start + this.limit)
      .map((r) => r.p);
  });

  readonly countText = computed(() => {
    const n = this.total();
    return `${n} piece${n === 1 ? '' : 's'} match${n === 1 ? 'es' : ''}`;
  });

  /** How many header filters are currently active (drives the "Clear filters" buttons). */
  readonly activeFilterCount = computed(() => {
    const f = this.f();
    let n = 0;
    if (f.category) n++;
    if (f.sub) n++;
    if (f.goldWt) n++;
    if (f.diaWt) n++;
    if (f.make) n++;
    if (f.stone_type) n++;
    if (f.collection) n++;
    if (this.priceRange()) n++;
    if (this.cNoMin() != null || this.cNoMax() != null) n++;
    return n;
  });

  /** Sub-categories of the chosen category, taken from the last fetch that wasn't narrowed by a sub-category. */
  private readonly subOptions = signal<string[]>([]);
  /** With a category chosen: its sub-categories. Otherwise: every sub-category. */
  readonly subCategories = computed(() =>
    this.f().category ? this.subOptions() : this.facets().sub_categories,
  );

  // ---------- Header-filter option lists (depend on loaded facets) ----------
  readonly categoryOpts = computed(() => opts(this.facets().categories));
  readonly subOpts = computed(() => opts(this.subCategories()));
  readonly stoneTypeOpts = computed(() => opts(this.facets().stone_types));
  readonly collectionOpts = computed(() => opts(this.facets().collections));

  /**
   * Filters sent to the API, e.g.
   *   /api/products?page=1&limit=8000&category=DIAMOND%20BRACELET
   * Everything else (make, price, weights, C. No.) is applied in the
   * browser on the fetched set.
   */
  private readonly serverParams = computed<Record<string, string | number>>(
    () => {
      const f = this.f();
      const params: Record<string, string | number> = {
        page: 1,
        limit: this.FETCH_ALL,
      };
      if (f.category) params['category'] = f.category;
      if (f.sub) params['sub_category'] = f.sub;
      for (const k of LEGACY_KEYS) if (f[k]) params[k] = f[k];
      return params;
    },
  );
  /** Changes only when a server-side filter really changes. */
  private readonly serverKey = computed(() =>
    JSON.stringify(this.serverParams()),
  );
  private productsSub?: Subscription;

  // ---------- Shortlist + message ----------
  tpl = signal<MsgTpl>('options');
  /** Edited text; null = use the generated template text. */
  draft = signal<string | null>(null);

  /** Look-up for picked codes (catalogue + tag-search results). */
  private readonly index = computed(() => {
    const m = new Map<string, any>();
    for (const p of [...this.allProducts(), ...this.searchResult()])
      m.set(p.jewel_code, p);
    return m;
  });

  readonly picked = computed(() =>
    this.cur()
      .picked.map((c) => this.index().get(c))
      .filter(Boolean),
  );

  readonly generated = computed(() =>
    this.buildMessage(this.tpl(), this.cur(), this.picked()),
  );
  readonly message = computed(() => this.draft() ?? this.generated());

  readonly waHref = computed(() => {
    const phone = this.waPhone();
    return `https://wa.me/${phone}?text=${encodeURIComponent(this.message())}`;
  });

  readonly priceNote = computed(() => {
    const e = this.cur();
    const r = this.rules()[e.market];
    return r.mult
      ? `${e.market}: price = C. No. × ${r.mult}. Up to 45% off is the maximum. Open at full price. ${r.extras} on top.`
      : 'India: price comes from the CRM app. Up to 15% off on diamond + stone value only (not gold). More needs a senior.';
  });

  // ---------- Static UI data ----------
  quickActions = [
    {
      icon: 'pi pi-image',
      title: 'Search by Image',
      sub: 'Find similar products',
      link: '/image-search',
    },
    {
      icon: 'pi pi-user-plus',
      title: 'View All Customer',
      sub: 'Create & manage customer',
      link: '/customers/view-all',
    },
    {
      icon: 'pi pi-clock',
      title: "View Today's FU",
      sub: 'Follow up with customers',
      link: '/followup/todays',
    },
  ];

  constructor() {
    // First load + every server-side filter change (category, sub-category, collection, stone type).
    effect(() => {
      this.serverKey();
      untracked(() => this.loadProducts());
    });
    // New filters / enquiry → back to page 1.
    effect(() => {
      this.results();
      this.page.set(1);
    });
    // A new generated message replaces any hand edits (pick change, template change, enquiry change).
    effect(() => {
      this.generated();
      this.draft.set(null);
    });
  }

  ngOnInit() {
    this.loadFacets();
    this.tick = setInterval(() => this.now.set(Date.now()), 60_000);
  }

  ngOnDestroy() {
    clearInterval(this.tick);
    this.productsSub?.unsubscribe();
  }

  // =====================================================================
  // Enquiries (left pane)
  // =====================================================================

  /** "New" button – starts a fresh enquiry. */
  newEnquiry() {
    this.desk.add();
    this.tpl.set('options');
  }

  selectEnquiry(id: string) {
    this.desk.select(id);
    this.tpl.set('options');
  }

  /** Trash button – asks first with the PrimeNG confirm dialog. */
  removeEnquiry(id: string, ev?: Event) {
    ev?.stopPropagation();
    const e = this.enquiries().find((x) => x.id === id);
    this._confirm.confirm({
      header: 'Delete enquiry',
      message: `Delete the enquiry for ${e?.name || 'this customer'}?`,
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Delete',
      rejectLabel: 'Cancel',
      acceptButtonProps: { severity: 'danger' },
      rejectButtonProps: { severity: 'secondary', outlined: true },
      accept: () => {
        this.desk.remove(id);
        this.tpl.set('options');
      },
    });
  }

  patchEnquiry(patch: Partial<Enquiry>) {
    const c = this.cur();
    const next = { ...patch };
    const need = patch.need ?? c.need;
    const occ = patch.occasion ?? c.occasion;
    // Capturing what they want = "requirement understood"
    if (c.stage < 1 && (need || occ)) next.stage = 1;
    this.desk.patchCurrent(next);
  }

  status(e: Enquiry) {
    return enquiryStatus(e, this.now());
  }

  ago(ts: number): string {
    const m = Math.max(1, Math.round((this.now() - ts) / 6e4));
    return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} hr ago`;
  }

  // ---------- Save new customer ----------
  /**
   * Saves the customer details typed in the Customer section.
   * Requires `addCustomer()` on ApiService (see the snippet in the chat),
   * or rename it to the method your add-customer page already uses.
   */
  /** Saves the current enquiry (name, phone, channel, market…) to the server now. */
  async saveCustomer() {
    if (this.customerSaving()) return;
    const e = this.cur();
    const name = (e.name || '').trim();
    const digits = (e.phone || '').replace(/\D/g, '');

    if (!name) {
      this.toast('warn', 'Name missing', 'Enter the customer’s name first.');
      return;
    }
    if (digits.length < 10) {
      this.toast(
        'warn',
        'Number missing',
        'Enter a valid WhatsApp number (at least 10 digits).',
      );
      return;
    }

    this.customerSaving.set(true);
    try {
      this.desk.patchCurrent({ name, phone: e.phone.trim() }); // marks it for sync
      await this.desk.flushAll(); // push now instead of waiting for the debounce

      if (this.syncState() === 'offline') {
        this.toast(
          'info',
          'Saved on this device',
          `${name} will sync when you are back online.`,
        );
      } else {
        this.toast('success', 'Saved', `${name} saved to enquiries`);
      }
    } finally {
      this.customerSaving.set(false);
    }
  }

  // =====================================================================
  // Filters (table header)
  // =====================================================================
  setFilter(key: keyof DeskFilters, value: string | null) {
    const next: any = { ...this.f(), [key]: value ?? '' };
    if (key === 'avail' && !value) next.avail = 'store';
    if (key === 'category') next.sub = '';
    this.desk.patchCurrent({ f: next });
  }

  setSub(sub: string) {
    this.desk.patchCurrent({ f: { ...this.f(), sub } });
  }

  clearAll() {
    this.desk.patchCurrent({ f: blankFilters() });
    this.cNoMin.set(null);
    this.cNoMax.set(null);
    this.priceRange.set(null);
  }

  onPage(e: PaginatorState) {
    this.page.set((e.page ?? 0) + 1);
  }

  // ---------- View toggle ----------
  private readSavedView(): ViewMode {
    try {
      // List (table with header filters) is the default view
      return localStorage.getItem(VIEW_MODE_KEY) === 'grid' ? 'grid' : 'list';
    } catch {
      return 'list';
    }
  }

  setView(mode: ViewMode) {
    if (this.viewMode() === mode) return;
    this.viewMode.set(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      /* storage unavailable – ignore */
    }
    this.page.set(1); // page size differs per view
  }

  // =====================================================================
  // Shortlist + messages (right pane)
  // =====================================================================
  isPicked(code: string) {
    return this.cur().picked.includes(code);
  }

  togglePick(code: string, ev?: Event) {
    ev?.stopPropagation();
    const c = this.cur();
    if (c.picked.includes(code)) {
      this.desk.patchCurrent({ picked: c.picked.filter((x) => x !== code) });
      return;
    }
    if (c.picked.length >= MAX_PICKS) {
      this.toast(
        'warn',
        'Shortlist full',
        `Keep the best 3–4 (max ${MAX_PICKS}).`,
      );
      return;
    }
    this.desk.patchCurrent({
      picked: [...c.picked, code],
      stage: Math.max(c.stage, 1),
    });
  }

  setTemplate(t: MsgTpl) {
    this.tpl.set(t);
  }

  async copyMessage() {
    try {
      await navigator.clipboard.writeText(this.message());
      this.toast('success', 'Copied', 'Message copied');
    } catch {
      this.toast('info', 'Copy', 'Select the text and press Ctrl+C');
    }
  }

  openWhatsApp() {
    if (!this.waPhone()) {
      this.toast(
        'warn',
        'Number missing',
        'Add the customer’s WhatsApp number first.',
      );
      return;
    }
    window.open(this.waHref(), '_blank', 'noopener');
  }

  markSent() {
    const e = this.cur(),
      t = this.tpl();
    if ((t === 'details' || t === 'price') && !e.picked.length) {
      this.toast(
        'warn',
        'Nothing to send',
        'Add the piece the customer liked first.',
      );
      return;
    }
    this.desk.patchCurrent({
      stage: Math.max(e.stage, STAGE_AFTER_SEND[t]),
      sentAt: t === 'options' || t === 'nudge' ? Date.now() : e.sentAt,
    });
    // Spec §7: enquiry, template, Jewel Codes, time. The server adds the executive from the token.
    this.desk.logSend({ enquiryId: e.id, template: t, codes: [...e.picked] });
    this.toast('success', 'Logged', 'Logged as sent');
  }

  /** digits only; a bare 10-digit Indian number gets the 91 prefix */
  private waPhone(): string {
    const e = this.cur();
    const d = (e.phone || '').replace(/\D/g, '');
    return e.market === 'India' && d.length === 10 ? '91' + d : d;
  }

  // =====================================================================
  // Message templates (spec §6) – English only, editable before sending
  // =====================================================================
  private buildMessage(t: MsgTpl, e: Enquiry, ps: any[]): string {
    const C = MESSAGE_COPY;
    const first = (e.name || '').trim().split(/\s+/)[0] || 'there';
    const rule = this.rules()[e.market];
    const list = ps
      .map((p, i) => `${i + 1}. ${p.jewel_code} – ${this.itemTitle(p)}`)
      .join('\n');

    switch (t) {
      case 'options':
        if (!ps.length)
          return `Hello ${first}, thank you for reaching out to ${C.brand}. Could you tell me the occasion and a rough budget you have in mind, so I can share the best options?`;
        return (
          `Hello ${first}, thank you for reaching out to ${C.brand}.\n\n` +
          `Here are ${ps.length} piece${ps.length > 1 ? 's' : ''} I picked for you:\n\n${list}\n\n` +
          `I'm sending the photos now. Do let me know which one you like, and I'll share the full details.`
        );

      case 'nudge':
        return (
          `Hello ${first}, hope you had a chance to look at the pieces I shared` +
          `${ps.length ? ` (${ps.map((p) => p.jewel_code).join(', ')})` : ''}.\n\n` +
          `Is there one you sort of like? Tell me and I can show you more in the same style.`
        );

      case 'details':
        if (!ps.length)
          return 'Add the piece the customer liked to the shortlist first.';
        return (
          ps.map((p) => this.detailBlock(p)).join('\n') + `\n${C.detailsFooter}`
        );

      case 'price':
        if (!ps.length)
          return 'Add the piece the customer liked to the shortlist first.';
        return (
          ps
            .map(
              (p) =>
                `${p.jewel_code} – ${this.itemTitle(p)}: ${this.marketPrice(p, e.market)}`,
            )
            .join('\n') +
          (rule.mult
            ? `\n\nThis is the tag price. ${rule.extras} will be added.`
            : '') +
          `\n\nCan I call you for a few minutes to go over this? Or you are welcome to visit us at ${C.store} to see the piece in person.`
        );
    }
  }

  private detailBlock(p: any): string {
    const make = this.makeOf(p);
    const lines = [`${p.jewel_code} – ${this.itemTitle(p)}`];

    const gold = [this.karat(p), p.metal].filter(Boolean).join(' ');
    if (gold || p.net_wt) {
      lines.push(
        `• Gold: ${gold}${p.net_wt ? `, ${p.net_wt} g net` : ''}${
          p.gross_wt ? ` (${p.gross_wt} g gross)` : ''
        }${MESSAGE_COPY.goldNote}`,
      );
    }
    const dia = this.getTotaldiamondWeight(p.diamonds);
    if (dia) {
      lines.push(
        `• ${make === 'Polki' ? 'Polki' : 'Diamonds'}: ${dia.toFixed(2)} ct` +
          (p.dia_quality ? `, ${p.dia_quality}` : '') +
          (p.certificate ? `, ${p.certificate} certified` : ''),
      );
    }
    const st = this.getTotalStoneWeight(p.stones);
    if (st || p.stone_type) {
      lines.push(
        `• Stones: ${[
          p.stone_type ? tc(p.stone_type) : '',
          st ? `${st.toFixed(2)} ct` : '',
        ]
          .filter(Boolean)
          .join(', ')}`,
      );
    }
    return lines.join('\n') + '\n';
  }

  // =====================================================================
  // Item helpers
  // =====================================================================
  /**
   * Maps whatever your product `status` holds onto the four desk statuses.
   * Anything unrecognised (e.g. "available", "active", "in_stock") counts as In store,
   * so a product is never hidden just because of an unexpected status value.
   */
  statusOf(p: any): ItemStatus {
    const s = norm(p.status);
    if (/(^|[^a-z])sold($|[^a-z])/.test(s)) return 'Sold'; // "sold", "sold_out" — not "unsold"
    if (s.includes('reserv') || s.includes('hold')) return 'Reserved';
    if (s.includes('exhibit')) return 'At exhibition';
    return 'In store';
  }

  statusSeverity(s: ItemStatus): TagSeverity {
    return s === 'In store' ? 'success' : s === 'Reserved' ? 'danger' : 'warn';
  }

  /** Diamond / Polki / Gemstone / Gold — from `make_type` if present, else derived. */
  makeOf(p: any): MakeType {
    if (p.make_type) return p.make_type as MakeType;
    const t = norm(
      `${p.collection} ${p.stone_type} ${p.sub_category} ${p.product_category}`,
    );
    if (t.includes('polki') || t.includes('kundan')) return 'Polki';
    if (p.diamonds?.length) return 'Diamond';
    if (p.stones?.length) return 'Gemstone';
    return 'Gold';
  }

  /** Purity: `material` (e.g. 22 → "22K"), else `purity`, else `quality_code` (e.g. "22" → "22K"). */
  karat(p: any): string {
    return p.material
      ? `${p.material}K`
      : (p.purity ?? (p.quality_code ? `${p.quality_code}K` : ''));
  }

  itemTitle(p: any): string {
    return `${tc(this.makeOf(p))} ${tc(p.sub_category || p.product_category || '')}`.trim();
  }

  specLine(p: any): string {
    const parts: string[] = [];
    const gold = [this.karat(p), p.metal].filter(Boolean).join(' ');
    if (gold || p.net_wt)
      parts.push(`${gold}${p.net_wt ? ` ${p.net_wt} g` : ''}`.trim());
    const dia = this.getTotaldiamondWeight(p.diamonds);
    if (dia)
      parts.push(
        `${this.makeOf(p) === 'Polki' ? 'polki' : 'diamonds'} ${dia.toFixed(2)} ct`,
      );
    if (p.stone_type) parts.push(norm(p.stone_type));
    return parts.join(' · ');
  }

  // ---------- Product table columns ----------
  private sumOf(rows: any[], key: string): number {
    return rows.reduce((t, r) => t + (+r?.[key] || 0), 0);
  }

  /** A `diamonds[]` row counts as polki if its descriptive fields say so. */
  private isPolkiRow(d: any): boolean {
    return /polki/.test(
      norm(
        [
          d?.dia_type,
          d?.type,
          d?.shape,
          d?.name,
          d?.description,
          d?.quality,
        ].join(' '),
      ),
    );
  }

  /** Splits `diamonds[]` into polki rows and regular diamond rows. */
  private splitDiamonds(p: any) {
    const all: any[] = p.diamonds ?? [];
    let polki = all.filter((d) => this.isPolkiRow(d));
    // A Polki piece whose rows carry no label: treat all its stones as polki
    if (!polki.length && this.makeOf(p) === 'Polki') polki = all;
    return { polki, dia: all.filter((d) => !polki.includes(d)) };
  }

  /** Total diamond weight (ct) across all diamond rows, polki excluded. */
  diamondWt(p: any): number {
    return this.sumOf(this.splitDiamonds(p).dia, 'dia_wt');
  }

  /** Total polki weight (ct) across all polki rows. */
  polkiWt(p: any): number {
    return this.sumOf(this.splitDiamonds(p).polki, 'dia_wt');
  }

  vendorOf(p: any): string {
    return p.brand || p.vendor || '';
  }

  /** '-' for zero/missing, otherwise an Indian-grouped number. */
  fmtNum(v: number, min = 2, max = min): string {
    return v
      ? v.toLocaleString('en-IN', {
          minimumFractionDigits: min,
          maximumFractionDigits: max,
        })
      : '-';
  }

  // ---------- Pricing (spec §5) ----------
  /** India price = your original in-browser calculation (metal + diamonds + stones + making, + 3% GST). */
  indiaPrice(p: any): number {
    return this.getGrandTotal(p);
  }

  /** India: ₹ price. Middle East: C. No. × market multiplier. */
  marketPrice(p: any, market: Market): string {
    const r = this.rules()[market];
    if (!r.mult)
      return '₹' + Math.round(this.indiaPrice(p)).toLocaleString('en-IN');
    if (!+p.c_no) return 'C. No. missing';
    return `${r.cur} ${Math.round(+p.c_no * r.mult).toLocaleString('en-IN')}`;
  }

  // =====================================================================
  // Data loading
  // =====================================================================
  loadFacets() {
    this._apiService.getProductFilters().subscribe({
      next: (f: Facets) => this.facets.set(f),
      error: (err: any) => console.error('Filters API Error:', err),
    });
  }

  /** Fetches everything matching the server-side filters; a newer request cancels an older one. */
  loadProducts() {
    this.productsSub?.unsubscribe();
    this.loading.set(true);
    const params = this.serverParams();

    this.productsSub = this._apiService.getProductAll(params).subscribe({
      next: (res: any) => {
        const data: any[] = res.data ?? [];
        this.allProducts.set(data);
        if (!params['sub_category']) {
          this.subOptions.set(
            [
              ...new Set(data.map((p) => p.sub_category).filter(Boolean)),
            ].sort() as string[],
          );
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.toast('error', 'Failed', 'Could not load products');
      },
    });
  }

  reload() {
    this.loadProducts();
  }

  // ---------- Search by tag ----------
  search() {
    const searchValue =
      this.searchFrom.get('jewel_code')?.value || this.lastScanned;
    if (!searchValue) {
      this.searchFrom.controls.jewel_code.markAsTouched();
      return;
    }
    const term = searchValue.toUpperCase().trim();

    this._apiService.findProduct({ jewel_code: term }).subscribe({
      next: (res: any) => {
        if (!res || res.length === 0) {
          this.toast('error', 'Not Found', `No product found for ${term}`);
          this.searchResult.set([]);
        } else {
          this.searchResult.set(Array.isArray(res) ? res : [res]);
        }
      },
      error: (err) => console.error('Search API Error:', err),
    });
  }

  clearSearch() {
    this.searchResult.set([]);
    this.searchFrom.reset({ jewel_code: '' });
  }

  // ---------- Images (per product, so each card has its own state) ----------
  imageUrl(code: string, url?: string) {
    return (
      url || `${environment.SYNC_IMAGE_URL}/${encodeURIComponent(code)}.jpg`
    );
  }
  onImgError(code: string) {
    this.imageFailed.update((s) => new Set(s).add(code));
  }

  // ---------- Calculations ----------
  getTotalDiamondAmount(diamonds: any[]): number {
    return (diamonds || []).reduce((t, d) => t + (d.dia_amt || 0), 0);
  }
  getTotaldiamondWeight(diamonds: any[]): number {
    return (diamonds || []).reduce((t, d) => t + (d.dia_wt || 0), 0);
  }
  getTotalStoneWeight(stones: any[]): number {
    return (stones || []).reduce((t, s) => t + (s.stone_wt || 0), 0);
  }
  getTotalStoneAmount(stones: any[]): number {
    return (stones || []).reduce((t, s) => t + (s.stone_amt || 0), 0);
  }

  getMakingChargeAmount(item: any): number {
    const materialSubtotal =
      (item.metal_amt || 0) +
      this.getTotalDiamondAmount(item.diamonds) +
      this.getTotalStoneAmount(item.stones);
    if (item.making_charge)
      return (materialSubtotal * item.making_charge) / 100;
    if (item.making_amt) return item.making_amt;
    return 0;
  }

  /** Metal + diamonds + stones + making (before GST) */
  getSubtotal(item: any): number {
    return (
      (item.metal_amt || 0) +
      this.getTotalDiamondAmount(item.diamonds) +
      this.getTotalStoneAmount(item.stones) +
      this.getMakingChargeAmount(item)
    );
  }

  /** 3% GST on the subtotal */
  getGst(item: any): number {
    return this.getGrandTotal(item) - this.getSubtotal(item);
  }

  getGrandTotal(item: any): number {
    const subtotal = this.getSubtotal(item);
    return subtotal + subtotal * 0.03; // + 3% GST
  }

  // ---------- CSV upload ----------
  onFileChange(event: any) {
    const file = event.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      this.toast('error', 'Invalid File', 'CSV only');
      return;
    }
    this.selectedFile = file;
    this.csvForm.patchValue({ csv_file: file });
  }

  onSubmit() {
    if (!this.selectedFile) return;
    this.isUploading.set('Processing...');
    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this._apiService.uploadCsvFile(formData).subscribe({
      next: (res: any) => {
        this.toast(
          'success',
          'Success',
          `Total ${res.count} product imported successfully`,
        );
        this.isUploading.set('Upload');
        this.visible = false;
        this.selectedFile = null;
        this.loadFacets();
        this.reload(); // show newly imported products
      },
      error: (err) => {
        this.toast(
          'error',
          'Failed',
          `Import failed: ${err.error?.message || 'Check CSV format'}`,
        );
        this.isUploading.set('Upload');
      },
    });
  }

  private toast(severity: string, summary: string, detail: string) {
    this._messageService.add({ severity, summary, detail });
  }

  // ---------- Share as PDF (WhatsApp) ----------
  async shareItem(item: any, ev?: Event) {
    ev?.stopPropagation();
    if (this.sharingCode()) return;
    this.sharingCode.set(item.jewel_code);

    try {
      const blob = await this.buildItemPdf(item);
      const fileName = `${item.jewel_code}.pdf`;
      const file = new File([blob], fileName, { type: 'application/pdf' });
      const text = `${item.product_category} - ${item.sub_category} (${item.jewel_code})\nRKJ Price: Rs. ${Math.round(this.getGrandTotal(item))} (Inc. GST)`;

      // Mobile (and some desktops): native share sheet with the PDF attached
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: item.jewel_code, text });
      } else {
        // Fallback: download the PDF and open WhatsApp so it can be attached manually
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        a.click();
        URL.revokeObjectURL(url);
        window.open(
          `https://wa.me/?text=${encodeURIComponent(text)}`,
          '_blank',
        );
        this.toast(
          'info',
          'PDF downloaded',
          'Attach the downloaded PDF in WhatsApp.',
        );
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // AbortError = user closed the share sheet
        console.error('Share error:', err);
        this.toast('error', 'Failed', 'Could not create the PDF');
      }
    } finally {
      this.sharingCode.set(null);
    }
  }

  private async buildItemPdf(item: any): Promise<Blob> {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageW = doc.internal.pageSize.getWidth();
    const fmt = (n: number) =>
      (n || 0).toLocaleString('en-IN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    // Header
    doc.setFontSize(16).setFont('helvetica', 'bold');
    doc.text(
      `${item.product_category ?? ''} - ${item.sub_category ?? ''}`.toUpperCase(),
      14,
      18,
    );
    doc.setFontSize(12);
    doc.text(item.jewel_code, pageW - 14, 18, { align: 'right' });

    // Image (optional, skipped if it can't be loaded)
    let y = 26;
    const img = await this.toDataUrl(
      this.imageUrl(item.jewel_code, item.product_image_url),
    );
    if (img) {
      doc.addImage(img, 'JPEG', 14, y, 60, 60);
      y += 66;
    }

    // Price breakdown (same rows as the on-screen card)
    const body: any[] = [
      [
        'Net wt.',
        `${item.net_wt ?? '-'} Gms`,
        '-',
        '-',
        '-',
        item.material ? item.material + 'K' : '-',
        fmt(item.metal_amt),
      ],
      [
        'Making',
        '-',
        '-',
        '-',
        item.making_charge
          ? `${item.making_charge}%`
          : item.making_amt
            ? 'Fixed'
            : '-',
        '-',
        fmt(this.getMakingChargeAmount(item)),
      ],
    ];
    if (item.diamonds?.length) {
      body.push([
        'Total Dia. (B)',
        `${this.getTotaldiamondWeight(item.diamonds).toFixed(2)} Cts`,
        '-',
        '-',
        '-',
        '-',
        fmt(this.getTotalDiamondAmount(item.diamonds)),
      ]);
    }
    if (item.stones?.length) {
      body.push([
        'Total Stone (B)',
        `${this.getTotalStoneWeight(item.stones).toFixed(2)} Cts`,
        '-',
        '-',
        '-',
        '-',
        fmt(this.getTotalStoneAmount(item.stones)),
      ]);
    }
    const subtotal = this.getSubtotal(item);
    const grand = this.getGrandTotal(item);
    body.push(
      ['Subtotal (A+B+C)', '', '', '', '', '', fmt(subtotal)],
      ['GST', '-', '-', '-', '3%', '-', fmt(grand - subtotal)],
      ['RKJ Price (Inc. GST)', '', '', '', '', '', fmt(grand)],
    );

    autoTable(doc, {
      startY: y,
      head: [
        [
          'Description',
          'Wt.',
          'Pcs.',
          'Size | Shape',
          'Rate',
          'Qlty',
          'Price (Rs.)',
        ],
      ],
      body,
      theme: 'grid',
      headStyles: { fillColor: [17, 24, 39] },
      styles: { fontSize: 9 },
      columnStyles: { 6: { halign: 'right' } },
      didParseCell: (d) => {
        if (d.section === 'body' && d.row.index === body.length - 1) {
          d.cell.styles.fontStyle = 'bold';
          d.cell.styles.fillColor = [229, 231, 235];
        }
      },
    });

    return doc.output('blob');
  }

  /** Loads an image as a data URL; returns null on CORS/404 errors. */
  private async toDataUrl(url: string): Promise<string | null> {
    try {
      const res = await fetch(url);
      if (!res.ok) return null;
      const blob = await res.blob();
      return await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(r.result as string);
        r.onerror = reject;
        r.readAsDataURL(blob);
      });
    } catch {
      return null;
    }
  }
}
