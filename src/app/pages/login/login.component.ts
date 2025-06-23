import { Component, inject, OnInit } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { Router } from '@angular/router';
import { FloatLabel } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  imports: [
    ButtonModule, CheckboxModule,
    InputTextModule,
    PasswordModule,
    FormsModule,
    RippleModule,
    ReactiveFormsModule,
    FloatLabel,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.css'
})
export class LoginComponent implements OnInit {
  private authService = inject(AuthService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  constructor() { }
  // login a user to the system
  loginFrom = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  ngOnInit(): void {
    if (this.authService.isloggedIn()) {
      this.router.navigate(['/dashboard']);
    }
  }

  onSubmit() {
    const loginUserInput = this.loginFrom.value;
    this.authService.login(loginUserInput).subscribe({
      next: (res: any) => {
        this.authService.setToken(res.token);
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Login Successfully'
        })
      },
      error: (error: any) => {
        console.log(error);
        this.messageService.add({ severity: 'error', summary: 'Error', detail: error.error.message });
      }
    });

  }

}
