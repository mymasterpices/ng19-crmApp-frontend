import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

// PrimeNG 19 Modules
import { DatePickerModule } from 'primeng/datepicker';
import { ProgressBarModule } from 'primeng/progressbar';
import { TagModule } from 'primeng/tag';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { TargetService } from '../../services/target/target.service';
import { RouterLink } from '@angular/router';
import { TableModule } from 'primeng/table';
import { KnobModule } from 'primeng/knob';
import { single } from 'rxjs';

@Component({
  selector: 'app-target-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    DatePickerModule,
    ProgressBarModule,
    TagModule,
    ButtonModule,
    ToastModule,
    CardModule,
    RouterLink,
    TableModule,
    KnobModule,
  ],
  providers: [MessageService],
  templateUrl: './target-view.component.html',
})
export class TargetViewComponent implements OnInit {
  private _messageService = inject(MessageService);
  private _targetService = inject(TargetService);

  performanceData: any = null;

  // Date Selection
  selectedDate: Date = new Date(); // Defaults to current month/year
  isSyncing = false;

  

  // Lifecycle Hook
  ngOnInit(): void {
    this.onFilterChange();
  }

  // Triggered by Calendar Change
  onFilterChange(): void {
    if (this.selectedDate) {
      const month = this.selectedDate.getMonth() + 1;
      const year = this.selectedDate.getFullYear();
      this.fetchPerformance(month, year);
    }
  }

  fetchPerformance(month: number, year: number): void {
    this._targetService.getTargetPerformance(month, year).subscribe({
      next: (data) => (this.performanceData = data),
      error: () => (this.performanceData = null),
    });
  }

  syncData(): void {
    this.isSyncing = true;
    const month = this.selectedDate.getMonth() + 1;
    const year = this.selectedDate.getFullYear();

    this._targetService.syncTargetPerformance(month, year).subscribe({
      next: () => {
        this.fetchPerformance(month, year);
        this._messageService.add({
          severity: 'success',
          summary: 'Synced',
          detail: 'Store-wide achievements updated.',
        });

        this.isSyncing = false;
      },
      error: () => {
        this._messageService.add({
          severity: 'error',
          summary: 'Sync Failed',
          detail: 'Could not update data.',
        });
        this.isSyncing = false;
      },
    });
  }

  calculatePercent(achieved: number, target: number): number {
    if (!target) return 0;
    return Math.min(Math.round((achieved / target) * 100), 100);
  }

  getStatusSeverity(status: string): any {
    switch (status?.toLowerCase()) {
      case 'achieved':
        return 'success';
      case 'missed':
        return 'danger';
      default:
        return 'warn';
    }
  }

  showToast(severity: string, summary: string, detail: string) {
    this._messageService.add({ severity, summary, detail });
  }

  get periodLabel(): string {
    return this.selectedDate.toLocaleString('default', {
      month: 'long',
      year: 'numeric',
    });
  }

  
}
