import { Component, inject, signal, OnInit } from '@angular/core';
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
export class NewOrderComponent implements OnInit {
  uploadedFile: File | null = null;
  isSaving = signal<boolean>(false);

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
  }

  karigarList: any[] = [];
  salespersonList: any[] = [];
  categoryList: any[] = [];

  //get karigars name list
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
    return this.karigarList.find((k) => k._id === id)?.name || id;
  }

  //get salesperson name list
  getSalespersonList() {
    this._orderServices.getSalespersonList().subscribe({
      next: (res: any) => {
        this.salespersonList = res || [];
        console.log('Salespersons fetched:', this.salespersonList);
      },
    });
  }

  getSalespersonName(id: string): string {
    if (!id) return '';
    return this.salespersonList.find((s) => s._id === id)?.name || id;
  }

  //get category name list
  getCategoryList() {
    this._orderServices.getCategoryList().subscribe({
      next: (res: any) => {
        this.categoryList = res || [];
        console.log('Categories fetched:', this.categoryList);
      },
    });
  }
  getCategoryName(id: string): string {
    if (!id) return '';
    return this.categoryList.find((c) => c._id === id)?.name || id;
  }

  // Use onSelect because we are not using PrimeNG's 'url' upload feature
  onFileSelect(event: any) {
    const file = event.currentFiles[0];
    if (file) {
      this.uploadedFile = file;
      // Update form control and trigger validation
      requestAnimationFrame(() => {
        this.productForm.patchValue({ imageProduct: file });
      });
      this.productForm.get('imageProduct')?.updateValueAndValidity();
      console.log('File captured:', file.name);
    }
  }

  onFileRemove() {
    this.uploadedFile = null;
    this.productForm.patchValue({ imageProduct: null });
  }

  onSubmit() {
    if (this.productForm.valid) {
      this.isSaving.set(true);
      const formData = new FormData();

      // 1. Append product image
      if (this.uploadedFile) {
        formData.append(
          'productImage',
          this.uploadedFile,
          this.uploadedFile.name,
        );
      }

      // 2. Append form fields (karigari is now just a string ID)
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
          this._shareorderService.generateOrderPdf(res);
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
}
