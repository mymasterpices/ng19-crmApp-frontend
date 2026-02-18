import { Component, EventEmitter, inject, OnInit, Output } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { MessageService } from 'primeng/api';
import { TooltipModule } from 'primeng/tooltip';
import { ApiService } from '../../../services/api.service';
@Component({
  selector: 'app-add-new-user',
  imports: [
    CardModule,
    InputTextModule,
    PasswordModule,
    SelectModule,
    FloatLabel,
    ReactiveFormsModule,
    ButtonModule,
    TooltipModule,
    FormsModule,
  ],
  templateUrl: './add-new-user.component.html',
  styleUrl: './add-new-user.component.css',
})
export class AddNewUserComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private loginService = inject(ApiService);
  private messageService = inject(MessageService);

  roles: any[] = [];

  ngOnInit(): void {
    this.roles = [{ name: 'user' }, { name: 'admin' }, { name: 'karigar' }];
  }

  //form data
  addNewSalesman = new FormGroup({
    username: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    password: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    role: new FormControl('', [Validators.required, Validators.minLength(3)]),
  });

  onSubmit() {
    const formValue = this.addNewSalesman.value;
    const userRole: any = formValue.role;

    const user = {
      username: formValue.username,
      password: formValue.password,
      role: userRole.name,
    };

    this.loginService.addSalesstaff(user).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'User Added Successfully',
        });
        // console.log(res);
        this.addNewSalesman.reset();
        this.close.emit();
      },
      error: (error) => {
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: error.error.message,
        });
        console.log(error);
      },
    });
  }
}
