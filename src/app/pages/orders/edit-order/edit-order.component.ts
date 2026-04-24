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
  uploadedFile = signal<File | null>(null);
  isSaving = signal<boolean>(false);
  private destroy$ = new Subject<void>(); // For memory management

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

  /**
   * Sequence Optimization: Load metadata and Route ID in parallel
   */
  private loadInitialData() {
    // 1. Fetch dropdowns in parallel for speed
    forkJoin({
      karigars: this._orderServices.getkarigarsList(),
      sales: this._orderServices.getSalespersonList(),
      cats: this._orderServices.getCategoryList(),
    })
      .pipe(takeUntil(this.destroy$))
      .subscribe((res: any) => {
        this.karigarList.set(res.karigars);
        this.salespersonList.set(res.sales);
        this.categoryList.set(res.cats);
      });

    // 2. Handle Route Param & Fetch Data
    this._route.paramMap.pipe(takeUntil(this.destroy$)).subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.editOrderid.set(id);
        this.fetchOrderInfo(new HttpParams().set('id', id));
      }
    });
  }

  private fetchOrderInfo(params: HttpParams) {
    this._orderServices.getOrders(params).subscribe({
      next: (data: any) => {
        const order = Array.isArray(data) ? data[0] : data;
        if (order) {
          if (order.deliveryDate)
            order.deliveryDate = new Date(order.deliveryDate);
          this.editOrderNum.set(order.orderNumber);
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
  }

  // --- File Handlers ---
  onFileSelect(event: any) {
    this.uploadedFile.set(event.currentFiles[0]);
  }

  onFileRemove() {
    this.uploadedFile.set(null);
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
      if (['imageProduct', 'productImage'].includes(key)) return;

      let val = formValues[key];
      if (key === 'status' && val) val = val.toLowerCase();

      if (val !== null && val !== undefined && val !== '') {
        formData.append(
          key,
          val instanceof Date ? val.toISOString() : String(val),
        );
      }
    });

    // 2. Append file last
    const file = this.uploadedFile();
    if (file) formData.append('productImage', file, file.name);

    // 3. Execution
    this._orderServices.updateOrder(id, formData).subscribe({
      next: (res: any) => {
        this.isSaving.set(false);
        this._messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `Order ${this.editOrderNum()} saved`,
        });
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
        console.log('API Response:', res);
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
