import { Component, inject, OnInit, signal } from '@angular/core';
import { DecimalPipe, TitleCasePipe } from '@angular/common';
import { SaveitemsService } from '../../../services/saveitems.service';
import { TableModule } from 'primeng/table';
import { environment } from '../../../../environments/environment';
import { ImageModule } from 'primeng/image';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-compare',
  imports: [
    TitleCasePipe,
    ImageModule,
    CardModule,
    TableModule,
    ButtonModule,
    RouterLink,
    DecimalPipe,
  ],
  templateUrl: './compare.component.html',
  styleUrl: './compare.component.css',
})
export class CompareComponent implements OnInit {
  private _saveditemservice = inject(SaveitemsService);

  // Make SavedItems reactive for Angular 20 control flow
  SavedItems = signal<any[]>([]);
  placeholder = 'public/imagenotfound.png';

  ngOnInit(): void {
    this.getSavedProductsList();
  }

  getSavedProductsList() {
    const productList = this._saveditemservice.getSavedList();
    if (productList && productList.length > 0) {
      // Set reactive signal
      this.SavedItems.set(productList);

      // Resolve product images dynamically
      this.SavedItems().forEach((item) => this.resolveProductImage(item));
    }
  }

  getTotalDiamondAmount(diamonds: any[]) {
    if (!diamonds) return 0;
    return diamonds.reduce((total, d) => total + (d.amount || 0), 0);
  }

  getTotalStoneAmount(stones: any[]) {
    if (!stones) return 0;
    return stones.reduce((total, s) => total + (s.amount || 0), 0);
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

  private resolveProductImage(item: any) {
    const code = item?.jewel_code;
    if (!code) {
      item.product_image_url = this.placeholder;
      return;
    }

    const prefix = code.match(/^[A-Za-z]+/)?.[0] || '';
    const baseUrl = `${environment.SYNC_IMAGE_URL}/${prefix}/${code}`;
    const extensions = ['jpg', 'jpeg', 'JPG', 'JPEG'];

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
    this._saveditemservice.removeItem(id);
    this.getSavedProductsList();
  }
}
