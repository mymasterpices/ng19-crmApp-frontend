import { Component, inject, signal, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { CommonModule, DecimalPipe } from '@angular/common';
import { RouterLink } from '@angular/router';

// PrimeNG Imports
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';

// Services & Scanner
import { ApiService } from '../../../services/api.service';
import { environment } from '../../../../environments/environment';
import { AuthService } from '../../../services/auth.service';

interface UploadEvent {
  files: File[];
}

@Component({
  selector: 'app-products-view-all',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    FloatLabelModule,
    IconFieldModule,
    InputIconModule,
    TableModule,
    DialogModule,
    FileUploadModule,
    DecimalPipe,
    InputGroupModule,
    InputGroupAddonModule,
  ],
  templateUrl: './products-view-all.component.html',
  styleUrl: './products-view-all.component.css',
})
export class ProductsViewAllComponent {
  // --- Dependency Injection ---
  private _apiService = inject(ApiService);
  private _authService = inject(AuthService);
  private _messageService = inject(MessageService);

  // --- State Management (Signals) ---
  searchResult = signal<any[]>([]);
  myChoiceList = signal<any[]>([]);
  productImageUrl = signal<string>('');
  isImageFound = signal<boolean>(false);
  isUploading = signal<string>('Upload');

  // --- Component Variables ---
  loginedUser = this._authService.getUserName();
  visible: boolean = false; // CSV upload dialog
  selectedFile: File | null = null;
  lastScanned: string | null = null;

  searchFrom = new FormGroup({
    jewel_code: new FormControl('', [Validators.required]),
  });

  csvForm = new FormGroup({
    csv_file: new FormControl<File | null>(null, Validators.required),
  });

  // --- Search & Image Logic ---
  search() {
    const searchValue =
      this.searchFrom.get('jewel_code')?.value || this.lastScanned;
    if (!searchValue) return;

    const term = searchValue.toUpperCase().trim();
    console.log('Searching for:', term);

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
          this.handleImageLookup(term);
          this.searchResult.set(Array.isArray(res) ? res : [res]);
        }
      },
      error: (err) => console.error('Search API Error:', err),
    });
  }

  private handleImageLookup(code: string) {
    let prefix = code.match(/^[A-Za-z]+/)?.[0] || '';

    // Jewelry Specific Prefix Logic
    if (/^DB[1-8]/i.test(code)) {
      prefix = code.substring(0, 3).toUpperCase();
    } else if (/^[Bb][1-8]/.test(code)) {
      prefix = code.substring(0, 2).toUpperCase();
    } else {
      prefix = prefix.toUpperCase();
    }

    const extensions = ['jpg', 'jpeg', 'JPG', 'JPEG'];
    const baseUrl = `${environment.SYNC_IMAGE_URL}/${prefix}/${code}`;

    this.isImageFound.set(false);
    for (const ext of extensions) {
      const img = new Image();
      img.src = `${baseUrl}.${ext}`;
      img.onload = () => {
        if (!this.isImageFound()) {
          this.isImageFound.set(true);
          this.productImageUrl.set(img.src);
        }
      };
    }
  }

  // --- Calculation Methods ---
  getTotalDiamondAmount(diamonds: any[]): number {
    return (diamonds || []).reduce((total, d) => total + (d.amount || 0), 0);
  }
  getTotaldiamondWeight(diamonds: any[]): number {
    return (diamonds || []).reduce((total, d) => total + (d.weight || 0), 0);
  }

  getTotalStoneAmount(stones: any[]): number {
    return (stones || []).reduce(
      (total, s) => total + (s.colour_stone_amt || 0),
      0,
    );
  }

  getMakingChargeAmount(item: any): number {
    const materialSubtotal =
      (item.metal_amt || 0) +
      this.getTotalDiamondAmount(item.diamonds) +
      this.getTotalStoneAmount(item.stones);

    if (item.making_charge) {
      return (materialSubtotal * item.making_charge) / 100;
    } else if (item.making_amt) {
      return item.making_amt;
    }
    return 0;
  }

  getGrandTotal(item: any): number {
    const materials =
      (item.metal_amt || 0) +
      this.getTotalDiamondAmount(item.diamonds) +
      this.getTotalStoneAmount(item.stones);
    const making = this.getMakingChargeAmount(item);
    const subtotal = materials + making;
    return subtotal + subtotal * 0.03; // Total + 3% GST
  }

  // --- CSV File Operations ---
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
          detail: 'Imported successfully',
        });
        this.isUploading.set('Upload');
        this.visible = false;
        this.selectedFile = null;
      },
      error: (err) => {
        this._messageService.add({
          severity: 'error',
          summary: 'Failed',
          detail: 'Check CSV format',
        });
        this.isUploading.set('Upload');
      },
    });
  }
}
