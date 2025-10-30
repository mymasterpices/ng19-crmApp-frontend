import { Component, inject, OnInit, signal } from '@angular/core';
import { TitleCasePipe } from '@angular/common';
import { SaveitemsService } from '../../../services/saveitems.service';
import { TableModule } from 'primeng/table';
import { environment } from '../../../../environments/environment';
import { ImageModule } from 'primeng/image';
import { CardModule } from 'primeng/card';
import { ButtonModule } from 'primeng/button';

@Component({
  selector: 'app-compare',
  imports: [TitleCasePipe, ImageModule, CardModule, TableModule, ButtonModule],
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
