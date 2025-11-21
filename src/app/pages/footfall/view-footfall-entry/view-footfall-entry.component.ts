import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FootfallService } from '../../../services/footfall/footfall.service';
import { HttpParams } from '@angular/common/http';
import { Button, ButtonModule } from 'primeng/button';
import { Avatar } from 'primeng/avatar';
import { TableModule } from 'primeng/table';
import { DatePickerModule } from 'primeng/datepicker';
import { CommonModule, DecimalPipe, DatePipe } from '@angular/common';
import { Tag } from 'primeng/tag';
import { FormsModule } from '@angular/forms';
import { Card } from 'primeng/card';

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
  ],
  templateUrl: './view-footfall-entry.component.html',
  styleUrls: ['./view-footfall-entry.component.css'],
})
export class ViewFootfallEntryComponent implements OnInit {
  private router = inject(ActivatedRoute);
  private _footfallService = inject(FootfallService);

  username = '';
  userFootfallData: any = null;
  selectedMonth: Date | null = null;
  allFootfallEntries = signal<any[]>([]);

  ngOnInit(): void {
    this.router.paramMap.subscribe((params) => {
      const userId = params.get('user_id');
      if (!userId) return console.error('No user_id provided.');

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
}
