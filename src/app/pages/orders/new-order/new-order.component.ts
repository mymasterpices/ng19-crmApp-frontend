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
  // ── NEW: accept a reference image URL from image-search ──────────────────
  // When passed, it auto-downloads the image and pre-fills the imageProduct field
  @Input() referenceImageUrl: string | null = null;
  @Input() referenceImageName: string = '';
  @Output() orderCreated = new EventEmitter<void>(); // emits after successful order

  uploadedFile: File | null = null;
  isSaving = signal<boolean>(false);
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
      karigari: [''],
      imageProduct: this.fb.control<File | null>(null),
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

    // Pre-fill image if already passed before ngOnInit
    if (this.referenceImageUrl) {
      this.loadReferenceImage(this.referenceImageUrl, this.referenceImageName);
    }
  }

  // ── NEW: watch for referenceImageUrl changes ──────────────────────────────
  ngOnChanges(changes: SimpleChanges) {
    if (changes['referenceImageUrl']?.currentValue) {
      this.loadReferenceImage(
        changes['referenceImageUrl'].currentValue,
        this.referenceImageName || 'reference-image.jpg',
      );
    }
  }

  // ── NEW: fetch the image URL and convert to File object ───────────────────
  private async loadReferenceImage(url: string, name: string) {
    try {
      const res = await fetch(url);
      const blob = await res.blob();
      const filename = name || 'reference-image.jpg';
      const file = new File([blob], filename, {
        type: blob.type || 'image/jpeg',
      });

      this.uploadedFile = file;
      this.productForm.patchValue({ imageProduct: file });
      this.productForm.get('imageProduct')?.updateValueAndValidity();

      // Show preview in custom image field
      this.imagePreviewUrl.set(
        url.startsWith('data:') ? url : URL.createObjectURL(blob),
      );
      console.log('✅ Reference image pre-filled:', filename);
    } catch (err) {
      console.warn('⚠️ Could not load reference image:', err);
    }
  }

  // Called by hidden <input type="file"> in the custom image field
  onHiddenFileChange(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (file) {
      this.uploadedFile = file;
      this.productForm.patchValue({ imageProduct: file });
      this.productForm.get('imageProduct')?.updateValueAndValidity();
      const reader = new FileReader();
      reader.onload = (e) =>
        this.imagePreviewUrl.set(e.target?.result as string);
      reader.readAsDataURL(file);
    }
  }

  removeImage() {
    this.uploadedFile = null;
    this.imagePreviewUrl.set(null);
    this.productForm.patchValue({ imageProduct: null });
  }

  // Original p-fileupload handlers
  onFileSelect(event: any) {
    const file = event.currentFiles[0];
    if (file) {
      this.uploadedFile = file;
      this.userSelectedFile.set(true); // hide the pre-selected banner
      requestAnimationFrame(() => {
        this.productForm.patchValue({ imageProduct: file });
      });
      this.productForm.get('imageProduct')?.updateValueAndValidity();
    }
  }

  onFileRemove() {
    this.uploadedFile = null;
    this.userSelectedFile.set(false);
    this.productForm.patchValue({ imageProduct: null });
  }

  karigarList: any[] = [];
  salespersonList: any[] = [];
  categoryList: any[] = [];

  getkarigarsList() {
    this._orderServices.getkarigarsList().subscribe({
      next: (res: any) => {
        this.karigarList = res || [];
        console.log('Karigars fetched:', this.karigarList);
      },
      error: (err) => {
        console.log('Error fetching karigars:', err.error?.message || err);
      },
    });
  }

  getKarigarName(id: string): string {
    if (!id) return '';
    // Match by _id and return the username
    const karigar = this.karigarList.find((k) => k._id === id);
    return karigar ? karigar.username : id;
  }

  getSalespersonList() {
    this._orderServices.getSalespersonList().subscribe({
      next: (res: any) => {
        this.salespersonList = res || [];
      },
    });
  }

  getSalespersonName(id: string): string {
    if (!id) return '';
    return this.salespersonList.find((s) => s._id === id)?.name || id;
  }

  getCategoryList() {
    this._orderServices.getCategoryList().subscribe({
      next: (res: any) => {
        this.categoryList = res || [];
      },
    });
  }

  getCategoryName(id: string): string {
    if (!id) return '';
    return this.categoryList.find((c) => c._id === id)?.name || id;
  }

  onSubmit() {
    if (this.productForm.valid) {
      this.isSaving.set(true);
      const formData = new FormData();

      if (this.uploadedFile) {
        formData.append(
          'productImage',
          this.uploadedFile,
          this.uploadedFile.name,
        );
      }

      Object.keys(this.productForm.controls).forEach((key) => {
        if (key === 'imageProduct') return;
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
          this.uploadedFile = null;
          this.imagePreviewUrl.set(null);
          this.userSelectedFile.set(false);
          this.orderCreated.emit(); // tells parent to close drawer
          console.log('Get saved new order PDF order#: ', res.data._id);
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
    } else {
      this.productForm.markAllAsTouched();
    }
  }

  getPDF(orderId: any) {
    const params = new HttpParams().set('id', orderId);
    this._orderServices.getOrders(params).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : [res];
        if (data.length > 0) {
          this._shareorderService.generateOrderPdf(data);
        }
      },
      error: (err: any) => {
        console.log('error while fetch data for pdf', err);
      },
    });
  }
}
