import { LoginedUserService } from './../../../services/logined-user.service';
import { Component, inject, signal, ViewChild } from '@angular/core';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import { CommonModule, DecimalPipe, TitleCasePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabelModule } from 'primeng/floatlabel';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { TableModule } from 'primeng/table';
import { ApiService } from '../../../services/api.service';
import { DialogModule } from 'primeng/dialog';
import { FileUpload } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { environment } from '../../../../environments/environment';
import { InputGroup } from 'primeng/inputgroup';
import { InputGroupAddonModule } from 'primeng/inputgroupaddon';
import { QrScannerComponent } from './qr-scanner/qr-scanner.component';
import { Drawer } from 'primeng/drawer';

interface UploadEvent {
  files: File[];
}

@Component({
  selector: 'app-products-view-all',
  imports: [
    ReactiveFormsModule,
    TitleCasePipe,
    RouterLink,
    ButtonModule,
    CardModule,
    InputTextModule,
    FloatLabelModule,
    IconFieldModule,
    InputIconModule,
    TableModule,
    DialogModule,
    FileUpload,
    DecimalPipe,
    InputGroupAddonModule,
    InputGroup,
    CommonModule,
    QrScannerComponent,
  ],
  templateUrl: './products-view-all.component.html',
  styleUrl: './products-view-all.component.css',
})
export class ProductsViewAllComponent {
  //get scanned result
  lastScanned: string | null = null;

  @ViewChild('qrScanner') qrScanner!: QrScannerComponent;

  
  onQrScanned(result: string) {
    this.lastScanned = result;
    // Optionally auto-trigger search when QR is scanned
    this.search();
    console.log('Parent received:', result);
  }

  private apiService = inject(ApiService);
  private saveItemsService = inject(ApiService);
  private _loginedUserService = inject(LoginedUserService);

  loginedUser = this._loginedUserService.getUserName();

  constructor(private messageService: MessageService) {}

  searchResult = signal<any>([]);
  myChoiceList = signal<any>([]);

  productImageUrl = signal(''); // Signal for image URL
  isImageFound = signal(false); // Add this

  visible: boolean = false;

  scanner: boolean = false;

  searchFrom = new FormGroup({
    jewel_code: new FormControl('', [Validators.required]),
  });

  search() {
    // Determine the value to search: scanned QR or form input
    const searchValue = this.lastScanned || this.searchFrom.value.jewel_code;

    // If no value, exit
    if (!searchValue) return;

    const changeToUppercase = searchValue.toUpperCase();
    console.log('Searching for:', changeToUppercase);

    const searchNumber = { jewel_code: changeToUppercase };

    this.apiService.findProduct(searchNumber).subscribe(
      (res: any) => {
        if (res.length === 0) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `No product found! for ${changeToUppercase}`,
          });
        } else {
          const code = searchNumber.jewel_code || '';
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

          // Log the **actual value** of the signal
          console.log('Product image url::', this.productImageUrl());

          this.searchResult.set(res);
        }
      },
      (error) => {
        console.error('API Error:', error);
      }
    );
  }

  getList(): void {
    const savedItems = this.saveItemsService.getSavedList();
    if (savedItems) {
      this.myChoiceList.set(savedItems);
    }
  }

  selectedFile: File | null = null;
  isUploading = signal('Upload');

  csvForm: FormGroup = new FormGroup({
    csv_file: new FormControl<File | null>(null, Validators.required),
  });

  onFileChange(event: UploadEvent) {
    const input = event.files[0];
    if (!input) return;

    const file = input;
    if (!file.name.endsWith('.csv')) {
      this.messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Please upload a CSV file',
      });
      return;
    }

    this.selectedFile = file;
    this.csvForm.patchValue({ csv_file: file });

    this.messageService.add({
      severity: 'info',
      summary: 'File Selected',
      detail: file.name,
    });
  }

  onSubmit() {
    if (!this.selectedFile) {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing CSV file',
        detail: 'Please select a CSV file',
      });
      return;
    }

    this.isUploading.set('Processing...');

    const formData = new FormData();
    formData.append('file', this.selectedFile);

    this.apiService.uploadCsvFile(formData).subscribe({
      next: (res: any) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Upload Complete',
          detail: `${res.insertedCount || 0} products imported successfully`,
        });
        this.isUploading.set('Upload');
        this.csvForm.reset();
        this.visible = false;
        this.selectedFile = null;
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: err.error?.message || 'Please try again',
        });
        this.isUploading.set('Upload');
      },
    });
  }

  //scanner code strat here
}
