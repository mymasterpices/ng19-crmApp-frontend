import { Component, inject, signal, OnInit, OnDestroy } from '@angular/core';
import {
  FormBuilder,
  FormGroup,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { MessageService } from 'primeng/api';
import { HttpParams } from '@angular/common/http';
import { forkJoin, Subject, takeUntil } from 'rxjs';

// PrimeNG & UI Imports
import { ToastModule } from 'primeng/toast';
import { ButtonModule } from 'primeng/button';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { FloatLabel } from 'primeng/floatlabel';
import { FileUploadModule } from 'primeng/fileupload';
import { SelectModule } from 'primeng/select';

import { OrderServices } from '../../../services/orders/order-services';
import { ShareOrderService } from '../../../services/orders/share-order.service';
import { CardModule } from 'primeng/card';

@Component({
  selector: 'app-edit-order',
  standalone: true,
  imports: [
    CommonModule,
    ToastModule,
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
    CardModule,
  ],
  templateUrl: './edit-order.component.html',
  styleUrl: './edit-order.component.css',
})
export class EditOrderComponent implements OnInit, OnDestroy {
  // --- Injections ---
  private _orderServices = inject(OrderServices);
  private _route = inject(ActivatedRoute);
  private _messageService = inject(MessageService);
  private _shareOrderService = inject(ShareOrderService);
  private fb = inject(FormBuilder);

  // --- State Management ---
  productForm!: FormGroup;

  // ✅ Changed to array to allow multiple new file selections
  uploadedFiles = signal<File[]>([]);
  // ✅ Keeps track of paths currently stored in the DB
  existingImages = signal<string[]>([]);

  isSaving = signal<boolean>(false);
  private destroy$ = new Subject<void>();

  // --- Data Signals ---
  editOrderNum = signal<string | null>(null);
  editOrderid = signal<string | null>(null);
  karigarList = signal<any[]>([]);
  salespersonList = signal<any[]>([]);
  categoryList = signal<any[]>([]);

  ngOnInit() {
    this.initForm();
    this.loadInitialData();
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  private initForm() {
    this.productForm = this.fb.group({
      party: [''],
      karigari: [''],
      imageProduct: [null],
      deliveryDate: [null],
      quantity: [null],
      salesperson: [''],
      goldWeight: [null],
      gatiOrderNo: [''],
      itemCategory: [''],
      purity: [''],
      goldColor: [''],
      diamondDetails: [''],
      stoneDetails: [''],
      productCode: [''],
      size: [''],
      remarks: [''],
      status: ['issued'],
    });
  }

  private loadInitialData() {
    this._route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (!id) return;

      this.editOrderid.set(id);

      forkJoin({
        karigars: this._orderServices.getkarigarsList('karigar', 'active'),
        sales: this._orderServices.getSalespersonList('user', 'active'),
        cats: this._orderServices.getCategoryList(),
        order: this._orderServices.getOrders(new HttpParams().set('id', id)),
      })
        .pipe(takeUntil(this.destroy$))
        .subscribe({
          next: (res: any) => {
            this.karigarList.set(res.karigars);
            this.salespersonList.set(res.sales);
            this.categoryList.set(res.cats);

            const order = Array.isArray(res.order) ? res.order[0] : res.order;
            if (order) {
              if (order.deliveryDate)
                order.deliveryDate = new Date(order.deliveryDate);

              this.editOrderNum.set(order.orderNumber);

              // ✅ Save existing image strings array to display on UI and pass back
              if (order.imageProduct) {
                this.existingImages.set(order.imageProduct);
              }

              this.productForm.patchValue(order);
            }
          },
          error: () =>
            this._messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: 'Could not load order details',
            }),
        });
    });
  }

  // --- File Handlers ---
  onFileSelect(event: any) {
    // ✅ Collect all chosen files into the array
    this.uploadedFiles.set(event.currentFiles);
  }

  onFileRemove(event: any) {
    this.uploadedFiles.set(
      this.uploadedFiles().filter((f) => f !== event.file),
    );
  }

  // ✅ Call this from UI template if you want to let users delete an old image
  removeExistingImage(index: number) {
    const updated = [...this.existingImages()];
    updated.splice(index, 1);
    this.existingImages.set(updated);
  }

  // --- Submission Logic ---
  onSubmit() {
    const id = this.editOrderid();
    if (!id)
      return this._messageService.add({
        severity: 'error',
        summary: 'Missing ID',
        detail: 'No Order ID found',
      });

    this.isSaving.set(true);
    const formData = new FormData();
    const formValues = this.productForm.getRawValue();

    // 1. Efficiently append text fields
    Object.keys(formValues).forEach((key) => {
      if (key === 'imageProduct') return;

      let val = formValues[key];
      if (key === 'status' && val) val = val.toLowerCase();

      if (val !== null && val !== undefined && val !== '') {
        formData.append(
          key,
          val instanceof Date ? val.toISOString() : String(val),
        );
      }
    });

    // 2. ✅ Pass down retained old image paths as a JSON string or individual strings
    // This allows the backend to know which files should be kept
    formData.append('retainedImages', JSON.stringify(this.existingImages()));

    // 3. ✅ Append all new files to the array
    const files = this.uploadedFiles();
    files.forEach((file) => {
      formData.append('imageProduct', file, file.name);
    });

    // 4. Execution
    this._orderServices.updateOrder(id, formData).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        this._messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `Order ${this.editOrderNum()} saved`,
        });

        // Update local tracking state with backend's response
        if (res.data && res.data.imageProduct) {
          this.existingImages.set(res.data.imageProduct);
          this.uploadedFiles.set([]); // Clear upload queue
        }
      },
      error: (err) => {
        this.isSaving.set(false);
        this._messageService.add({
          severity: 'error',
          summary: 'Update Failed',
          detail: err.error?.message || 'Server Error',
        });
      },
    });
  }

  getPDF(orderId: any) {
    const params = new HttpParams().set('id', orderId);
    this._orderServices.getOrders(params).subscribe({
      next: (res: any) => {
        const data = Array.isArray(res) ? res : [res];
        if (data.length > 0) {
          this._shareOrderService.generateOrderPdf(data);
        } else {
          console.warn('No order found for this ID');
        }
      },
      error: (err: any) => {
        console.log('error while fetch data for pdf', err);
      },
    });
  }
}
