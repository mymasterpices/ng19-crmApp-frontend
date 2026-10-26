import {
  Component,
  computed,
  ElementRef,
  inject,
  OnInit,
  signal,
  ViewChild,
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

// PrimeNG
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageModule } from 'primeng/message';
import { SliderModule } from 'primeng/slider';
import { PaginatorModule, PaginatorState } from 'primeng/paginator';
import { MessageService } from 'primeng/api';

import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';
import { Drawer } from 'primeng/drawer';

type TabKey = 'price_asc' | 'price_desc';
type ViewMode = 'grid' | 'list';
type FilterKey =
  | 'gender'
  | 'sub_category'
  | 'metal'
  | 'purity'
  | 'collection'
  | 'stone_type';

interface Facets {
  categories: string[];
  sub_categories: string[];
  metals: string[];
  purities: string[];
  genders: string[];
  collections: string[];
  stone_types: string[];
}

const VIEW_MODE_KEY = 'products-view-mode';

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
    DialogModule,
    FileUploadModule,
    MessageModule,
    SliderModule,
    PaginatorModule,
    DecimalPipe,
    Drawer,
  ],
  templateUrl: './products-view-all.component.html',
  styleUrl: './products-view-all.component.css',
})
export class ProductsViewAllComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _authService = inject(AuthService);
  private _messageService = inject(MessageService);

  // ---------- Search state (existing) ----------
  searchResult = signal<any[]>([]);
  isUploading = signal<string>('Upload');
  imageFailed = signal<Set<string>>(new Set());

  loggedUser = this._authService.getUserRole();
  visible = false; // CSV dialog
  selectedFile: File | null = null;
  lastScanned: string | null = null;

  searchFrom = new FormGroup({
    jewel_code: new FormControl('', [Validators.required]),
  });
  csvForm = new FormGroup({
    csv_file: new FormControl<File | null>(null, Validators.required),
  });

  // ---------- View mode (grid / list) ----------
  viewMode = signal<ViewMode>(this.readSavedView());

  /** List cards are tall (full price breakdown), so show fewer per page. */
  get limit(): number {
    return this.viewMode() === 'list' ? 6 : 12;
  }

  // ---------- Featured products (paginated, server-side filters) ----------
  readonly maxPriceLimit = 500000;
  products = signal<any[]>([]);
  total = signal(0);
  page = signal(1);
  loading = signal(false);

  tab = signal<TabKey>('price_asc');
  category = signal<string | null>(null);
  filters = signal<Partial<Record<FilterKey, string>>>({});
  priceMax = signal(500000);

  facets = signal<Facets>({
    categories: [],
    sub_categories: [],
    metals: [],
    purities: [],
    genders: [],
    collections: [],
    stone_types: [],
  });

  visibleProducts = computed(() => this.products());
  categories = computed(() =>
    this.facets().categories.map((c) => ({ key: c, label: c })),
  );

  // ----- category search + carousel -----
  catSearch = signal('');
  filteredCategories = computed(() => {
    const q = this.catSearch().trim().toLowerCase();
    return this.categories().filter((c) => c.label.toLowerCase().includes(q));
  });

  @ViewChild('catScroller') catScroller?: ElementRef<HTMLElement>;
  @ViewChild('productsSection') productsSection?: ElementRef<HTMLElement>;

  onCatSearch(value: string) {
    this.catSearch.set(value ?? '');
    this.catScroller?.nativeElement.scrollTo({ left: 0 });
  }

  scrollCats(dir: 1 | -1) {
    const el = this.catScroller?.nativeElement;
    el?.scrollBy({ left: dir * el.clientWidth * 0.8, behavior: 'smooth' });
  }

  filterGroups = computed(() => {
    const f = this.facets();
    return [
      { key: 'gender' as FilterKey, label: 'Gender', options: f.genders },
      {
        key: 'sub_category' as FilterKey,
        label: 'Sub Category',
        options: f.sub_categories,
      },
      { key: 'metal' as FilterKey, label: 'Metal Type', options: f.metals },
      { key: 'purity' as FilterKey, label: 'Purity', options: f.purities },
      {
        key: 'collection' as FilterKey,
        label: 'Collection',
        options: f.collections,
      },
      {
        key: 'stone_type' as FilterKey,
        label: 'Stone Type',
        options: f.stone_types,
      },
    ].filter((g) => g.options.length);
  });

  // ---------- Static UI data ----------
  heroPoints = [
    {
      icon: 'pi pi-bolt',
      title: 'Faster Search',
      sub: 'Find products in seconds',
    },
    {
      icon: 'pi pi-heart',
      title: 'Customer Focused',
      sub: 'Right product. Right customer.',
    },
  ];
  tabs: { key: TabKey; label: string }[] = [
    { key: 'price_asc', label: 'Price: Low to High' },
    { key: 'price_desc', label: 'Price: High to Low' },
  ];
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

  ngOnInit() {
    this.loadFacets();
    this.loadProducts();
  }

  // ---------- View toggle ----------
  private readSavedView(): ViewMode {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === 'list' ? 'list' : 'grid';
    } catch {
      return 'grid';
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
    // page size differs per view, so restart from page 1
    this.reload();
  }

  loadFacets() {
    this._apiService.getProductFilters().subscribe({
      next: (f: Facets) => this.facets.set(f),
      error: (err: any) => console.error('Filters API Error:', err),
    });
  }

  loadProducts() {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: this.page(),
      limit: this.limit,
      sort: this.tab(),
    };
    if (this.category()) params['category'] = this.category()!;
    if (this.priceMax() < this.maxPriceLimit)
      params['maxPrice'] = this.priceMax();
    Object.entries(this.filters()).forEach(([k, v]) => v && (params[k] = v));

    this._apiService.getProductAll(params).subscribe({
      next: (res: any) => {
        this.products.set(res.data ?? []);
        this.total.set(res.total ?? 0);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this._messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Could not load products',
        });
      },
    });
  }

  reload() {
    this.page.set(1);
    this.loadProducts();
  }

  onPage(e: PaginatorState) {
    this.page.set((e.page ?? 0) + 1);
    this.loadProducts();
  }
  setTab(t: TabKey) {
    this.tab.set(t);
    this.reload();
  }
  setCategory(c: string | null) {
    this.category.set(this.category() === c ? null : c);
    this.reload();
    if (this.category()) {
      this.productsSection?.nativeElement.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }
  }
  toggleFilter(key: FilterKey, value: string) {
    const next = { ...this.filters() };
    next[key] === value ? delete next[key] : (next[key] = value);
    this.filters.set(next);
    this.reload();
  }
  clearFilters() {
    this.filters.set({});
    this.category.set(null);
    this.priceMax.set(this.maxPriceLimit);
    this.reload();
  }

  // ---------- Search by tag (existing) ----------
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
          this._messageService.add({
            severity: 'error',
            summary: 'Not Found',
            detail: `No product found for ${term}`,
          });
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

  // ---------- Calculations (existing) ----------
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

  getGrandTotal(item: any): number {
    const subtotal = this.getSubtotal(item);
    return subtotal + subtotal * 0.03; // + 3% GST
  }

  // ---------- CSV upload (existing) ----------
  onFileChange(event: any) {
    const file = event.files[0];
    if (!file || !file.name.endsWith('.csv')) {
      this._messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'CSV only',
      });
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
        this._messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Total ${res.count} product imported successfully`,
        });
        this.isUploading.set('Upload');
        this.visible = false;
        this.selectedFile = null;
        this.loadFacets();
        this.reload(); // show newly imported products
      },
      error: (err) => {
        this._messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: `Import failed: ${err.error?.message || 'Check CSV format'}`,
        });
        this.isUploading.set('Upload');
      },
    });
  }
}
