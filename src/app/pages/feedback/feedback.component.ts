import { Component, DestroyRef, OnInit, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HttpErrorResponse } from '@angular/common/http';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  Validators,
} from '@angular/forms';
import {
  catchError,
  debounceTime,
  distinctUntilChanged,
  filter,
  finalize,
  map,
  of,
  switchMap,
  tap,
} from 'rxjs';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { RatingModule } from 'primeng/rating';
import { ButtonModule } from 'primeng/button';

// Adjust this path to wherever the service lives in your project
import {
  Feedback,
  FeedbackPayload,
  FeedbackService,
} from '../../services/Feedback.service';

/** Indian mobile: 10 digits, starts with 6-9 */
const MOBILE_REGEX = /^[6-9]\d{9}$/;
/** PAN: 5 letters, 4 digits, 1 letter (e.g. ABCDE1234F) */
const PAN_REGEX = /^[A-Z]{5}[0-9]{4}[A-Z]$/;

/** Optional field: only validates when a value is present */
function panValidator(control: AbstractControl): ValidationErrors | null {
  const value = (control.value ?? '').toString().trim();
  return !value || PAN_REGEX.test(value) ? null : { pan: true };
}

type Status = { type: 'success' | 'error'; message: string } | null;

@Component({
  selector: 'app-feedback',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    RatingModule,
    ButtonModule,
  ],
  templateUrl: './feedback.component.html',
})
export class FeedbackComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly feedbackService = inject(FeedbackService);
  private readonly destroyRef = inject(DestroyRef);

  readonly today = new Date();

  /** True while the save request is in flight */
  readonly submitting = signal(false);
  /** True while we check the database for the entered mobile */
  readonly lookingUp = signal(false);
  /** The saved record loaded for this mobile (null = new feedback) */
  readonly existing = signal<Feedback | null>(null);
  /** True once a lookup finished and found nothing */
  readonly isNewMobile = signal(false);
  /** Result banner shown after a save attempt */
  readonly status = signal<Status>(null);

  readonly form = this.fb.nonNullable.group({
    mobile: ['', [Validators.required, Validators.pattern(MOBILE_REGEX)]],
    name: [''],
    address: [''],
    dob: this.fb.control<Date | null>(null),
    anniversary: this.fb.control<Date | null>(null),
    pan: ['', [panValidator]],
    rating: this.fb.control<number | null>(null),
    remarks: [''],
  });

  get mobile() {
    return this.form.controls.mobile;
  }

  get pan() {
    return this.form.controls.pan;
  }

  ngOnInit(): void {
    this.watchMobile();
  }

  /**
   * When a complete, valid mobile is entered, look it up.
   * Found  -> pre-fill the rest of the form for editing.
   * 404    -> treat as a new feedback.
   */
  private watchMobile(): void {
    this.mobile.valueChanges
      .pipe(
        map((v) => (v ?? '').trim()),
        distinctUntilChanged(),
        // Number edited or incomplete: drop any previously loaded record
        tap((v) => {
          if (!MOBILE_REGEX.test(v)) this.clearLookup();
        }),
        debounceTime(300),
        filter((v) => MOBILE_REGEX.test(v)),
        tap(() => {
          this.lookingUp.set(true);
          this.isNewMobile.set(false);
        }),
        switchMap((mobile) =>
          this.feedbackService.getByMobile(mobile).pipe(
            // 404 (or any failure) -> treat as new feedback
            catchError((err: HttpErrorResponse) => {
              if (err.status !== 404)
                console.error('Mobile lookup failed:', err);
              return of(null);
            }),
            map((record) => ({ mobile, record })),
          ),
        ),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe(({ mobile, record }) => {
        // Ignore a stale response if the user already changed the number
        if (this.mobile.value !== mobile) return;

        this.lookingUp.set(false);
        if (record) {
          this.applyRecord(record);
        } else {
          this.existing.set(null);
          this.isNewMobile.set(true);
        }
      });
  }

  private applyRecord(record: Feedback): void {
    this.existing.set(record);
    this.isNewMobile.set(false);
    this.status.set(null);

    this.form.patchValue(
      {
        name: record.name ?? '',
        address: record.address ?? '',
        dob: record.dob ? new Date(record.dob) : null,
        anniversary: record.anniversary ? new Date(record.anniversary) : null,
        pan: record.pan ?? '',
        rating: record.rating ?? null,
        remarks: record.remarks ?? '',
      },
      { emitEvent: false },
    );
    this.form.markAsPristine();
  }

  /** Forget the loaded record and blank everything except the mobile field */
  private clearLookup(): void {
    const hadData = this.existing() !== null;
    this.lookingUp.set(false);
    this.isNewMobile.set(false);
    this.existing.set(null);

    if (hadData) {
      this.form.reset({ mobile: this.mobile.value }, { emitEvent: false });
    }
  }

  /** Keep the mobile field numeric and capped at 10 digits */
  onMobileInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const digits = input.value.replace(/\D/g, '').slice(0, 10);
    if (input.value !== digits) {
      input.value = digits;
    }
    this.mobile.setValue(digits);
  }

  /** Force PAN to uppercase alphanumerics, max 10 chars */
  onPanInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const clean = input.value
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .slice(0, 10);
    if (input.value !== clean) {
      input.value = clean;
    }
    this.pan.setValue(clean);
  }

  onSubmit(): void {
    if (this.submitting() || this.lookingUp()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const v = this.form.getRawValue();
    const payload: FeedbackPayload = {
      ...v,
      dob: v.dob ? v.dob.toISOString() : null,
      anniversary: v.anniversary ? v.anniversary.toISOString() : null,
    };

    const current = this.existing();
    console.log(current ? 'Feedback update:' : 'Feedback submitted:', payload);

    this.status.set(null);
    this.submitting.set(true);

    // Existing record -> PUT, otherwise -> POST
    const request$ = current
      ? this.feedbackService.update(current._id, payload)
      : this.feedbackService.create(payload);

    request$.pipe(finalize(() => this.submitting.set(false))).subscribe({
      next: (saved) => {
        console.log('Feedback saved:', saved);
        this.status.set({
          type: 'success',
          message: current
            ? 'Feedback updated successfully.'
            : 'Thank you. Your feedback has been saved.',
        });
        this.existing.set(null);
        this.isNewMobile.set(false);
        this.form.reset();
      },
      error: (err: HttpErrorResponse) => {
        console.error('Feedback save failed:', err);
        this.status.set({ type: 'error', message: this.errorMessage(err) });
      },
    });
  }

  onClear(): void {
    this.form.reset();
    this.existing.set(null);
    this.isNewMobile.set(false);
    this.status.set(null);
  }

  private errorMessage(err: HttpErrorResponse): string {
    if (err.status === 0) {
      return 'Cannot reach the server. Check your connection and try again.';
    }
    if (err.status === 400 && err.error?.errors) {
      return Object.values<string>(err.error.errors).join(' ');
    }
    return (
      err.error?.message ?? 'Could not save your feedback. Please try again.'
    );
  }
}
