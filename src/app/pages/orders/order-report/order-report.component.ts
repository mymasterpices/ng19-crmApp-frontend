import { Component, OnInit, signal, inject } from '@angular/core';
import { OrderServices } from '../../../services/orders/order-services';
import { DecimalPipe, CommonModule, TitleCasePipe } from '@angular/common'; // Added CommonModule for @if/@for or *ngIf/*ngFor
import { ChartModule } from 'primeng/chart';
import { FormsModule } from '@angular/forms';
import { SelectModule } from 'primeng/select';

// 1. Define an interface for the summary object
interface KarigarStats {
  name: string;
  totalWeight: number;
  totalQty: number;
}

@Component({
  selector: 'app-order-report',
  standalone: true, // Assuming standalone based on your imports style
  imports: [DecimalPipe, ChartModule, CommonModule, FormsModule, SelectModule],
  templateUrl: './order-report.component.html',
  styleUrls: ['./order-report.component.css'],
})
export class OrderReportComponent implements OnInit {
  private _orderService = inject(OrderServices);

  allOrders: any[] = [];
  selectedStatus = signal<string>('all');

  // 2. Type your signal with the interface
  karigarSummary = signal<KarigarStats[]>([]);

  pieChartData: any;
  pieChartOptions: any;

  ngOnInit() {
    this.fetchOrders();
    this.initChartOptions();
    this.getStatusList();
  }

  statusList: any[] = [];

  //get karigars name list
  getStatusList() {
    this._orderService.getStatusList().subscribe({
      next: (res: any) => {
        this.statusList = res || [];
        console.log('Karigars fetched:', this.statusList);
      },
      error: (err) => {
        console.log('Error fetching karigars:', err.error?.message || err);
      },
    });
  }
  getStatusName(id: string): string {
    if (!id) return '';
    return this.statusList.find((k) => k._id === id)?.name || id;
  }

  fetchOrders() {
    this._orderService.getOrders().subscribe((data: any) => {
      this.allOrders = data;
      this.processData();
    });
  }

  processData() {
    const statusFilter = this.selectedStatus();

    const filtered =
      statusFilter === 'all'
        ? this.allOrders
        : this.allOrders.filter((o) => o.status === statusFilter);

    const groups = filtered.reduce(
      (acc, obj) => {
        // FIX: Use the helper to get the name if karigari is an ID
        const statusID = obj.karigari || 'Unknown';
        const name = this.getStatusName(statusID);

        if (!acc[name]) {
          acc[name] = { name: name, totalWeight: 0, totalQty: 0 };
        }

        const weight = parseFloat(obj.goldWeight?.toString() || '0');
        acc[name].totalWeight += isNaN(weight) ? 0 : weight;
        acc[name].totalQty += obj.quantity || 0;

        return acc;
      },
      {} as Record<string, KarigarStats>,
    );

    const summaryArray: KarigarStats[] = Object.values(groups);
    this.karigarSummary.set(summaryArray);

    this.pieChartData = {
      labels: summaryArray.map((k) => k.name),
      datasets: [
        {
          data: summaryArray.map((k) => k.totalWeight),
          backgroundColor: [
            '#FF6384',
            '#36A2EB',
            '#FFCE56',
            '#4BC0C0',
            '#9966FF',
            '#C9CBCF',
          ],
        },
      ],
    };
  }

  initChartOptions() {
    this.pieChartOptions = {
      plugins: {
        legend: { position: 'bottom' },
        title: { display: true, text: 'Gold Weight Distribution' },
      },
    };
  }

  onStatusChange(event: any) {
    this.selectedStatus.set(event.value || 'all');
    this.processData();
  }
}
