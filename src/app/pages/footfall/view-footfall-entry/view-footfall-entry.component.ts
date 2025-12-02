import { MessageService } from 'primeng/api';
import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
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
import { DialogModule } from 'primeng/dialog';
import { FloatLabelModule } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { Popover, PopoverModule } from 'primeng/popover';

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
    RouterLink
],
  templateUrl: './view-footfall-entry.component.html',
  styleUrls: ['./view-footfall-entry.component.css'],
})
export class ViewFootfallEntryComponent implements OnInit {
  private router = inject(ActivatedRoute);
  private _footfallService = inject(FootfallService);
  private _messageService = inject(MessageService);

  username = '';
  userFootfallData: any = null;
  selectedMonth: Date | null = null;
  allFootfallEntries = signal<any[]>([]);
  highlightedRowId = signal<string | null>(null);

  //user id
  userID: string = '';

  toggle(event: any, popover: Popover) {
    popover.toggle(event);
  }

  highlightRow(id: string) {
    this.highlightedRowId.set(id);
    setTimeout(() => {
      this.highlightedRowId.set(null);
    }, 3000); // Remove highlight after 3 seconds
  }

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
        if (res.length > 0) {
          const person = res[0];
          this.username = person.username;
          this.allFootfallEntries.set(person.foot_entry);
        }
      },
      error: (err) => console.error(err),
    });
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

  editFootfallEntry(id: string) {
    console.log('footfall id', id);
  }

  update_footefall_entry = new FormGroup({
    ff: new FormControl(),
    con: new FormControl(),
  });

  onSubmit(id: string) {
    const updatedData = this.update_footefall_entry.value;

    const dataPayload = {
      entryId: id,
      footfall: updatedData.ff,
      conversion: updatedData.con,
    };
    console.log('newdata', updatedData);
    console.log(`User id: ${this.userID}, Data playLoad: ${dataPayload}`);

    this._footfallService
      .updateFootfallEntry(this.userID, dataPayload)
      .subscribe({
        next: (res: any) => {
          console.log(res);
          this.update_footefall_entry.reset();
          this.highlightRow(id);
          this.fetchUserFootfall(this.userID);
          this._messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: res.message,
          });
        },
        error: (err) => {
          console.log(err);
        },
      });
  }
}
