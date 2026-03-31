import { Component, inject, OnInit } from '@angular/core';
import { CardModule } from 'primeng/card';
import { ProgressBarModule } from 'primeng/progressbar';
import { LoginedUserService } from '../../services/logined-user.service';
import { DatePipe } from '@angular/common';
import { ApiService } from '../../services/api.service';
import { ChartModule } from 'primeng/chart';
import { RouterLink } from '@angular/router';
import { SharevideosService } from '../../services/sharevideos.service';
import { FootfaloverviewComponent } from './footfaloverview/footfaloverview.component';
import { HttpParams } from '@angular/common/http';
import { KarigarDashboardComponent } from '../karigar/karigar-dashboard/karigar-dashboard.component';
import { AnalyticComponent } from './reports/analytic/analytic.component';
import { TargetViewComponent } from "../target-view/target-view.component";

interface FootEntry {
  username: string;
  user_id: string;
  footfall: number;
  conversion: number;
  pc?: string | null;
  timestamp: string; // ISO string
}

@Component({
  selector: 'app-overview',
  imports: [
    CardModule,
    ProgressBarModule,
    DatePipe,
    ChartModule,
    RouterLink,
    FootfaloverviewComponent,
    KarigarDashboardComponent,
    AnalyticComponent,
    TargetViewComponent
],
  templateUrl: './overview.component.html',
  styleUrl: './overview.component.css',
})
export class OverviewComponent implements OnInit {
  private _logginedUserService = inject(LoginedUserService);
  private _apiServices = inject(ApiService);
  private _shareVideoService = inject(SharevideosService);

  //Declear variabes
  userName = this._logginedUserService.getUserName();
  userRole = this._logginedUserService.getUserRole();
  today: Date = new Date();

  customers: any = [];
  chartData: any;
  chartOptions: any;
  seriousnessChartData: any;
  seriousnessChartOptions: any;

  //count today's followup
  todaysFollow = '';
  missedFollow = '';
  failedCount = '';

  //videos stactics
  sharedLinks = '';
  sharedCount = '';
  selectionCount = '';

  ngOnInit(): void {
    if (this.userRole != 'karigar') {
      this.loadCustomers();
      this.createSeriousnessChart();

      //missed customer
      this.countMissedFollowup();
      this.countTodaysfollowUp();

      //video
      this.countVideoFunc();
      this.countShareFunc();
      this.countSelectionFunc();
    }
  }

  //missed's follow
  countMissedFollowup() {
    const user = this.userName;
    const role = this.userRole;
    let params = new HttpParams();

    if (role !== 'admin' && role !== 'superadmin') {
      params = params.set('salesperson', user);
    } else {
      console.log('Admin access: Fetching all records');
    }

    this._apiServices.missedFollowupCustomers(params).subscribe({
      next: (res: any) => {
        console.log('Missed customer:', res);
        this.missedFollow = res;
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  //up-comming followup
  countTodaysfollowUp() {
    const user = this.userName;
    const role = this.userRole;
    let params = new HttpParams();

    if (role !== 'admin' && role !== 'superadmin') {
      params = params.set('salesperson', user);
    } else {
      console.log('Admin access: Fetching all records');
    }
    this._apiServices.todayFollowupCustomers(params).subscribe({
      next: (res: any) => {
        console.log('Missed customer:', res);
        this.todaysFollow = res;
      },
      error: (err) => {
        console.log(err);
      },
    });
  }

  loadCustomers() {
    const user = this.userName;
    const role = this.userRole;
    let params = new HttpParams();

    if (role !== 'admin' && role !== 'superadmin') {
      params = params.set('salesperson', user);
    } else {
      console.log('Admin access: Fetching all records');
    }

    this._apiServices.getAllcustomers(params).subscribe({
      next: (res) => {
        this.customers = res;
        this.prepareChart();
        this.createSeriousnessChart();

        //count failed customer
        this.failedCount = this.customers.filter(
          (c: any) => c.status === 'Failed',
        ).length;
        console.log('Failed customers:', this.failedCount);
      },
      error: (err) => console.error('Error fetching customers:', err),
    });
  }

  //missed followup total
  prepareChart() {
    // Group customers by status
    const statusCount: { [key: string]: number } = {};

    this.customers.forEach((c: any) => {
      statusCount[c.status] = (statusCount[c.status] || 0) + 1;
    });

    this.chartData = {
      labels: Object.keys(statusCount),
      datasets: [
        {
          label: 'Customers by Status',
          data: Object.values(statusCount),
          backgroundColor: [
            '#576E9A',
            '#618D70',
            '#A45352',
            '#BE8A42',
            '#7565A0',
          ],
          borderRadius: 12,
        },
      ],
    };

    this.chartOptions = {
      responsive: true,
      plugins: {
        legend: {
          labels: {
            color: '#495057',
          },
        },
      },
      scales: {
        x: {
          ticks: { color: '#495057' },
          grid: { color: '#ebedef' },
        },
        y: {
          ticks: { color: '#495057' },
          grid: { color: '#ebedef' },
        },
      },
    };
  }
  // Customers by Seriousness
  createSeriousnessChart() {
    const seriousnessCount: any = {};
    this.customers.forEach((c: any) => {
      seriousnessCount[c.seriousness] =
        (seriousnessCount[c.seriousness] || 0) + 1;
    });
    this.seriousnessChartData = {
      labels: Object.keys(seriousnessCount),
      datasets: [
        {
          data: Object.values(seriousnessCount),
          backgroundColor: ['#576E9A', '#618D70', '#7565A0'],
          borderRadius: 50,
        },
      ],
    };

    this.seriousnessChartOptions = {
      cutout: '85%', // Higher percentage = Thinner ring. Try '85%' for even thinner.
      plugins: {
        legend: {
          position: 'bottom',
          labels: {
            usePointStyle: true,
            padding: 20,
          },
        },
      },

      maintainAspectRatio: false,
    };
  }

  countVideoFunc() {
    this._shareVideoService.getAllVideos().subscribe({
      next: (res: any) => {
        this.sharedCount = res.length;
      },
      error: (err) => {
        console.log('Something went wrong!', err);
      },
    });
  }

  countShareFunc() {
    this._shareVideoService.getAllShareLink().subscribe({
      next: (res: any) => {
        this.sharedLinks = res.length;
      },
      error: (err) => {
        console.log('Something went wrong!', err);
      },
    });
  }

  countSelectionFunc() {
    this._shareVideoService.selectionList().subscribe({
      next: (res: any) => {
        this.selectionCount = res.length;
      },
      error: (err) => {
        console.log('Something went wrong!', err);
      },
    });
  }
}
