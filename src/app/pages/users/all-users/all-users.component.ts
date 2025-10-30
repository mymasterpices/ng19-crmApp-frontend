import { Component, inject, OnInit, signal } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import {
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ApiService } from '../../../services/api.service';
import { AddNewUserComponent } from '../add-new-user/add-new-user.component';
import { Drawer } from 'primeng/drawer';
import { ConfirmationService, MessageService } from 'primeng/api';

@Component({
  selector: 'app-all-users',
  imports: [
    CardModule,
    TableModule,
    TitleCasePipe,
    ButtonModule,
    PopoverModule,
    TooltipModule,
    DialogModule,
    PasswordModule,
    FloatLabel,
    ReactiveFormsModule,
    AddNewUserComponent,
    Drawer,
    ConfirmDialogModule,
  ],
  templateUrl: './all-users.component.html',
  styleUrl: './all-users.component.css',
})
export class AllUsersComponent implements OnInit {
  private loginService = inject(ApiService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  allUsers: any[] = [];

  change_password: boolean = false;
  displayBasic: boolean = false;
  //store user id
  user_id: string = '';

  changePasswordForm = new FormGroup({
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
  });

  showDialog(user: string) {
    this.change_password = true;
    this.user_id = user;
    console.log(this.user_id);
  }

  constructor() {}

  ngOnInit(): void {
    this.getAllCustomer();
  }
  //change password
  updatePassword(selectedUserId: string) {
    const newPassword = {
      password: this.changePasswordForm.get('password')?.value,
      userid: selectedUserId,
    };

    this.loginService.updatePassword(newPassword).subscribe({
      next: (res: any) => {
        console.log(res);
        this.getAllCustomer();
        this.changePasswordForm.reset();
        this.change_password = false;
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password updated successfully',
        });
      },
      error: (error: any) => {
        this.changePasswordForm.reset();
        console.log(error);
      },
    });
  }

  //get all customers
  getAllCustomer() {
    this.loginService.getAllSalesstaff().subscribe({
      next: (res: any) => {
        this.allUsers = res;
        console.log(res);
      },
      error: (error: any) => {
        console.log(error);
      },
    });
  }

  selectedUserId: string = '';

  selectUserForPasswordChange(userId: string) {
    this.selectedUserId = userId;
    this.change_password = true;
    console.log('Selected User ID:', userId);
  }

  deleteCustomer(user_id: string) {
    // console.log(user_id);
    this.confirmationService.confirm({
      message: 'Are you sure that you want to user?',
      header: 'Delete a user',
      closable: true,
      closeOnEscape: true,
      icon: 'pi pi-exclamation-triangle',
      rejectButtonProps: {
        label: 'Cancel',
        severity: 'secondary',
        outlined: true,
      },
      acceptButtonProps: {
        label: 'Delete',
      },
      accept: () => {
        this.loginService.deleteSalesstaff(user_id).subscribe(
          (res: any) => {
            console.log(res);
            this.getAllCustomer();
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: res.message,
            });
            //close drawer if open
            this.change_password = false;
          },
          (error) => {
            console.log(error);
          }
        );
      },
    });
  }
}
