import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { SlicePipe, TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { InputTextModule } from 'primeng/inputtext';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AddNewUserComponent } from '../add-new-user/add-new-user.component';
import { DrawerModule } from 'primeng/drawer'; // Fixed import for v19
import { ConfirmationService, MessageService } from 'primeng/api';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { FootfallService } from '../../../services/footfall/footfall.service';
import { HttpParams } from '@angular/common/http';
import { Subject, debounceTime, distinctUntilChanged } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { AvatarModule } from "primeng/avatar";

@Component({
  selector: 'app-all-users',
  standalone: true,
  imports: [
    CardModule,
    TableModule,
    TitleCasePipe,
    ButtonModule,
    TooltipModule,
    PasswordModule,
    FloatLabel,
    ReactiveFormsModule,
    AddNewUserComponent,
    DrawerModule,
    ConfirmDialogModule,
    ToggleSwitchModule,
    FormsModule,
    InputTextModule,
    AvatarModule,
],
  templateUrl: './all-users.component.html',
  styleUrl: './all-users.component.css',
})
export class AllUsersComponent implements OnInit {
  private loginService = inject(ApiService);
  private _footfallService = inject(FootfallService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  // Signals
  allUsers = signal<any[]>([]);
  isLoading = signal<boolean>(false);

  // UI State
  change_password = false;
  displayBasic = false;
  selectedUserId = '';

  // Search Debounce logic
  private searchSubject = new Subject<string>();

  changePasswordForm = new FormGroup({
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
  });

  constructor() {
    // Initialize Search Debounce
    this.searchSubject
      .pipe(
        debounceTime(400),
        distinctUntilChanged(),
        takeUntilDestroyed(), // Clean up on component destroy
      )
      .subscribe((searchTerm) => {
        this.getAllCustomer(searchTerm);
      });
  }

  ngOnInit(): void {
    this.getAllCustomer();
  }

  // Triggered by template (input)
  onSearch(value: string) {
    this.searchSubject.next(value);
  }

  getAllCustomer(search: string = '') {
    this.isLoading.set(true);
    let params = new HttpParams();

    if (search.trim()) {
      params = params.set('username', search.trim());
    }

    this.loginService.getAllSalesstaff(params).subscribe({
      next: (res: any) => {
        // Filter out admin at the data level
        const filtered = res.filter((user: any) => user.username !== 'admin');
        this.allUsers.set(filtered);
        this.isLoading.set(false);
      },
      error: (error: any) => {
        console.error('Fetch Error:', error);
        this.allUsers.set([]);
        this.isLoading.set(false);
      },
    });
  }

  selectUserForPasswordChange(userId: string) {
    this.selectedUserId = userId;
    this.change_password = true;
  }

  updatePassword(userId: string) {
    if (this.changePasswordForm.invalid) return;

    const payload = {
      password: this.changePasswordForm.value.password,
      userid: userId,
    };

    this.loginService.updatePassword(payload).subscribe({
      next: () => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password updated',
        });
        this.change_password = false;
        this.changePasswordForm.reset();
        this.getAllCustomer();
      },
      error: (err) => console.error(err),
    });
  }

  onStatusToggle(user: any, isChecked: boolean) {
    const newStatus = isChecked ? 'active' : 'inactive';
    this._footfallService.updateUserStatus(user._id, newStatus).subscribe({
      next: () => {
        user.status = newStatus;
        this.messageService.add({
          severity: 'success',
          summary: 'Updated',
          detail: `${user.username} is ${newStatus}`,
        });
      },
      error: (err) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: 'Failed to update status',
        });
      },
    });
  }

  deleteCustomer(user_id: string) {
    this.confirmationService.confirm({
      message: 'Are you sure you want to delete this user?',
      header: 'Confirm Delete',
      icon: 'pi pi-exclamation-triangle',
      accept: () => {
        this.loginService.deleteSalesstaff(user_id).subscribe({
          next: (res: any) => {
            this.messageService.add({
              severity: 'success',
              summary: 'Deleted',
              detail: res.message,
            });
            this.getAllCustomer();
            this.change_password = false;
          },
        });
      },
    });
  }

  copyUserId(userId: string) {
    navigator.clipboard.writeText(userId);
    this.messageService.add({
      severity: 'info',
      summary: 'Copied',
      detail: 'ID copied to clipboard',
    });
  }
}
