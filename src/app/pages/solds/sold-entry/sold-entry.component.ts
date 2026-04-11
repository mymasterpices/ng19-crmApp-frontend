import { Component, inject, Input, OnInit, signal } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import {
  FormArray,
  FormBuilder,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { DatePicker } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { FileUpload } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../../services/api.service';
import { TooltipModule } from 'primeng/tooltip';
import { CardModule } from 'primeng/card';
import { RouterLink } from '@angular/router';
import { CheckboxModule } from 'primeng/checkbox';
import { TableModule } from 'primeng/table';

interface UploadEvent {
  files: File[];
}

@Component({
  selector: 'app-sold-entry',
  imports: [
    StepperModule,
    ButtonModule,
    InputTextModule,
    CommonModule,
    FormsModule,
    FloatLabel,
    DatePicker,
    InputNumberModule,
    FileUpload,
    ReactiveFormsModule,
    TooltipModule,
    CardModule,
    RouterLink,
    CheckboxModule,
    TableModule,
  ],
  templateUrl: './sold-entry.component.html',
  styleUrl: './sold-entry.component.css',
})
export class SoldEntryComponent implements OnInit {
  @Input() selectedItemId: string | null = null;

  private messageService = inject(MessageService);
  private apiService = inject(ApiService);
  private fb = inject(FormBuilder);

  activeStep: number = 1;
  // ✅ In .ts — rename to isSwarnteras, starts false
  isSwarnteras = signal<boolean>(false);

  soldEntryFrom = this.fb.group({
    full_name: ['', [Validators.required, Validators.minLength(3)]],
    mobile: [''],
    email: [''],
    birthday: [''],
    anniversary: [''],
    isSwarnteras: [false],
    swanrAmount: [null],
    products: this.fb.array([]),
  });

  get products(): FormArray {
    return this.soldEntryFrom.get('products') as FormArray;
  }

  ngOnInit(): void {
    this.addProduct();

    this.soldEntryFrom
      .get('isSwarnteras')
      ?.valueChanges.subscribe((checked) => {
        this.isSwarnteras.set(!!checked);
      });
  }

  createProductForm(): FormGroup {
    return this.fb.group({
      tag: ['', [Validators.required, Validators.minLength(4)]],
      purity: [''],
      gold_wt: ['', Validators.required],
      dia_wt: [''],
      stn_wt: [''],
      soldupload: <File | null>null,
    });
  }

  addProduct() {
    this.products.push(this.createProductForm());
  }

  removeProduct(index: number) {
    this.products.removeAt(index);
  }

  onBasicUploadAuto(event: UploadEvent, index: number) {
    const file = event.files?.[0];
    if (file) {
      this.products.at(index).patchValue({ soldupload: file });
      this.messageService.add({
        severity: 'info',
        summary: 'File Selected',
        detail: file.name,
      });
    }
  }

  onSubmit() {
    if (this.soldEntryFrom.valid) {
      const formValue = this.soldEntryFrom.value;

      const formData = new FormData();
      formData.append('full_name', formValue.full_name ?? '');
      formData.append('mobile', formValue.mobile ?? '');
      formData.append('email', formValue.email ?? '');
      formData.append('birthday', formValue.birthday ?? '');
      formData.append('anniversary', formValue.anniversary ?? '');
      formData.append('isSwarnteras', String(formValue.isSwarnteras ?? false));
      formData.append('swanrAmount', String(formValue.swanrAmount ?? ''));

      // Add products without file data
      const productsData = (formValue.products ?? []).map((p: any) => {
        const { soldupload, ...rest } = p;
        return rest;
      });
      formData.append('products', JSON.stringify(productsData));

      // Append each file using the correct key so backend matches it
      (formValue.products ?? []).forEach((product: any, idx: number) => {
        if (product.soldupload instanceof File) {
          formData.append(`products[${idx}][soldupload]`, product.soldupload);
        }
      });

      // Debugging: show FormData contents
      console.log('📦 FormData entries:');
      for (const [key, value] of formData.entries()) {
        console.log(`${key}:`, value);
      }

      this.apiService.addSoldEntry(formData).subscribe(
        () => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sold entry added successfully!',
          });
          this.soldEntryFrom.reset();
          this.products.clear();
          this.addProduct();
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to add sold entry. Please try again.',
          });
          console.error('Error adding sold entry:', error);
        },
      );
    } else {
      this.messageService.add({
        severity: 'warn',
        summary: 'Validation',
        detail: 'Please fill all required fields.',
      });
    }
  }
}
