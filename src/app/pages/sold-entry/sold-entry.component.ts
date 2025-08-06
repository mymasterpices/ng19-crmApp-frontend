import { Component, inject, Input, OnInit } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { StepperModule } from 'primeng/stepper';
import { InputTextModule } from 'primeng/inputtext';
import { CommonModule } from '@angular/common';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FloatLabel } from 'primeng/floatlabel';
import { Textarea } from 'primeng/textarea';
import { DatePicker } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { FileUpload } from 'primeng/fileupload';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';

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
    Textarea,
    DatePicker,
    InputNumberModule,
    FileUpload,
    ReactiveFormsModule,
  ],
  templateUrl: './sold-entry.component.html',
  styleUrl: './sold-entry.component.css',
})
export class SoldEntryComponent implements OnInit {
  @Input() selectedItemId: string | null = null;

  private messageService = inject(MessageService);
  private apiService = inject(ApiService);

  activeStep: number = 1;

  soldEntryFrom = new FormGroup({
    full_name: new FormControl(null, [
      Validators.required,
      Validators.minLength(3),
    ]),
    mobile: new FormControl(null),
    email: new FormControl(null),
    birthday: new FormControl(null),
    anniversary: new FormControl(null),
    address: new FormControl(null),
    //Product Details
    tag: new FormControl(null, [Validators.required, Validators.minLength(4)]),
    purity: new FormControl(null),
    gold_wt: new FormControl(null),
    dia_wt: new FormControl(null),
    stn_wt: new FormControl(null),
    amount: new FormControl(null),
    soldupload: new FormControl<File | null>(null),
  });

  selectedFile: File | null = null;

  onBasicUploadAuto(event: UploadEvent) {
    const file = event.files?.[0];

    if (file) {
      this.soldEntryFrom.patchValue({ soldupload: file });
      console.log('File patched to form:', file);

      this.messageService.add({
        severity: 'info',
        summary: 'File Selected',
        detail: file.name,
      });
    }
  }

  onSubmit() {
    if (this.soldEntryFrom.valid) {
      const formData = new FormData();

      // Loop over form controls
      Object.entries(this.soldEntryFrom.value).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'soldupload' && value instanceof File) {
            // Append the file with the correct key
            formData.append('soldupload', value);
          } else {
            formData.append(key, value);
          }
        }
      });

      // Use FormData in the HTTP request
      this.apiService.addSoldEntry(formData).subscribe(
        (res: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sold entry added successfully!',
          });
          this.soldEntryFrom.reset();
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to add sold entry. Please try again.',
          });
          console.error('Error adding sold entry:', error);
        }
      );
    }
  }

  ngOnInit(): void {
    // Initialize form or any other setup if needed
  }
}
