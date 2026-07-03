import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';

import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { InputText } from 'primeng/inputtext';
import { Card } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { Drawer } from 'primeng/drawer';
import { ApiService } from '../../../services/api.service';
import { SaveitemsService } from '../../../services/saveitems.service';
import { TooltipModule } from 'primeng/tooltip';
import { environment } from '../../../../environments/environment';
import { MessageService } from 'primeng/api';
import { ImageModule } from 'primeng/image';
import { FloatLabel } from 'primeng/floatlabel';

@Component({
  selector: 'app-view-details',
  imports: [
    TitleCasePipe,
    FormsModule,
    RouterLink,
    InputText,
    Card,
    ButtonModule,
    Drawer,
    TooltipModule,
    ImageModule,
    FloatLabel,
    DecimalPipe,
  ],
  templateUrl: './view-details.component.html',
  styleUrl: './view-details.component.css',
})
export class ViewDetailsComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private apiService = inject(ApiService);
  private _saveItemsService = inject(SaveitemsService);

  private _messageService = inject(MessageService);

  toastMessage = signal<string>('');
  searchResult = signal<any>([]);
  userInput: number = 0;
  priceAfterDiscount = signal<number>(0);
  discountPercent = signal<number>(0);

  showIndicator = signal(false);

  productImageUrl = signal('');
  savefavlistProductimgURL = signal('');

  item: any;
  visible: boolean = false;
  favIcon = signal(false);
  isImageFound = signal(false);

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const jewel_code = params.get('jewel_code');
      if (!jewel_code) return;

      const searchTagNumber = { jewel_code };

      const code = searchTagNumber.jewel_code || '';

      //create a dynamic image URL
      this.handleImageLookup(code);
      this.apiService.findProduct(searchTagNumber).subscribe(
        (res: any) => {
          if (res.length === 0) {
            this._messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: `No product found for ${jewel_code}`,
            });
            return;
          }

          this.item = res[0];
          this.searchResult.set(res);
          this.priceAfterDiscount.set(this.getGrandTotal(this.item));
          this.getAlreadySavedItems(this.item);
          //shiow indicator if product saved in locall

          this.getList();
        },
        (error) => console.log(error),
      );
    });

    this.getList();
  }

  private handleImageLookup(code: string) {
    this.productImageUrl.set('');
    const url = `${environment.SYNC_IMAGE_URL}/${encodeURIComponent(code)}.jpg`;
    console.log('Trying image URL:', url);

    const img = new Image();
    img.onload = () => {
      console.log('loaded');
      this.productImageUrl.set(img.src);
    };
    img.onerror = () => {
      console.log('failed');
      this.productImageUrl.set('');
    };
    img.src = url;
  }

  getAlreadySavedItems(item: any) {
    const savedItems = this._saveItemsService.getSavedList();

    if (item && item.jewel_code) {
      const exists =
        savedItems.findIndex((i: any) => i.jewel_code === item.jewel_code) !==
        -1;

      // Show filled icon for already saved items/product
      if (exists) {
        this.favIcon.set(true);
      }

      console.log(exists ? '✅ Already saved:' : 'ℹ️ Not saved yet:', item._id);
    } else {
      console.warn('⚠️ item is undefined or missing _id');
    }
  }

  getMakingChargeAmount(item: any): number {
    // 1. Calculate the base material cost once
    const materialSubtotal =
      (item.metal_amt || 0) +
      this.getTotalDiamondAmount(item.diamonds || []) +
      this.getTotalStoneAmount(item.stones || []);

    // 2. Check if it's a Percentage based charge
    if (item.making_charge && item.making_charge !== 0) {
      // Formula: (Material Cost * Percentage) / 100
      return (materialSubtotal * item.making_charge) / 100;
    }

    // 3. Check if it's a Flat Amount based charge
    else if (item.making_amt && item.making_amt !== 0) {
      // Usually, making_amt is a fixed value (e.g., $50),
      // so we return it directly.
      return item.making_amt;
    }

    // 4. Default to 0 if no charges exist
    return 0;
  }

  getTotalDiamondAmount(diamonds: any[]) {
    if (!diamonds) return 0;
    return diamonds.reduce((total, d) => total + (d.amount || 0), 0);
  }

  getTotaldiamondWeight(diamonds: any[]) {
    if (!diamonds) return 0;
    return diamonds.reduce((total, d) => total + (d.weight || 0), 0);
  }

  getTotalStoneAmount(stones: any[]) {
    if (!stones) return 0;
    return stones.reduce((total, s) => total + (s.colour_stone_amt || 0), 0);
  }

  calculateGST(item: any): number {
    // 1. Get the base material sum
    const materialSubtotal =
      (item.metal_amt || 0) +
      this.getTotalDiamondAmount(item.diamonds || []) +
      this.getTotalStoneAmount(item.stones || []);

    // 2. Calculate Making Charges (as per your formula: (subtotal * charge) / 100)
    const makingChargeAmount =
      (materialSubtotal * (item.making_charge || 0)) / 100;

    // 3. Calculate 3% GST on the sum of both
    const totalBeforeTax = materialSubtotal + makingChargeAmount;

    return totalBeforeTax * 0.03;
  }

  getGrandTotal(item: any): number {
    const materials =
      (item.metal_amt || 0) +
      this.getTotalDiamondAmount(item.diamonds) +
      this.getTotalStoneAmount(item.stones);

    const making = this.getMakingChargeAmount(item);

    const subtotal = materials + making;
    const gst = subtotal * 0.03;

    return subtotal + gst;
  }

  ApplyDiscount(): void {
    const currentItem = this.searchResult()[0];
    if (!currentItem) return;

    // 1. Store the grand total in a variable for performance and consistency
    const totalAmount = this.getGrandTotal(currentItem);
    const discountAmount = this.userInput || 0;

    // 2. Handle Case: No discount entered
    if (discountAmount <= 0) {
      this.priceAfterDiscount.set(totalAmount);
      this.discountPercent.set(0);
      return;
    }

    // 3. Handle Case: Discount is too high
    if (discountAmount > totalAmount) {
      this.priceAfterDiscount.set(totalAmount);
      this.discountPercent.set(0);

      this._messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: `Discount can't be greater than the total price (${totalAmount.toFixed(
          2,
        )})`,
      });
      return;
    }

    // 4. Success Case: Calculate Discounted Price
    const finalPrice = totalAmount - discountAmount;
    this.priceAfterDiscount.set(finalPrice);

    // 5. Calculate Percentage based on the Grand Total
    const percent = (discountAmount / totalAmount) * 100;
    this.discountPercent.set(percent);

    this.favIcon.set(false);
    this._messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: `Discount applied successfully`,
    });
  }

  finalize(): void {
    const product = this.searchResult()[0];
    if (!product) return;

    product.final_price = this.priceAfterDiscount();
    product.discount_amount = this.userInput;

    this._saveItemsService.addRemoveItems(product);

    this.getList();
  }

  removeItemFromLocalStorage(product: string): void {
    this._saveItemsService.addRemoveItems(product);
  }

  myChoiceList = signal<any[]>([]);
  placeholder = 'notfound.svg';
  getList() {
    const savedItems = this._saveItemsService.getSavedList();
    if (savedItems && savedItems.length > 0) {
      this.myChoiceList.set(savedItems);

      // Resolve product images dynamically
      this.myChoiceList().forEach((item) => this.resolveProductImage(item));
    }
  }

  private resolveProductImage(item: any) {
    const code = item?.jewel_code;
    if (!code) {
      item.product_image_url = this.placeholder;
      return;
    }

    let prefix = code.match(/^[A-Za-z]+/)?.[0] || '';

    // Special case: DB1–DB8
    if (/^DB[1-8]/i.test(code)) {
      prefix = code.substring(0, 3).toUpperCase(); // "DB1" from "DB100007"
    } else if (/^[Bb][1-8]/.test(code)) {
      prefix = code.substring(0, 2).toUpperCase(); // "B1" from "B100007"
    } else {
      prefix = prefix.toUpperCase(); // Normal prefix
    }

    const extensions = ['jpg', 'jpeg', 'JPG', 'JPEG'];
    const baseUrl = `${environment.SYNC_IMAGE_URL}/${prefix}/${code}`;

    let found = false;
    for (const ext of extensions) {
      const img = new Image();
      const testUrl = `${baseUrl}.${ext}`;
      img.onload = () => {
        if (!found) {
          found = true;
          item.product_image_url = testUrl;
        }
      };

      img.onerror = () => {
        if (!found && ext === extensions[extensions.length - 1]) {
          item.product_image_url = this.placeholder;
        }
      };

      img.src = testUrl;
    }
  }
  removeItemfromfavList(id: string) {
    this._saveItemsService.removeItem(id);
    //reset icon
    this.favIcon.set(false);
    this.getList();
  }
}
