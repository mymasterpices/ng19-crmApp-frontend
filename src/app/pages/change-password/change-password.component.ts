import { Component, inject } from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  AbstractControl,
  ValidationErrors,
  ReactiveFormsModule
} from '@angular/forms';
import { CardModule } from 'primeng/card';
import { PasswordModule } from 'primeng/password';
import { ButtonModule } from 'primeng/button';
import { FloatLabelModule } from 'primeng/floatlabel';
import { MessageService } from 'primeng/api';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-change-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CardModule,
    PasswordModule,
    ButtonModule,
    FloatLabelModule,
  ],
  templateUrl: './change-password.component.html',
  styleUrl: './change-password.component.css'
})
export class ChangePasswordComponent {

  private loginService = inject(ApiService);
  private mesageService = inject(MessageService);
  changePasswordForm = new FormGroup(
    {
      newPassword: new FormControl('', [Validators.required]),
      confirmNewPassword: new FormControl('', [Validators.required])
    },
    { validators: this.passwordMatchValidator }
  );

  passwordMatchValidator(group: AbstractControl): ValidationErrors | null {
    const password = group.get('newPassword')?.value;
    const confirm = group.get('confirmNewPassword')?.value;
    return password === confirm ? null : { passwordMismatchErr: true };
  }

  onSubmit() {
    if (this.changePasswordForm.invalid) {
      this.changePasswordForm.markAllAsTouched();
      return;
    }
    const formValues = this.changePasswordForm.value;
    //exclude newpassword from the object keep confirmNewPassword only
    const confirmPasswordInput = {
      confirmNewPassword: formValues.confirmNewPassword
    };
    // Add logic to update the password via API here
    this.loginService.changePassword(confirmPasswordInput).subscribe({
      next: (response: any) => {
        console.log('Password changed successfully:', response);
        this.mesageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Password changed successfully!'
        });
        // Reset the form after successful submission
        this.changePasswordForm.reset();
      },
      error: (error: any) => {
        console.error('Error changing password:', error);
      }
    });

  }
}
