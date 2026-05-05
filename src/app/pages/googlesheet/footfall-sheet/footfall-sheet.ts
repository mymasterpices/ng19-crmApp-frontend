// footfall-sheet.component.ts
import { Component, inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Card } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { TabsModule } from 'primeng/tabs';
import { FootfallSheetServices } from '../../../services/footfall-sheet-services';

@Component({
  selector: 'app-footfall-sheet',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    TableModule,
    Card,
    SelectModule,
    ButtonModule,
    TabsModule,
  ],
  templateUrl: './footfall-sheet.html',
  styleUrl: './footfall-sheet.css',
})
export class FootfallSheetComponent implements OnInit {
  private _sheetService = inject(FootfallSheetServices);

  // Tab state
  tabs = signal<string[]>([]);
  activeTab = signal<string>('');

  // Sheet data
  salespersons = signal<string[]>([]);
  allData = signal<any[]>([]);
  months = signal<{ key: string; label: string }[]>([]);
  selectedMonth = signal<string>('');
  loading = signal<boolean>(false);

  ngOnInit() {
    this.loadTabs();
  }

  // ── Load all tab names first ───────────────────────────
  loadTabs() {
    this.loading.set(true);
    this._sheetService.getTabs().subscribe({
      next: (res: any) => {
        this.tabs.set(res.tabs);
        if (res.tabs.length > 0) {
          this.activeTab.set(res.tabs[0]);
          this.loadData(res.tabs[0]);
        }
      },
      error: (err: any) => {
        console.error('Tab load error:', err);
        this.loading.set(false);
      },
    });
  }

  // ── Load data for selected tab ─────────────────────────
  loadData(tab?: string) {
    const selectedTab = tab || this.activeTab();
    this.loading.set(true);
    this.allData.set([]);

    this._sheetService.getSheetData(selectedTab).subscribe({
      next: (res: any) => {
        this.salespersons.set(res.salespersons);
        this.allData.set(res.data);
        this.months.set(res.months);

        // Default to latest month
        if (res.months.length > 0) {
          this.selectedMonth.set(res.months[res.months.length - 1].key);
        } else {
          this.selectedMonth.set('');
        }

        this.loading.set(false);
      },
      error: (err: any) => {
        console.error('Sheet load error:', err);
        this.loading.set(false);
      },
    });
  }

  // ── Switch tab ─────────────────────────────────────────
  onTabChange(tab: string) {
    this.activeTab.set(tab);
    this.loadData(tab);
  }

  // ── Filter daily data by selected month ────────────────
  get filteredData(): any[] {
    const all = this.allData();
    const month = this.selectedMonth();
    if (!month) return all;

    const result: any[] = [];
    let capture = false;

    for (const row of all) {
      if (!row.isTotal) {
        const parts = row.date.replace(/\//g, '-').split('-');
        if (parts.length === 3) {
          const rowMonth = `${parts[2]}-${parts[1]}`;
          if (rowMonth === month) {
            capture = true;
          } else if (capture) {
            break;
          }
        }
      }
      if (capture) result.push(row);
    }
    return result;
  }

  // ── Monthly total row ──────────────────────────────────
  get currentMonthTotal(): any {
    return this.filteredData.find((r) => r.isTotal) || null;
  }

  // ── Color helpers ──────────────────────────────────────
  getConvClass(pc: number | null): string {
    if (pc === null) return 'text-gray-300';
    if (pc >= 75) return 'text-green-600 font-semibold';
    if (pc >= 50) return 'text-orange-500 font-semibold';
    return 'text-red-600 font-semibold';
  }
}
