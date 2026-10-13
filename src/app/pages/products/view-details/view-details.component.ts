import {
  Component,
  computed,
  DestroyRef,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { InputText } from 'primeng/inputtext';
import { Card } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { TooltipModule } from 'primeng/tooltip';
import { FloatLabel } from 'primeng/floatlabel';
import { Message } from 'primeng/message';
import { MessageService } from 'primeng/api';

import { ApiService } from '../../../services/api.service';
import { SaveitemsService } from '../../../services/saveitems.service';
import { environment } from '../../../../environments/environment';

// ─────────────────────────────────────────────
// Types & constants
// ─────────────────────────────────────────────
const GST_RATE = 0.03;

type MakingType = 'percent' | 'fixed' | 'none';

interface PriceBreakup {
  metal: number;
  diamonds: number;
  stones: number;
  diamondWt: number;
  stoneWt: number;
  materials: number; // metal + diamonds + stones
  makingType: MakingType;
  makingPercent: number | null; // effective % (after discount), null if not %-based
  makingAmount: number;
  subtotal: number; // materials + making
  gst: number;
  total: number; // subtotal + gst
}

// ─────────────────────────────────────────────
// Pure helpers (no component state)
// ─────────────────────────────────────────────
const sumBy = (list: any[] | undefined, key: string): number =>
  (list || []).reduce((total, row) => total + (+row[key] || 0), 0);

/**
 * Builds the full price breakup for a product.
 * @param makingDiscountPct percentage points to reduce from the making % (gold only)
 */
function buildBreakup(item: any, makingDiscountPct = 0): PriceBreakup {
  const metal = +item.metal_amt || 0;
  const diamonds = sumBy(item.diamonds, 'dia_amt');
  const stones = sumBy(item.stones, 'stone_amt');
  const materials = metal + diamonds + stones;

  let makingType: MakingType = 'none';
  let makingPercent: number | null = null;
  let makingAmount = 0;

  if (item.making_charge && item.making_charge !== 0) {
    makingType = 'percent';
    makingPercent = Math.max(0, item.making_charge - makingDiscountPct);
    makingAmount = (materials * makingPercent) / 100;
  } else if (item.making_amt && item.making_amt !== 0) {
    makingType = 'fixed';
    makingAmount = item.making_amt;
  }

  const subtotal = materials + makingAmount;
  const gst = subtotal * GST_RATE;

  return {
    metal,
    diamonds,
    stones,
    diamondWt: sumBy(item.diamonds, 'dia_wt'),
    stoneWt: sumBy(item.stones, 'stone_wt'),
    materials,
    makingType,
    makingPercent,
    makingAmount,
    subtotal,
    gst,
    total: subtotal + gst,
  };
}

@Component({
  selector: 'app-view-details',
  imports: [
    TitleCasePipe,
    DecimalPipe,
    FormsModule,
    RouterLink,
    InputText,
    Card,
    ButtonModule,
    Drawer,
    TooltipModule,
    FloatLabel,
    Message,
  ],
  templateUrl: './view-details.component.html',
  styleUrl: './view-details.component.css',
})
export class ViewDetailsComponent implements OnInit {
  // ── Dependencies ──
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private apiService = inject(ApiService);
  private saveItemsService = inject(SaveitemsService);
  private messageService = inject(MessageService);

  // ── Product state ──
  searchResult = signal<any[]>([]);
  currentItem = computed(() => this.searchResult()[0] ?? null);
  productImageUrl = signal('');

  // ── Discount state ──
  userInput: string | number = '';
  /** gold: percentage points taken off the making % */
  makingDiscountPercent = signal(0);
  /** non-gold: flat amount off the grand total */
  flatDiscount = signal(0);

  // ── UI state ──
  visible = false;
  favIcon = signal(false);
  showIndicator = signal(false);
  placeholder = 'notfound.svg';

  // ── Favourite list state ──
  myChoiceList = signal<any[]>([]);

  grandTotal = computed(() =>
    this.myChoiceList().reduce((sum, i) => sum + (+i.final_price || 0), 0),
  );

  // ─────────────────────────────────────────
  // Derived pricing
  // ─────────────────────────────────────────
  isGold = computed(() =>
    (this.currentItem()?.product_category ?? '').toLowerCase().includes('gold'),
  );

  /** Price with no discount applied (used as the baseline for discount %) */
  originalPricing = computed<PriceBreakup | null>(() => {
    const item = this.currentItem();
    return item ? buildBreakup(item, 0) : null;
  });

  /** True when discount should be entered in % (gold with %-based making) */
  usesPercentDiscount = computed(
    () => this.isGold() && this.originalPricing()?.makingType === 'percent',
  );

  /** Price breakup including the making-% discount (gold) */
  pricing = computed<PriceBreakup | null>(() => {
    const item = this.currentItem();
    if (!item) return null;
    const discount = this.usesPercentDiscount()
      ? this.makingDiscountPercent()
      : 0;
    return buildBreakup(item, discount);
  });

  priceAfterDiscount = computed(() => {
    const p = this.pricing();
    if (!p) return 0;
    if (this.usesPercentDiscount()) return p.total;
    return Math.max(0, p.total - this.flatDiscount());
  });

  /** Effective discount on the total price, shown in the "Discount (in %)" row */
  // discountPercent = computed(() => {
  //   const original = this.originalPricing()?.total ?? 0;
  //   if (original <= 0) return 0;
  //   return ((original - this.priceAfterDiscount()) / original) * 100;
  // });

  // ─────────────────────────────────────────
  // Lifecycle
  // ─────────────────────────────────────────
  ngOnInit(): void {
    this.route.paramMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const jewel_code = params.get('jewel_code');
        if (!jewel_code) return;
        this.loadProduct(jewel_code);
      });

    this.getList();
  }

  // ─────────────────────────────────────────
  // Product loading
  // ─────────────────────────────────────────
  private loadProduct(jewel_code: string): void {
    this.resetDiscount();
    this.handleImageLookup(jewel_code);

    this.apiService.findProduct({ jewel_code }).subscribe({
      next: (res: any) => {
        if (!res || res.length === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `No product found for ${jewel_code}`,
          });
          return;
        }

        this.searchResult.set(res);
        this.getAlreadySavedItems(res[0]);
        this.getList();
      },
      error: (error) => console.log(error),
    });
  }

  private handleImageLookup(code: string): void {
    this.productImageUrl.set('');
    const url = `${environment.SYNC_IMAGE_URL}/${encodeURIComponent(code)}.jpg`;

    const img = new Image();
    img.onload = () => this.productImageUrl.set(img.src);
    img.onerror = () => this.productImageUrl.set('');
    img.src = url;
  }

  private getAlreadySavedItems(item: any): void {
    const savedItems = this.saveItemsService.getSavedList() || [];
    const exists = savedItems.some(
      (i: any) => i.jewel_code === item?.jewel_code,
    );
    this.favIcon.set(exists);
  }

  // ─────────────────────────────────────────
  // Discount
  // ─────────────────────────────────────────
  private resetDiscount(): void {
    this.userInput = '';
    this.makingDiscountPercent.set(0);
    this.flatDiscount.set(0);
  }

  ApplyDiscount(): void {
    const item = this.currentItem();
    if (!item) return;

    const value = Number(this.userInput) || 0;

    // Gold: discount is in % and reduces the making charge %
    if (this.usesPercentDiscount()) {
      this.applyMakingPercentDiscount(item, value);
    } else {
      this.applyFlatDiscount(value);
    }
  }

  private applyMakingPercentDiscount(item: any, percent: number): void {
    const maxPercent = item.making_charge;

    if (percent < 0 || percent > maxPercent) {
      this.makingDiscountPercent.set(0);
      this.userInput = '';
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Discount must be between 0 and ${maxPercent}% (the making charge)`,
      });
      return;
    }

    this.makingDiscountPercent.set(percent);
    this.afterDiscountApplied(percent > 0);
  }

  private applyFlatDiscount(amount: number): void {
    const total = this.pricing()?.total ?? 0;

    if (amount <= 0) {
      this.flatDiscount.set(0);
      return;
    }

    if (amount > total) {
      this.flatDiscount.set(0);
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Discount can't be greater than the total price (${total.toFixed(2)})`,
      });
      return;
    }

    this.flatDiscount.set(amount);
    this.afterDiscountApplied(true);
  }

  private afterDiscountApplied(show: boolean): void {
    // price changed, so the saved copy is outdated
    this.favIcon.set(false);
    if (show) {
      this.messageService.add({
        severity: 'success',
        summary: 'Success',
        detail: 'Discount applied successfully',
      });
    }
  }

  // ─────────────────────────────────────────
  // Save / favourites
  // ─────────────────────────────────────────
  finalize(): void {
    const item = this.currentItem();
    const pricing = this.pricing();
    if (!item || !pricing) return;

    const product = {
      ...item,
      final_price: this.priceAfterDiscount(),
      discount_amount: this.usesPercentDiscount() ? 0 : this.flatDiscount(),
      discount_percent: this.usesPercentDiscount()
        ? this.makingDiscountPercent()
        : 0,
      applied_making_percent: pricing.makingPercent,
    };

    this.saveItemsService.addRemoveItems(product);
    this.getList();
  }

  getList(): void {
    const savedItems = this.saveItemsService.getSavedList() || [];
    this.myChoiceList.set(savedItems);
    savedItems.forEach((item: any) => this.resolveProductImage(item));
  }

  private resolveProductImage(item: any): void {
    const url = `${environment.SYNC_IMAGE_URL}/${encodeURIComponent(item.jewel_code)}.jpg`;

    const img = new Image();
    img.onload = () => {
      item.product_image_url = img.src;
      // object was mutated inside the signal, so push a new array reference
      this.myChoiceList.set([...this.myChoiceList()]);
    };
    img.onerror = () => (item.product_image_url = '');
    img.src = url;
  }

  removeItemfromfavList(id: string): void {
    this.saveItemsService.removeItem(id);
    this.favIcon.set(false);
    this.getList();
  }
}
