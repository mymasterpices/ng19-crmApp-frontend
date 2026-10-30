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
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tooltip } from 'primeng/tooltip';

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
    Tooltip,
  ],
  templateUrl: './products-view-all.component.html',
  styleUrl: './products-view-all.component.css',
})
export class ProductsViewAllComponent implements OnInit {
  private _apiService = inject(ApiService);
  private _authService = inject(AuthService);
  private _messageService = inject(MessageService);

  // ---------- Search state ----------
  searchResult = signal<any[]>([]);
  isUploading = signal<string>('Upload');
  imageFailed = signal<Set<string>>(new Set());

  loggedUser = this._authService.getUserRole();
  visible = false; // CSV dialog
  filterOpen = signal<boolean>(false); // CSV dialog
  selectedFile: File | null = null;
  lastScanned: string | null = null;

  sharingCode = signal<string | null>(null);

  searchFrom = new FormGroup({
    jewel_code: new FormControl('', [Validators.required]),
  });
  csvForm = new FormGroup({
    csv_file: new FormControl<File | null>(null, Validators.required),
  });

  // ---------- View mode (grid / list) ----------
  viewMode = signal<ViewMode>(this.readSavedView());
  // show Filter
  showFilter() {
    this.filterOpen.set(true);
  }
  /** List cards are tall (full price breakdown), so show fewer per page. */
  get limit(): number {
    return this.viewMode() === 'list' ? 6 : 12;
  }

  // ---------- Featured products ----------
  // Price is calculated in the browser (getGrandTotal), so price sort, the price
  // filter and pagination all run client-side on the full result set.
  private readonly FETCH_ALL = 5000;
  readonly maxPriceLimit = 500000;

  allProducts = signal<any[]>([]);
  page = signal(1);
  loading = signal(false);

  tab = signal<TabKey>('price_asc');
  category = signal<string | null>(null);
  filters = signal<Partial<Record<FilterKey, string>>>({});
  priceMax = signal(500000);

  /** Price-filtered and sorted by grand total (incl. GST) */
  sortedProducts = computed(() => {
    const max = this.priceMax();
    const dir = this.tab() === 'price_asc' ? 1 : -1;

    let rows = this.allProducts().map((p) => ({
      p,
      price: this.getGrandTotal(p),
    }));
    if (max < this.maxPriceLimit) rows = rows.filter((r) => r.price <= max);

    return rows.sort((a, b) => (a.price - b.price) * dir).map((r) => r.p);
  });

  total = computed(() => this.sortedProducts().length);

  /** Current page slice */
  visibleProducts = computed(() => {
    const start = (this.page() - 1) * this.limit;
    return this.sortedProducts().slice(start, start + this.limit);
  });

  facets = signal<Facets>({
    categories: [],
    sub_categories: [],
    metals: [],
    purities: [],
    genders: [],
    collections: [],
    stone_types: [],
  });

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
    this.page.set(1); // page size differs per view
  }

  // ---------- Data loading ----------
  loadFacets() {
    this._apiService.getProductFilters().subscribe({
      next: (f: Facets) => this.facets.set(f),
      error: (err: any) => console.error('Filters API Error:', err),
    });
  }

  /** Fetches everything matching the server-side filters (category etc.) */
  loadProducts() {
    this.loading.set(true);
    const params: Record<string, string | number> = {
      page: 1,
      limit: this.FETCH_ALL,
    };
    if (this.category()) params['category'] = this.category()!;
    Object.entries(this.filters()).forEach(([k, v]) => v && (params[k] = v));

    this._apiService.getProductAll(params).subscribe({
      next: (res: any) => {
        this.allProducts.set(res.data ?? []);
        this.page.set(1);
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

  /** Re-fetch after server-side filters change */
  reload() {
    this.loadProducts();
  }

  onPage(e: PaginatorState) {
    this.page.set((e.page ?? 0) + 1);
  }

  setTab(t: TabKey) {
    this.tab.set(t);
    this.page.set(1);
  }

  onPriceChange(value: number) {
    this.priceMax.set(value);
    this.page.set(1);
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

  getGrandTotal(item: any): number {
    const subtotal = this.getSubtotal(item);
    return subtotal + subtotal * 0.03; // + 3% GST
  }

  // ---------- CSV upload ----------
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

  //render categories images to list of categories
  // ---------- Category images (public/category-img) ----------
  private readonly CATEGORY_IMG_DIR = 'category-img';
  private readonly CATEGORY_IMG_EXT = 'png';

  // Only needed for files that don't follow the naming rule
  private readonly CATEGORY_IMG_OVERRIDES: Record<string, string> = {
    'DIAMOND BANGLE': 'diamondbangle.png',
    'DIAMOND BRACELET': 'diamondbracelet.png',
    'DIAMOND EARRING': 'diamondearring.png',
    'DIAMOND MANGALSUTRA': 'diamondmangalsutra.png',
    'DIAMOND NECKLACE': 'diamondnecklace.png',
    'DIAMOND NECKLACE EARRING': 'diamondnecklaceearring.png',
    'DIAMOND NOSE PIN': 'diamondnosepin.png',
    'DIAMOND PENDANT': 'diamondpendant.png',
    'DIAMOND RING': 'diamondring.png',
    'GOLD BANGLE 2': 'goldbangle2.png',
    'GOLD BANGLE 4': 'goldbangle4.png',
    'GOLD BRACELET': 'goldbracelet.png',
    'GOLD CHAIN': 'goldchain.png',
    'GOLD EARRING': 'goldearring.png',
    'GOLD EARRING OF PS': 'goldearringofps.png',
    'GOLD HAR NECKLACE': 'goldharnecklace.png',
    'GOLD HAR NECKLACE EARRINGS': 'goldharnecklaceearrings.png',
    'GOLD KANTHI NECKLACE': 'goldkanthinecklace.png',
    'GOLD KANTHI NECKLACE EARRING': 'goldkanthinecklaceearring.png',
    'GOLD MANGALSUTRA': 'goldmangalsutra.png',
    'GOLD PENDANT': 'goldpendant.png',
    'GOLD PENDANT OF SET': 'goldpendantofset.png',
    'GOLD RING': 'goldring.png',
  };
  categoryImage(name: string): string {
    const override = this.CATEGORY_IMG_OVERRIDES[name];
    if (override) return `${this.CATEGORY_IMG_DIR}/${override}`;

    const slug = name.trim().toLowerCase().replace(/\s+/g, '-');
    return `${this.CATEGORY_IMG_DIR}/${slug}.${this.CATEGORY_IMG_EXT}`;
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
        this._messageService.add({
          severity: 'info',
          summary: 'PDF downloaded',
          detail: 'Attach the downloaded PDF in WhatsApp.',
        });
      }
    } catch (err: any) {
      if (err?.name !== 'AbortError') {
        // AbortError = user closed the share sheet
        console.error('Share error:', err);
        this._messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Could not create the PDF',
        });
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
