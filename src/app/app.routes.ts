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
      {
        path: 'products/compare',
        component: CompareComponent,
      },
      { path: 'footfall/show-footfall', component: ShowFootfallComponent },
      {
        path: 'footfall/view-footfall-entry/:user_id',
        component: ViewFootfallEntryComponent,
      },
    ],
  },
  {
    path: 'myplaylist/:token',
    component: MyplaylistComponent,
  },
  { path: '**', redirectTo: 'login' },
];
