import { Routes } from '@angular/router';
import { LoginComponent } from './pages/login/login.component';
import { AdminComponent } from './pages/admin/admin.component';
import { AddNewComponent } from './pages/add-new/add-new.component';
import { TodayComponent } from './pages/today/today.component';
import { MissedComponent } from './pages/missed/missed.component';
import { ChangePasswordComponent } from './pages/change-password/change-password.component';
import { AllUsersComponent } from './pages/all-users/all-users.component';
import { AddNewUserComponent } from './pages/add-new-user/add-new-user.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { authGuard } from './guard/auth.guard';
import { ViewCustomerComponent } from './pages/view-customer/view-customer.component';
import { SearchComponent } from './pages/search/search.component';
import { rolecheckGuard } from './guard/rolecheck.guard';
import { SoldEntryComponent } from './pages/sold-entry/sold-entry.component';
import { SoldItemsComponent } from './pages/sold-items/sold-items.component';
import { ViewSoldItemsComponent } from './pages/view-sold-items/view-sold-items.component';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: AdminComponent,
    canActivate: [authGuard],
    children: [
      { path: 'dashboard', component: DashboardComponent },
      { path: 'add-new', component: AddNewComponent },
      { path: 'today', component: TodayComponent },
      { path: 'missed', component: MissedComponent },
      { path: 'sold-entry', component: SoldEntryComponent },
      { path: 'sold-items', component: SoldItemsComponent },
      { path: 'view-sold-items/:id', component: ViewSoldItemsComponent },
      { path: 'change-password', component: ChangePasswordComponent },
      {
        path: 'all-users',
        component: AllUsersComponent,
        canActivate: [authGuard, rolecheckGuard],
        data: { expectedRole: 'admin' },
      },
      {
        path: 'add-new-user',
        component: AddNewUserComponent,
        canActivate: [authGuard, rolecheckGuard],
        data: { expectedRole: 'admin' },
      },
      { path: 'view-customer/:id', component: ViewCustomerComponent },
      { path: 'search/:customer_name', component: SearchComponent },
    ],
  },
  { path: '**', redirectTo: 'login' },
];
