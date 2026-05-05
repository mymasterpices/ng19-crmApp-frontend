import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TableModule } from 'primeng/table';
import { Card } from 'primeng/card';
import { SelectModule } from 'primeng/select';
import { ButtonModule } from 'primeng/button';
import { FootfallSheetServices } from '../../services/footfall-sheet-services';

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
        this.tabs.set(res.tabs ?? []);
        if (res.tabs?.length > 0) {
          this.activeTab.set(res.tabs[0]);
          this.loadData(res.tabs[0]);
        } else {
          this.loading.set(false);
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
    const selectedTab = tab ?? this.activeTab();
    if (!selectedTab) return;

    this.loading.set(true);
    this.allData.set([]);
    this.salespersons.set([]);
    this.months.set([]);
    this.selectedMonth.set('');

    this._sheetService.getSheetData(selectedTab).subscribe({
      next: (res: any) => {
        console.log('✅ Salespersons:', res.salespersons);
        console.log('✅ Months:', res.months);
        console.log('✅ Total rows:', res.data?.length);
        console.log('✅ First data row:', res.data?.[0]);

        this.salespersons.set(res.salespersons ?? []);
        this.allData.set(res.data ?? []);
        this.months.set(res.months ?? []);

        // Default to latest month
        const monthList = res.months ?? [];
        if (monthList.length > 0) {
          this.selectedMonth.set(monthList[monthList.length - 1].key);
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
    if (this.activeTab() === tab) return;
    this.activeTab.set(tab);
    this.loadData(tab);
  }

  // ── Filter daily data by selected month ────────────────
  // ✅ FIX: replaced break-based loop with a clean filter + total inclusion
  get filteredData(): any[] {
    const all = this.allData();
    const month = this.selectedMonth();
    if (!month) return all;

    const result: any[] = [];
    let lastWasMatch = false;

    for (const row of all) {
      if (row.isTotal) {
        // Include the total row only if the previous non-total rows matched
        if (lastWasMatch) {
          result.push(row);
          lastWasMatch = false;
        }
        continue;
      }

      const rowMonth = this.extractMonthKey(row.date);
      if (rowMonth === month) {
        result.push(row);
        lastWasMatch = true;
      } else {
        lastWasMatch = false;
      }
    }

    return result;
  }

  // ── Extract month key from date string ─────────────────
  private extractMonthKey(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.replace(/\//g, '-').split('-');
    if (parts.length !== 3) return '';

    // Support DD-MM-YYYY and YYYY-MM-DD
    if (parts[0].length === 4) {
      return `${parts[0]}-${parts[1]}`; // YYYY-MM
    } else {
      return `${parts[2]}-${parts[1]}`; // YYYY-MM from DD-MM-YYYY
    }
  }

  // ── Monthly total row ──────────────────────────────────
  get currentMonthTotal(): any {
    return this.filteredData.find((r) => r.isTotal) ?? null;
  }

  // ── Color helpers ──────────────────────────────────────
  getConvClass(pc: number | null): string {
    if (pc === null) return 'text-gray-400';
    if (pc >= 75) return 'text-green-600 font-semibold';
    if (pc >= 50) return 'text-orange-500 font-semibold';
    return 'text-red-600 font-semibold';
  }
}
