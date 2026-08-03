import {
  Component,
  EventEmitter,
  OnInit,
  Output,
  inject,
  signal,
} from '@angular/core';
import {
  FormGroup,
  FormControl,
  Validators,
  ReactiveFormsModule,
  FormsModule,
} from '@angular/forms';
import { MessageService } from 'primeng/api';
import { CardModule } from 'primeng/card';
import { FloatLabel } from 'primeng/floatlabel';
import { InputGroupModule } from 'primeng/inputgroup';
import { InputTextModule } from 'primeng/inputtext';
import { TextareaModule } from 'primeng/textarea';
import { DatePickerModule } from 'primeng/datepicker';
import { InputNumberModule } from 'primeng/inputnumber';
import { SelectModule } from 'primeng/select';
import { FileUpload } from 'primeng/fileupload';
import { ButtonModule } from 'primeng/button';
import { jwtDecode } from 'jwt-decode';
import { CheckboxModule } from 'primeng/checkbox';
import { ApiService } from '../../../services/api.service';
import { AuthService } from '../../../services/auth.service';
import { OrderServices } from '../../../services/orders/order-services';
import { MultiSelectModule } from 'primeng/multiselect';

interface FileWithPreview {
  files: File[];
}

@Component({
  selector: 'app-add-new',
  templateUrl: './add-new.component.html',
  styleUrl: './add-new.component.css',
  imports: [
    ReactiveFormsModule,
    CardModule,
    FloatLabel,
    InputGroupModule,
    InputTextModule,
    TextareaModule,
    DatePickerModule,
    InputNumberModule,
    SelectModule,
    FileUpload,
    ButtonModule,
    CheckboxModule,
    MultiSelectModule,
  ],
})
export class AddNewComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  private messageService = inject(MessageService);
  private loginService = inject(ApiService);
  private _authService = inject(AuthService);
  private _orderServices = inject(OrderServices);

  status = [
    { name: 'Open' },
    { name: 'Cold' },
    { name: 'Close' },
    { name: 'Swarnteras' },
  ];
  seriousness = [{ name: 'High' }, { name: 'Low' }, { name: 'Neutral' }];

  selectedFile: File | null = null;
  checked: boolean = false;

  // ── Lists ───────────────────────────────
  categoryList: any[] = [];

  customerForm = new FormGroup({
    name: new FormControl('', Validators.required),
    mobile: new FormControl(null, [Validators.required]),
    productName: new FormControl('', Validators.required),
    itemCategory: new FormControl('', Validators.required),
    price: new FormControl(null, Validators.required),
    nextFollowUpDate: new FormControl<Date | null>(null, Validators.required),
    newcustomer: new FormControl(''),
    visitedOn: new FormControl<Date | null>(null),
    status: new FormControl(null, Validators.required),
    seriousness: new FormControl(null, Validators.required),
    conversation: new FormControl('', Validators.required),
    productImage: new FormControl<File | null>(null, Validators.required),
    salesperson: new FormControl<string | null>(null, Validators.required),
  });

  ngOnInit() {
    this.userID = this._authService.getUserId();
    //get category list
    this.getCategoryList();
  }

  onFileSelected(event: FileWithPreview) {
    this.selectedFile = event.files[0];
    this.customerForm.patchValue({ productImage: this.selectedFile });
    this.messageService.add({
      severity: 'info',
      summary: 'File Selected',
      detail: this.selectedFile.name,
    });
  }

  isSaving = signal(<boolean>false);
  userName: string = '';
  userID: string = '';

  getUserName() {
    const token = localStorage.getItem('RkJewellersUser');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.userName = decodedToken?.name || decodedToken?.username || 'Guest';
      //patch the username to the form
      this.customerForm.patchValue({ salesperson: this.userName });
    }
  }

  getCategoryList() {
    this._orderServices.getCategoryList().subscribe({
      next: (res: any) => (this.categoryList = res || []),
    });
  }

  getCategoryName(id: string): string {
    return this.categoryList.find((c) => c._id === id)?.name || id || '';
  }

  onSubmit() {
    this.getUserName();
    const userName = this.userName;
    const userId = this.userID;

    if (!userName && !userId) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'User or userid not found',
      });
      return;
    }

    if (this.customerForm.invalid || !this.selectedFile) {
      this.messageService.add({
        severity: 'error',
        summary: 'Error',
        detail: 'All fields are required including image.',
      });
      return;
    }
    this.isSaving.set(true);

    const formValue = this.customerForm.value;

    const formData = new FormData();
    console.log('Form Value:', formValue);

    formData.append('name', formValue.name as string);
    formData.append('mobile', String(formValue.mobile));
    formData.append('newcustomer', String(formValue.newcustomer));
    formData.append('productName', formValue.productName as string);
    formData.append('price', String(formValue.price));
    formData.append('itemCategory', formValue.itemCategory as string);
    formData.append(
      'nextFollowUpDate',
      new Date(formValue.nextFollowUpDate!).toISOString(),
    );
    formData.append(
      'visitedOn',
      formValue.visitedOn ? new Date(formValue.visitedOn).toISOString() : '',
    );

    // Convert status and seriousness to string
    formData.append('status', (formValue.status as any).name);
    formData.append('seriousness', (formValue.seriousness as any).name);
    formData.append('conversation', formValue.conversation as string);
    formData.append('salesperson', userName);
    formData.append('userId', userId);

    if (this.selectedFile) {
      formData.append(
        'productImage',
        this.selectedFile,
        this.selectedFile.name,
      );
    }

    this.loginService.saveCustomer(formData).subscribe({
      next: (res) => {
        this.messageService.add({
          severity: 'success',
          summary: 'Success',
          detail: 'Customer added successfully',
        });
        this.customerForm.reset();
        this.isSaving.set(true);
        this.close.emit();
      },
      error: (err) => {
        console.error(err);
        this.messageService.add({
          severity: 'error',
          summary: 'Error',
          detail: err.error?.message,
        });
        this.isSaving.set(true);
      },
    });
  }
}
