import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { FootfallService } from '../../../services/footfall/footfall.service';
import { HttpParams } from '@angular/common/http';
import { Dialog } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { Button } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { TableModule } from 'primeng/table';
import { PaginatorModule } from 'primeng/paginator';
import { Tag } from 'primeng/tag';
import { DecimalPipe, TitleCasePipe, CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { FormsModule } from '@angular/forms';
import { DatePicker } from 'primeng/datepicker';
import { Card } from 'primeng/card';
import { LoginedUserService } from '../../../services/logined-user.service';
import { FileUpload } from 'primeng/fileupload';
import { Tooltip } from 'primeng/tooltip';

interface UploadEvent {
  files: File[];
}

@Component({
  selector: 'app-show-footfall',
  standalone: true,
  imports: [
    FloatLabel,
    Button,
    ReactiveFormsModule,
    InputTextModule,
    Dialog,
    TableModule,
    PaginatorModule,
    Tag,
    RouterLink,
    DecimalPipe,
    TitleCasePipe,
    FormsModule,
    CommonModule,
    DatePicker,
    Card,
    FileUpload,
    Tooltip,
  ],
  templateUrl: './show-footfall.component.html',
  styleUrls: ['./show-footfall.component.css'],
})
export class ShowFootfallComponent implements OnInit {
  private _footfallService = inject(FootfallService);
  private _messageService = inject(MessageService);
  private _loginedUserService = inject(LoginedUserService);
  private fb = inject(FormBuilder);

  loginedUser = this._loginedUserService.getLoginedUser();

  visible = false;
  uploadVisible = false;

  footfallForm: FormGroup = this.fb.group({
    date: new FormControl<Date | null>(null),
    form: this.fb.array([]),
  });
  salesPerson: any[] = [];
  allFootfallEntries = signal<any[]>([]);
  selectedMonth: Date | null = null;

  ngOnInit(): void {
    this.getSalesPersonName();
    this.getSavedFootfallEntries();
  }

  get form(): FormArray {
    return this.footfallForm.get('form') as FormArray;
  }

  toTitleCase(value: string): string {
    return value.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase());
  }

  getSalesPersonName() {
    this._footfallService.getAllSalesPersons().subscribe({
      next: (res: any) => (this.salesPerson = res),
      error: (err) => console.error(err),
    });
  }

  getSavedFootfallEntries(search: string = '') {
    let params = new HttpParams();
    if (search.trim())
      params = params.set('username', this.toTitleCase(search.trim()));

    this._footfallService.getFootfallEntries(params).subscribe({
      next: (res: any) => {
        const updated = res.map((person: any) => {
          let entries = person.foot_entry;

          if (this.selectedMonth) {
            const month = this.selectedMonth.getMonth();
            const year = this.selectedMonth.getFullYear();
            entries = entries.filter((e: any) => {
              const date = new Date(e.timestamp);
              return date.getFullYear() === year && date.getMonth() === month;
            });
          }

          const totalFootfall = entries.reduce(
            (sum: number, e: any) => sum + e.footfall,
            0
          );
          const totalConversion = entries.reduce(
            (sum: number, e: any) => sum + e.conversion,
            0
          );
          const totalPC = entries.reduce(
            (sum: number, e: any) => sum + e.pc,
            0
          );

          return {
            ...person,
            foot_entry: entries,
            totalFootfall,
            totalConversion,
          };
        });

        this.allFootfallEntries.set(updated);
      },
      error: (err) => console.error(err),
    });
  }

  onMonthChange(event: any) {
    this.selectedMonth = event;
    this.getSavedFootfallEntries();
  }

  createEntryForm(person: any): FormGroup {
    return this.fb.group({
      sales_person: new FormControl(person.username || ''),
      ff: new FormControl(person.ff || ''),
      con: new FormControl(person.con || ''),
      pc: new FormControl(person.pc || ''),
    });
  }

  loadFootfallForm() {
    this.form.clear();
    this.salesPerson.forEach((person) =>
      this.form.push(this.createEntryForm(person))
    );
  }

  openDialog() {
    this.loadFootfallForm();
    this.visible = true;
  }

  onSubmit() {
    const formValue = this.footfallForm.value;
    const selectedDate: Date | string | null = formValue.date;
    const rows = formValue.form;

    console.log('Full form value:', formValue);
    console.log('Selected date:', selectedDate);

    this.salesPerson.forEach((person) => {
      const entry = rows.find((f: any) => f.sales_person === person.username);
      if (!entry) return;

      const timestamp =
        selectedDate instanceof Date
          ? selectedDate.toISOString()
          : selectedDate || new Date().toISOString();

      const payload = {
        username: person.username,
        user_id: person._id,
        foot_entry: [
          {
            footfall: Number(entry.ff) || 0,
            conversion: Number(entry.con) || 0,
            pc: Number(entry.pc) || null,
            timestamp, // ✅ will now be what you selected
          },
        ],
      };

      console.log('Show the Data payload', payload);

      this._footfallService.saveFootfallEntry(person._id, payload).subscribe({
        next: () => console.log(`Saved entry for ${person.username}`),
        error: (err) => {
          this._messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: `Failed for ${person.username}`,
          });
          console.error(err);
        },
      });
    });

    this._messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'All entries saved successfully',
    });

    this.footfallForm.reset();
    this.getSavedFootfallEntries();
    this.visible = false;
  }

  //bulk upload footfall data
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
      this._messageService.add({
        severity: 'error',
        summary: 'Invalid File',
        detail: 'Please upload a CSV file',
      });
      return;
    }

    this.selectedFile = file;
    this.csvForm.patchValue({ csv_file: file });

    this._messageService.add({
      severity: 'info',
      summary: 'File Selected',
      detail: file.name,
    });
  }

  onBulkUpload() {
    if (!this.selectedFile) {
      this._messageService.add({
        severity: 'error',
        summary: 'Missing CSV file',
        detail: 'Please select a CSV file',
      });
      return;
    }

    this.isUploading.set('Processing...');

    this._footfallService
      .uploadBulkFootfallEntries(this.selectedFile)
      .subscribe({
        next: (res: any) => {
          this._messageService.add({
            severity: 'success',
            summary: 'Upload Complete',
            detail: `${res.totalImported || 0} entries imported successfully`,
          });
          this.isUploading.set('Upload');
          this.getSavedFootfallEntries();
          this.csvForm.reset();
          this.uploadVisible = false;
          this.selectedFile = null;
        },
        error: (err) => {
          this._messageService.add({
            severity: 'error',
            summary: 'Upload Failed',
            detail: err.error?.error || 'Please try again',
          });
          this.isUploading.set('Upload');
        },
      });
  }
}
