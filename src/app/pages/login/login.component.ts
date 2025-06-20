import { Component, inject } from '@angular/core';
import { FormControl, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { CheckboxModule } from 'primeng/checkbox';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { RippleModule } from 'primeng/ripple';
import { LoginserviceService } from '../../services/loginservice.service';
import { Router } from '@angular/router';
import { FloatLabel } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';

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
export class LoginComponent {
  private loginService = inject(LoginserviceService);
  private messageService = inject(MessageService);
  constructor(
    private router: Router
  ) { }


  loginFrom = new FormGroup({
    username: new FormControl('', Validators.required),
    password: new FormControl('', Validators.required)
  });

  onSubmit() {
    // console.log(this.loginFrom.value);
    const loginUserInput = this.loginFrom.value
    this.loginService.login(loginUserInput).subscribe({
      next: (res: any) => {
        // console.log(res);
        // console.log(res.token);
        sessionStorage.setItem('RkJewellersUser', res.token);
        this.router.navigate(['/dashboard']);
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
