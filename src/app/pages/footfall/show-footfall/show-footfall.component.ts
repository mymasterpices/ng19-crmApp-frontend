import { Component, inject, OnInit, signal } from '@angular/core';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
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
  ],
  templateUrl: './show-footfall.component.html',
  styleUrls: ['./show-footfall.component.css'],
})
export class ShowFootfallComponent implements OnInit {
  private _footfallService = inject(FootfallService);
  private _messageService = inject(MessageService);
  private fb = inject(FormBuilder);

  visible = false;
  footfallForm: FormGroup = this.fb.group({ form: this.fb.array([]) });
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
    const formValue = this.footfallForm.value.form;

    this.salesPerson.forEach((person) => {
      const entry = formValue.find(
        (f: any) => f.sales_person === person.username
      );
      if (!entry) return;

      const payload = {
        name: person.name,
        username: person.username,
        user_id: person._id,
        foot_entry: [
          {
            footfall: Number(entry.ff) || 0,
            conversion: Number(entry.con) || 0,
            timestamp: new Date().toISOString(),
          },
        ],
      };

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
    this.getSavedFootfallEntries();
    this._messageService.add({
      severity: 'success',
      summary: 'Success',
      detail: 'All entries saved successfully',
    });
    this.footfallForm.reset();
    this.visible = false;
  }
}
