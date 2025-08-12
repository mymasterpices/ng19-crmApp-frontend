import { Component, inject, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';
import { Avatar } from 'primeng/avatar';
import { AvatarGroup } from 'primeng/avatargroup';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';

import {
  CurrencyPipe,
  DatePipe,
  TitleCasePipe,
  UpperCasePipe,
} from '@angular/common';
import { MessageService } from 'primeng/api';

import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { DialogModule } from 'primeng/dialog';
import { FileUploadModule } from 'primeng/fileupload';
import { InputNumber } from 'primeng/inputnumber';
import { FloatLabel } from 'primeng/floatlabel';
import { DatePicker } from 'primeng/datepicker';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DividerModule } from 'primeng/divider';

interface UploadEvent {
  files: File[];
}

@Component({
  selector: 'app-view-sold-items',
  standalone: true,
  imports: [
    ButtonModule,
    CurrencyPipe,
    DatePipe,
    TitleCasePipe,
    UpperCasePipe,
    CardModule,
    DialogModule,
    FileUploadModule,
    InputNumber,
    FloatLabel,
    DatePicker,
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    DividerModule,
    Avatar,
    AvatarGroup,
    DividerModule
  ],
  templateUrl: './view-sold-items.component.html',
  styleUrl: './view-sold-items.component.css',
})
export class ViewSoldItemsComponent implements OnInit {
  private apiService = inject(ApiService);
  private route = inject(ActivatedRoute);
  private messageService = inject(MessageService);

  appUrl = environment.apiUrl;
  visible: boolean = false;
  viewSoldItem: any = '';

  showDialog() {
    this.visible = true;
  }

  soldEntryFrom = new FormGroup({
    full_name: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    mobile: new FormControl(''),
    email: new FormControl(''),
    birthday: new FormControl(''),
    anniversary: new FormControl(''),
    address: new FormControl(''),
    purity: new FormControl(''),
    gold_wt: new FormControl(''),
    dia_wt: new FormControl(''),
    stn_wt: new FormControl(''),
    amount: new FormControl(''),
    soldupload: new FormControl<File | null>(null),
  });

  id: string = '';

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.getSoldItemId(id);
        this.id = id;
      }
    });
  }

  getSoldItemId(id: string) {
    this.apiService.getSoldItemById(id).subscribe({
      next: (response: any) => {
        this.viewSoldItem = response;
        console.log('Sold item fetched successfully:', response);

        // ✅ Pre-fill form for editing
        this.soldEntryFrom.patchValue({
          full_name: response.full_name,
          mobile: response.mobile,
          email: response.email,
          birthday: response.birthday,
          anniversary: response.anniversary,
          address: response.address,
          purity: response.purity,
          gold_wt: response.gold_wt,
          dia_wt: response.dia_wt,
          stn_wt: response.stn_wt,
          amount: response.amount,
        });
      },
      error: (error) => {
        console.error('Error fetching sold item:', error);
      },
    });
  }

  onBasicUploadAuto(event: UploadEvent) {
    const file = event.files?.[0];

    if (file) {
      this.soldEntryFrom.patchValue({ soldupload: file });
      console.log('File selected and patched to form:', file);

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

      Object.entries(this.soldEntryFrom.value).forEach(([key, value]) => {
        if (value !== null && value !== undefined) {
          if (key === 'soldupload' && value instanceof File) {
            formData.append('soldupload', value);
          } else {
            formData.append(key, value as string);
          }
        }
      });

      // ✅ Debug formData
      console.log('FormData contents:', formData.entries());

      this.apiService.updateSoldItem(this.id, formData).subscribe(
        (res: any) => {
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Sold entry added successfully!',
          });
          this.soldEntryFrom.reset();
          this.visible = false;
          this.getSoldItemId(this.id);
        },
        (error) => {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Failed to add sold entry.',
          });
          console.error('Error:', error);
        }
      );
    } else {
      console.warn('Form is invalid', this.soldEntryFrom.errors);
    }
  }
}
