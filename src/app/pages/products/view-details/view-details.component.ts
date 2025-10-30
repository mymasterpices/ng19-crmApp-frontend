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

      let imageFound = false;
      for (const ext of extensions) {
        const img = new Image();
        img.src = `${baseUrl}.${ext}`;
        img.onload = () => {
          if (!imageFound) {
            this.isImageFound.set(true); // set signal when image is loaded
            this.productImageUrl.set(img.src);
            imageFound = true;
          }
        };
      }

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
          this.priceAfterDiscount.set(this.item.mrp);
          this.getAlreadySavedItems(this.item);
          //shiow indicator if product saved in locall

          this.getList();
        },
        (error) => console.log(error)
      );

      //create a dynamic image URL
    });

    this.getList();
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

  calculate(): void {
    const currentItem = this.searchResult()[0];
    if (!currentItem) return;

    if (this.userInput > 0) {
      if (this.userInput > currentItem.mrp) {
        this.priceAfterDiscount.set(currentItem.mrp);

        //show error message
        this._messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: `Discount can't be greater than product price`,
        });
        return;
      } else {
        this.priceAfterDiscount.set(currentItem.mrp - this.userInput);
        this.favIcon.set(false);
        this._messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: `Discount applied sucessfully`,
        });
      }
    }
    const discountPercent =
      this.userInput <= currentItem.mrp
        ? (this.userInput / currentItem.mrp) * 100
        : 0;

    this.discountPercent.set(discountPercent);
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
