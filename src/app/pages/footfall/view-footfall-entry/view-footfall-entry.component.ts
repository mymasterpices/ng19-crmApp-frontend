import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FootfallService } from '../../../services/footfall/footfall.service';
import { HttpParams } from '@angular/common/http';
import { ButtonModule } from 'primeng/button';
import { Avatar } from 'primeng/avatar';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Tag } from 'primeng/tag';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
} from '@angular/forms';
import { Card } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-view-footfall-entry',
  imports: [
    ButtonModule,
    Avatar,
    TableModule,
    DatePickerModule,
    CommonModule,
    DecimalPipe,
    DatePipe,
    Tag,
    FormsModule,
    Card,
    PopoverModule,
    FloatLabelModule,
    InputTextModule,
    ReactiveFormsModule,
    RouterLink,
  ],
  templateUrl: './view-footfall-entry.component.html',
  styleUrls: ['./view-footfall-entry.component.css'],
})
export class ViewFootfallEntryComponent implements OnInit {
  private router = inject(ActivatedRoute);
  private _footfallService = inject(FootfallService);
  private _messageService = inject(MessageService);
  private _confirmationService = inject(ConfirmationService);

  username = '';
  selectedMonth: Date | null = null;
  allFootfallEntries = signal<any[]>([]);
  highlightedRowId = signal<string | null>(null);
  userID: string = '';

  // Per-row popover form map: entryId -> FormGroup
  entryForms = new Map<string, FormGroup>();

  // Track which popover reference is currently active
  activePopover: Popover | null = null;

  ngOnInit(): void {
    this.router.paramMap.subscribe((params) => {
      const userId = params.get('user_id');
      if (!userId) return console.error('No user_id provided.');
      this.userID = userId;
      this.fetchUserFootfall(userId);
    });
  }

  fetchUserFootfall(userId: string) {
    const params = new HttpParams().set('user_id', userId);

    this._footfallService.getFootfallEntries(params).subscribe({
      next: (res: any) => {
        // API returns { data: [...] }
        const list = res?.data ?? res;
        if (list.length > 0) {
          const person = list[0];
          this.username = person.username;
          const entries: any[] = person.foot_entry ?? [];
          this.allFootfallEntries.set(entries);

          // Build a FormGroup for every entry row
          this.entryForms.clear();
          entries.forEach((entry: any) => {
            this.entryForms.set(
              entry._id,
              new FormGroup({
                ff: new FormControl(null),
                con: new FormControl(null),
              }),
            );
          });
        }
      },
      error: (err) => console.error(err),
    });
  }

  /** Returns (or lazily creates) the form for a given entry */
  getForm(entryId: string): FormGroup {
    if (!this.entryForms.has(entryId)) {
      this.entryForms.set(
        entryId,
        new FormGroup({
          ff: new FormControl(null),
          con: new FormControl(null),
        }),
      );
    }
    return this.entryForms.get(entryId)!;
  }

  /** Open the popover for this row and pre-fill values */
  openEdit(event: any, popover: Popover, entry: any) {
    // Close the previously open popover (if any) to avoid stacking
    if (this.activePopover && this.activePopover !== popover) {
      this.activePopover.hide();
    }
    this.activePopover = popover;

    // Pre-fill form with current values
    const form = this.getForm(entry._id);
    form.patchValue({ ff: entry.footfall, con: entry.conversion });

    popover.toggle(event);
  }

  highlightRow(id: string) {
    this.highlightedRowId.set(id);
    setTimeout(() => this.highlightedRowId.set(null), 3000);
  }

  onMonthChange(event: Date) {
    this.selectedMonth = event;
  }

  filteredFootEntries() {
    if (!this.selectedMonth) return this.allFootfallEntries();

    const month = this.selectedMonth.getMonth();
    const year = this.selectedMonth.getFullYear();

    return this.allFootfallEntries().filter((entry: any) => {
      const date = new Date(entry.timestamp);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }

  onSubmit(entryId: string, popover: Popover) {
    const form = this.getForm(entryId);
    const { ff, con } = form.value;

    const dataPayload = { entryId, footfall: ff, conversion: con };

    this._footfallService
      .updateFootfallEntry(this.userID, dataPayload)
      .subscribe({
        next: (res: any) => {
          form.reset();
          popover.hide();
          this.activePopover = null;
          this.highlightRow(entryId);
          this.fetchUserFootfall(this.userID);
          this._messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: res.message,
          });
        },
        error: (err) => console.error(err),
      });
  }

  deleteEntry(id: string) {
    this._confirmationService.confirm({
      message: 'Are you sure you want to delete this entry?',
      header: 'Delete Footfall Entry',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
        severity: 'danger',
      },
      accept: () => {
        this._footfallService.deleteFootfallEntry(this.userID, id).subscribe({
          next: (res: any) => {
            this.fetchUserFootfall(this.userID);
            this._messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: res.message,
            });
          },
          error: (err) => console.error(err),
        });
      },
    });
  }
}
