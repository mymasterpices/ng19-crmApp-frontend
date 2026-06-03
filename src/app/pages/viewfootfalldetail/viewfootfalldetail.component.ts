import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FootfallService } from '../../services/footfall/footfall.service';
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
  selector: 'app-viewfootfalldetail',
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
  templateUrl: './viewfootfalldetail.component.html',
  styleUrl: './viewfootfalldetail.component.css',
})
export class Viewfootfalldetail implements OnInit {
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

      console.log('This is the user_id: ', this.userID);

      // Initially fetch data with auto-detected current month and year

      // load month from local storage if exists
      const storedMonth = localStorage.getItem('selectedMonth');
      if (storedMonth) {
        this.selectedMonth = new Date(JSON.parse(storedMonth));
      }

      this.fetchUserFootfall(
        userId,
        this.selectedMonth?.getFullYear(),
        this.selectedMonth ? this.selectedMonth.getMonth() + 1 : undefined,
      );
    });
  }

  /**
   * Fetches footfall data.
   * If explicit year/month are omitted, it detects and uses the current Date values.
   */
  fetchUserFootfall(userId: string, year?: number, month?: number) {
    // Auto detect current year and 1-indexed month if not explicitly passed
    const finalYear = year ?? new Date().getFullYear();
    const finalMonth = month ?? new Date().getMonth() + 1;

    this._footfallService
      .getFootfallData(userId, finalYear, finalMonth)
      .subscribe({
        next: (res: any) => {
          const list = res?.data ?? res;
          if (list && list.length > 0) {
            const person = list[0];
            this.username = person.username ?? person.sales_person;

            // Maps seamlessly to your collection array key 'daily_stats'
            const entries: any[] =
              person.daily_stats ?? person.foot_entry ?? [];
            this.allFootfallEntries.set(entries);

            // Build a FormGroup for every entry row
            this.entryForms.clear();
            entries.forEach((entry: any) => {
              const entryKey = entry._id ?? entry.date;
              this.entryForms.set(
                entryKey,
                new FormGroup({
                  ff: new FormControl(entry.footfall || null),
                  con: new FormControl(entry.conversion || null),
                }),
              );
            });
          } else {
            // Reset entries array if nothing is found for the chosen month criteria
            this.allFootfallEntries.set([]);
            this.entryForms.clear();
          }
        },
        error: (err) => console.error('Error fetching footfall data:', err),
      });
  }

  /** Triggered when the user selects a month/year combination from PrimeNG DatePicker */
  onMonthChange(event: Date | null) {
    this.selectedMonth = event;

    // check and update if aleady stored and update local storage
    if (event) {
      localStorage.setItem('selectedMonth', JSON.stringify(event));
    }
    // else clear local storage
    else {
      localStorage.removeItem('selectedMonth');
    }

    console.log('Selected month:', this.selectedMonth);

    if (this.userID) {
      if (event) {
        const selectedYear = event.getFullYear();
        const selectedMonthIndex = event.getMonth() + 1; // Converts 0-11 index up to 1-12 criteria
        this.fetchUserFootfall(this.userID, selectedYear, selectedMonthIndex);
      } else {
        // Fall back to current date configuration if picker clearing is allowed
        this.fetchUserFootfall(this.userID);
      }
    }
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
    if (this.activePopover && this.activePopover !== popover) {
      this.activePopover.hide();
    }
    this.activePopover = popover;

    const entryKey = entry._id ?? entry.date;
    const form = this.getForm(entryKey);
    form.patchValue({ footfall: entry.footfall, conversion: entry.conversion });

    popover.toggle(event);
  }

  highlightRow(id: string) {
    this.highlightedRowId.set(id);
    setTimeout(() => this.highlightedRowId.set(null), 3000);
  }

  /** Client-side secondary fallback fallback method if needed */
  filteredFootEntries() {
    if (!this.selectedMonth) return this.allFootfallEntries();

    const month = this.selectedMonth.getMonth();
    const year = this.selectedMonth.getFullYear();

    return this.allFootfallEntries().filter((entry: any) => {
      const date = new Date(entry.date ?? entry.timestamp);
      return date.getFullYear() === year && date.getMonth() === month;
    });
  }

  onSubmit(entryId: string, popover: Popover) {
    if (!entryId) return;

    // Get the form and actual entry data
    const form = this.getForm(entryId);
    const entry = this.allFootfallEntries().find(
      (e: any) => (e._id ?? e.date) === entryId,
    );

    if (!entry || form.invalid) return;

    // Get correct form control values
    const { ff, con } = form.value;

    const dataPayload = {
      entryId: entryId,
      date: entry.date,
      footfall: ff,
      conversion: con,
    };

    this._footfallService
      .updateFootfallEntryById(entryId, dataPayload)
      .subscribe({
        next: (res: any) => {
          form.reset();
          popover.hide();
          this.activePopover = null;
          this.highlightRow(entryId);
          this.refreshCurrentDataView();

          this._messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: 'Entry updated successfully',
          });
        },
        error: (err) => {
          console.error('Update failed:', err);
          this._messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: err?.error?.message || 'Failed to update entry',
          });
        },
      });
  }

  deleteEntry(entry: any) {
    const entryKey = entry._id;

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
        this._footfallService.deleteFootfallEntryById(entryKey).subscribe({
          next: (res: any) => {
            this._messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: 'Entry deleted successfully',
            });
            this.refreshCurrentDataView();
          },
          error: (err) => console.error(err),
        });
      },
    });
  }

  /** Helper to trigger data reload based on current selected states */
  private refreshCurrentDataView() {
    if (this.selectedMonth) {
      this.fetchUserFootfall(
        this.userID,
        this.selectedMonth.getFullYear(),
        this.selectedMonth.getMonth() + 1,
      );
    } else {
      this.fetchUserFootfall(this.userID);
    }
  }
}
