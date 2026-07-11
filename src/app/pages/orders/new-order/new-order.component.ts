import {
  Component,
  inject,
  signal,
  OnInit,
  Input,
  OnChanges,
  SimpleChanges,
  Output,
  EventEmitter,
} from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { FileUploadModule } from 'primeng/fileupload';
import { CommonModule } from '@angular/common';
import { OrderServices } from '../../../services/orders/order-services';
import { MessageService } from 'primeng/api';
import { SelectModule } from 'primeng/select';
import { ShareOrderService } from '../../../services/orders/share-order.service';
import { HttpParams } from '@angular/common/http';

@Component({
  selector: 'app-new-order',
  imports: [
    CommonModule,
    ButtonModule,
    InputNumberModule,
    DatePickerModule,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    FloatLabel,
    FileUploadModule,
    SelectModule,
    FormsModule,
  ],
  templateUrl: './new-order.component.html',
  styleUrl: './new-order.component.css',
})
export class NewOrderComponent implements OnInit, OnChanges {
  @Input() referenceImageUrl: string | null = null;
  @Input() referenceImageName: string = '';
  @Output() orderCreated = new EventEmitter<void>();

  // ✅ Multiple files support
  uploadedFiles = signal<File[]>([]);
  previewUrls = signal<{ name: string; url: string }[]>([]);
  isSaving = signal<boolean>(false);

  // Keep for backward compat with reference image pre-fill
  imagePreviewUrl = signal<string | null>(null);
  userSelectedFile = signal<boolean>(false);

  private _orderServices = inject(OrderServices);
  private _messageService = inject(MessageService);
  private _shareorderService = inject(ShareOrderService);
  private fb = inject(FormBuilder);

  productForm!: FormGroup;

  ngOnInit() {
    this.productForm = this.fb.group({
      party: ['', Validators.required],
      karigari: ['', Validators.required],
      deliveryDate: [null, Validators.required],
      quantity: [1, [Validators.required, Validators.min(1)]],
      salesperson: [''],
      goldWeight: [null, Validators.required],
      gatiOrderNo: [''],
      itemCategory: ['', Validators.required],
      purity: ['', Validators.required],
      goldColor: [''],
      diamondDetails: [''],
      stoneDetails: [''],
      productCode: [''],
      size: [''],
      remarks: [''],
    });

    this.getkarigarsList();
    this.getSalespersonList();
    this.getCategoryList();

    if (this.referenceImageUrl) {
      this.loadReferenceImage(this.referenceImageUrl, this.referenceImageName);
    }
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['referenceImageUrl']?.currentValue) {
      this.loadReferenceImage(
        changes['referenceImageUrl'].currentValue,
        this.referenceImageName || 'reference-image.jpg',
      );
    }
  }

  // ── Reference image pre-fill ───────────────────────────────
  private async loadReferenceImage(url: string, name: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const filename = name || 'reference-image.jpg';
      const file = new File([blob], filename, {
        type: blob.type || 'image/jpeg',
      });

      // Add to uploaded files list
      this.uploadedFiles.update((files) => [...files, file]);
      this.previewUrls.update((urls) => [
        ...urls,
        { name: filename, url: URL.createObjectURL(blob) },
      ]);
      this.imagePreviewUrl.set(URL.createObjectURL(blob));
      console.log('✅ Reference image pre-filled:', filename);
    } catch (err) {
      console.warn('⚠️ Could not load reference image:', err);
    }
  }

  // ── PrimeNG p-fileupload handlers ──────────────────────────
  onFileSelect(event: any) {
    const newFiles: File[] = event.currentFiles;
    if (!newFiles?.length) return;

    // Merge new files with existing
    this.uploadedFiles.update((existing) => {
      const existingNames = new Set(existing.map((f) => f.name));
      const unique = newFiles.filter((f) => !existingNames.has(f.name));
      return [...existing, ...unique];
    });

    // Generate previews for new files
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        this.previewUrls.update((urls) => {
          const alreadyExists = urls.some((u) => u.name === file.name);
          if (alreadyExists) return urls;
          return [
            ...urls,
            { name: file.name, url: e.target?.result as string },
          ];
        });
      };
      reader.readAsDataURL(file);
    });

    this.userSelectedFile.set(true);
  }

  onFileRemove() {
    // PrimeNG removes one at a time — reset all to stay in sync
    this.uploadedFiles.set([]);
    this.previewUrls.set([]);
    this.userSelectedFile.set(false);
    this.imagePreviewUrl.set(null);
  }

  // ✅ Remove a specific image from preview list
  removeImage(index: number) {
    this.uploadedFiles.update((files) => files.filter((_, i) => i !== index));
    this.previewUrls.update((urls) => urls.filter((_, i) => i !== index));
    if (this.uploadedFiles().length === 0) {
      this.imagePreviewUrl.set(null);
      this.userSelectedFile.set(false);
    }
  }

  // ── Lists ──────────────────────────────────────────────────
  karigarList: any[] = [];
  salespersonList: any[] = [];
  categoryList: any[] = [];

  getkarigarsList() {
    this._orderServices.getkarigarsList('karigar', 'active').subscribe({
      next: (res: any) => (this.karigarList = res || []),
      error: (err) => console.error('Karigars fetch error:', err),
    });
  }

  getSalespersonList() {
    this._orderServices.getSalespersonList('user', 'active').subscribe({
      next: (res: any) => (this.salespersonList = res || []),
    });
  }

  getCategoryList() {
    this._orderServices.getCategoryList().subscribe({
      next: (res: any) => (this.categoryList = res || []),
    });
  }

  getKarigarName(id: string): string {
    return this.karigarList.find((k) => k._id === id)?.username || id || '';
  }

  getSalespersonName(id: string): string {
    return this.salespersonList.find((s) => s._id === id)?.name || id || '';
  }

  getCategoryName(id: string): string {
    return this.categoryList.find((c) => c._id === id)?.name || id || '';
  }

  // ── Submit ─────────────────────────────────────────────────
  onSubmit() {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      return;
    }

    if (this.uploadedFiles().length === 0) {
      this._messageService.add({
        severity: 'warn',
        summary: 'No Image',
        detail: 'Please select at least one image',
      });
      return;
    }

    this.isSaving.set(true);
    const formData = new FormData();

    // ✅ Append all images with same field name "productImages"
    this.uploadedFiles().forEach((file) => {
      formData.append('imageProduct', file, file.name);
    });

    // Append all other form fields
    Object.keys(this.productForm.controls).forEach((key) => {
      const value = this.productForm.get(key)?.value;
      if (value === null || value === undefined) return;
      formData.append(
        key,
        value instanceof Date ? value.toISOString() : value.toString(),
      );
    });

    this._orderServices.createOrder(formData).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        this._messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Order Created Successfully',
        });
        this.productForm.reset({ quantity: 1 });
        this.uploadedFiles.set([]);
        this.previewUrls.set([]);
        this.imagePreviewUrl.set(null);
        this.userSelectedFile.set(false);
        this.orderCreated.emit();
        this.getPDF(res.data._id);
      },
      error: (err) => {
        this.isSaving.set(false);
        this._messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Save Failed',
        });
      },
    });
  }

  getPDF(orderId: any) {
    const params = new HttpParams().set('id', orderId);
    this._orderServices.getOrders(params).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : [res];
        if (data.length > 0) this._shareorderService.generateOrderPdf(data);
      },
      error: (err) => console.error('PDF fetch error:', err),
    });
  }
}
