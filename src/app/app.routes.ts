import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { AdminComponent } from './pages/admin/admin.component';

import { ChangePasswordComponent } from './pages/change-password/change-password.component';
import { AllUsersComponent } from './pages/users/all-users/all-users.component';

import { authGuard } from './guard/auth.guard';
import { ViewCustomerComponent } from './pages/customers/view-customer/view-customer.component';
import { SearchComponent } from './pages/search/search.component';
import { rolecheckGuard } from './guard/rolecheck.guard';
import { SoldEntryComponent } from './pages/solds/sold-entry/sold-entry.component';
import { SoldItemsComponent } from './pages/solds/sold-items/sold-items.component';
import { ViewSoldItemsComponent } from './pages/solds/view-sold-items/view-sold-items.component';

import { ViewAllComponent } from './pages/videos/view-all/view-all.component';
import { SharedLinksComponent } from './pages/videos/shared-links/shared-links.component';
import { OverviewComponent } from './pages/overview/overview.component';
import { MyplaylistComponent } from './pages/videos/myplaylist/myplaylist.component';
import { AddNewComponent } from './pages/customers/add-new/add-new.component';
import { TodayComponent } from './pages/customers/today/today.component';
import { MissedComponent } from './pages/customers/missed/missed.component';
import { ProductsViewAllComponent } from './pages/products/products-view-all/products-view-all.component';
import { ViewDetailsComponent } from './pages/products/view-details/view-details.component';
import { CustomerViewAllComponent } from './pages/customers/customer-view-all/customer-view-all.component';
import { CompareComponent } from './pages/products/compare/compare.component';
import { ShowFootfallComponent } from './pages/footfall/show-footfall/show-footfall.component';
import { ViewFootfallEntryComponent } from './pages/footfall/view-footfall-entry/view-footfall-entry.component';
import { OrderDashboardComponent } from './pages/orders/order-dashboard/order-dashboard.component';
import { NewOrderComponent } from './pages/orders/new-order/new-order.component';
import { AllOrdersComponent } from './pages/orders/all-orders/all-orders.component';
import { OrderDetailComponent } from './pages/orders/order-detail/order-detail.component';
import { ChangeStatusComponent } from './pages/orders/change-status/change-status.component';
import { OrderReportComponent } from './pages/orders/order-report/order-report.component';
import { EditOrderComponent } from './pages/orders/edit-order/edit-order.component';
import { KarigarDashboardComponent } from './pages/karigar/karigar-dashboard/karigar-dashboard.component';
import { ImageSearchComponent } from './pages/image-search/image-search.component';
import { ManageTargetComponent } from './pages/manage-target/manage-target.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AdminComponent,
    canActivate: [authGuard],
    children: [
      { path: 'overview', component: OverviewComponent },
      { path: 'customers/view-all', component: CustomerViewAllComponent },
      { path: 'customers/add-new', component: AddNewComponent },
      { path: 'followup/todays', component: TodayComponent },
      { path: 'followup/missed', component: MissedComponent },
      { path: 'sold-items/sold-entry', component: SoldEntryComponent },
      { path: 'sold-items/sold-items', component: SoldItemsComponent },
      { path: 'view-sold-items/:id', component: ViewSoldItemsComponent },
      { path: 'change-password', component: ChangePasswordComponent },
      {
        path: 'all-users',
        component: AllUsersComponent,
        canActivate: [authGuard, rolecheckGuard],
        data: { expectedRole: 'admin' },
      },
      { path: 'view-customer/:id', component: ViewCustomerComponent },
      { path: 'search/:customer_name', component: SearchComponent },
      { path: 'products/view-all', component: ProductsViewAllComponent },
      { path: 'view-details/:jewel_code', component: ViewDetailsComponent },
      { path: 'videos/view-all', component: ViewAllComponent },
      { path: 'videos/shared-links', component: SharedLinksComponent },
      { path: 'image-search', component: ImageSearchComponent },
      {
        path: 'products/compare',
        component: CompareComponent,
        data: { expectedRole: 'admin' },
      },
      {
        path: 'footfall/show-footfall',
        component: ShowFootfallComponent,
        data: { expectedRole: 'admin' },
      },
      {
        path: 'footfall/view-footfall-entry/:user_id',
        component: ViewFootfallEntryComponent,
        data: { expectedRole: 'admin' },
      },
      {
        path: 'orders/order-dashboard',
        component: OrderDashboardComponent,
      },
      { path: 'orders/new-order', component: NewOrderComponent },
      { path: 'orders/all-orders', component: AllOrdersComponent },
      { path: 'orders/all-orders/:status', component: AllOrdersComponent },
      { path: 'orders/order-detail/:id', component: OrderDetailComponent },
      { path: 'orders/change-status', component: ChangeStatusComponent },
      { path: 'orders/order-report', component: OrderReportComponent },
      { path: 'orders/edit-order/:id', component: EditOrderComponent },
      { path: 'manage-targets', component: ManageTargetComponent },
      //karigar routes
      {
        path: 'karigar/karigar-dashboard',
        component: KarigarDashboardComponent,
        canActivate: [rolecheckGuard],
        data: { expectedRole: 'karigar' },
      },

      // temp routes
      {
        path: 'footfall/footfall-sheet',
        loadComponent: () =>
          import('./pages/footfall-sheet/footfall-sheet').then(
            (m) => m.FootfallSheetComponent,
          ),
        data: { expectedRole: 'admin' },
        canActivate: [rolecheckGuard],
      },
    ],
  },
  {
    path: 'myplaylist/:token',
    component: MyplaylistComponent,
  },
  { path: '**', redirectTo: 'login' },
];
