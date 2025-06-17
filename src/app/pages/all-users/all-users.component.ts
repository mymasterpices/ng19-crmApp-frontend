import { Component, inject, OnInit, signal } from '@angular/core';
import { CardModule } from 'primeng/card';
import { TableModule } from 'primeng/table';
import { LoginserviceService } from '../../services/loginservice.service';
import { TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { PopoverModule } from 'primeng/popover';
import { TooltipModule } from 'primeng/tooltip';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { RouterLink } from '@angular/router';
import { DialogModule } from 'primeng/dialog';
import { FloatLabel } from 'primeng/floatlabel';
import { PasswordModule } from 'primeng/password';
import { jwtDecode } from "jwt-decode";
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';



@Component({
  selector: 'app-all-users',
  imports: [
    CardModule,
    TableModule,
    TitleCasePipe,
    ButtonModule,
    PopoverModule, TooltipModule, ConfirmDialog,
    RouterLink, DialogModule, PasswordModule, FloatLabel, ReactiveFormsModule,

  ],
  providers: [ConfirmationService],
  templateUrl: './all-users.component.html',
  styleUrl: './all-users.component.css'
})
export class AllUsersComponent implements OnInit {

  private loginService = inject(LoginserviceService);
  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  allUsers: any[] = [];

  change_password: boolean = false;
  //store user id
  user_id: string = '';



  changePasswordForm = new FormGroup({
    password: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });

  showDialog(user: string) {
    this.change_password = true;
    this.user_id = user;
    console.log(this.user_id);
  }

  constructor() { }

  ngOnInit(): void {
    this.getAllCustomer();

  }
  //change password
  updatePassword() {
    const newPassword = this.changePasswordForm.value;

    this.loginService.updatePassword(this.user_id, newPassword).subscribe({
      next: (res: any) => {
        console.log(res);
        this.getAllCustomer();
        this.changePasswordForm.reset();
        this.change_password = false;
        this.messageService.add({ severity: 'success', summary: 'Success', detail: 'Password updated successfully' });

      },
      error: (error: any) => {
        this.changePasswordForm.reset();
        console.log(error);
      }
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
      }
    });
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
            this.messageService.add({ severity: 'success', summary: 'Success', detail: res.message });
          },
          (error) => {
            console.log(error);
          }
        );
      }
    });
  }


}
