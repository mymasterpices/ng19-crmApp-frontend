import { Component, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReportService } from '../../services/report.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-monthly-report',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="p-6 bg-white rounded-lg shadow">
      @if (report()) {
        <h2 class="text-2xl font-bold mb-4">
          {{ report()?.sales_person }} - {{ report()?.month_name }}
          {{ report()?.year }}
        </h2>

        <table class="min-w-full border-collapse">
          <thead class="bg-gray-100">
            <tr>
              <th class="border p-2">Date</th>
              <th class="border p-2">Footfall</th>
              <th class="border p-2">Conversion</th>
              <th class="border p-2">PC Codes</th>
            </tr>
          </thead>
          <tbody>
            @for (stat of report()?.daily_stats; track stat.date) {
              <tr class="hover:bg-gray-50">
                <td class="border p-2 text-center">
                  {{ stat.date | date: 'shortDate' | date: 'dd-MMM-yyyy' }}
                </td>
                <td class="border p-2 text-center">{{ stat.footfall }}</td>
                <td class="border p-2 text-center">{{ stat.conversion }}</td>
                <td class="border p-2 text-center">
                  @for (code of stat.pc; track $index) {
                    <span
                      class="px-2 py-1 mx-1 bg-blue-100 text-blue-800 rounded text-xs"
                    >
                      {{ code }}
                    </span>
                  }
                </td>
              </tr>
            }
          </tbody>
          <tfoot class="bg-gray-100 font-bold">
            <tr>
              <td class="border p-2 text-right">Totals:</td>
              <td class="border p-2 text-center">{{ totalFootfall() }}</td>
              <td class="border p-2 text-center">{{ totalConversion() }}</td>
              <td class="border p-2"></td>
            </tr>
          </tfoot>
        </table>
      } @else {
        <p class="text-gray-500 italic">
          No report data found for this period.
        </p>
      }
    </div>
  `,
})
export class ReportComponent implements OnInit {
  private reportService = inject(ReportService);
  private _authservices = inject(AuthService);

  user_id = this._authservices.getUserId() || '';

  // Computed signals for automatic UI updates
  report = this.reportService.currentReport;

  totalFootfall = computed(
    () =>
      this.report()?.daily_stats.reduce(
        (acc, curr) => acc + curr.footfall,
        0,
      ) || 0,
  );

  totalConversion = computed(
    () =>
      this.report()?.daily_stats.reduce(
        (acc, curr) => acc + curr.conversion,
        0,
      ) || 0,
  );

  ngOnInit() {
    // Initial fetch - replace with dynamic params in real usage
    this.reportService.loadReport(2026, 5, this.user_id);
  }
}
