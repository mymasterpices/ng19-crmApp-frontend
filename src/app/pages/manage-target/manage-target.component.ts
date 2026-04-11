import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  ReactiveFormsModule,
  FormBuilder,
  FormGroup,
  Validators,
} from '@angular/forms';

// PrimeNG 19 Modules
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { ButtonModule } from 'primeng/button';
import { ToastModule } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { DatePickerModule } from 'primeng/datepicker';
import { CardModule } from 'primeng/card';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TargetViewComponent } from '../target-view/target-view.component';
import { TargetService } from '../../services/target/target.service';

@Component({
  selector: 'app-manage-target',
  imports: [
    CommonModule,
    ReactiveFormsModule,
    SelectModule,
    InputNumberModule,
    ButtonModule,
    ToastModule,
    DatePickerModule,
    CardModule,
    FloatLabelModule,
    TargetViewComponent,
  ],
  providers: [MessageService],
  templateUrl: './manage-target.component.html',
})
export class ManageTargetComponent implements OnInit {
  private _fb = inject(FormBuilder);
  private _targetService = inject(TargetService);
  private _messageService = inject(MessageService);

  targetForm!: FormGroup;
  isSaving = false;

  ngOnInit(): void {
    this.initForm();
  }

  initForm(): void {
    this.targetForm = this._fb.group({
      targetDate: [new Date(), Validators.required], // Used to extract month/year
      targets: this._fb.group({
        gold_weight: [, [Validators.required, Validators.min(0)]],
        diamond_weight: [],
        stone_weight: [],
      }),
    });
  }

  saveTarget(): void {
    if (this.targetForm.invalid) {
      this.targetForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    const formValue = this.targetForm.value;
    const date: Date = formValue.targetDate;

    // Construct the payload to match your API requirements
    // Convert gold weight from KG to grams for backend storage
    const payload = {
      month: date.getMonth() + 1,
      year: date.getFullYear(),
      targets: {
        ...formValue.targets,
        gold_weight: formValue.targets.gold_weight * 1000, // Convert KG to grams
      },
    };

    this._targetService.saveTarget(payload).subscribe({
      next: () => {
        this._messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Store-wide target saved successfully.',
        });

        this.isSaving = false;
        this.targetForm.reset({ targetDate: new Date() });
      },
      error: (err) => {
        this._messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message || 'Failed to save target.',
        });
        this.isSaving = false;
      },
    });
  }
}
