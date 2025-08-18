import { Component, inject, OnInit, signal, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { CardModule } from 'primeng/card';
import { CommonModule, NgClass, TitleCasePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { FloatLabel } from 'primeng/floatlabel';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { DialogModule } from 'primeng/dialog';
import { Popover } from 'primeng/popover';
import { PopoverModule } from 'primeng/popover';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ConfirmDialog } from 'primeng/confirmdialog';
import { AvatarModule } from 'primeng/avatar';
import { FileUpload } from 'primeng/fileupload';
import { TooltipModule } from 'primeng/tooltip';
import { DatePickerModule } from 'primeng/datepicker';
import { ApiService } from '../../services/api.service';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-view-customer',
  imports: [
    CardModule,
    TitleCasePipe,
    ButtonModule,
    InputTextModule,
    FloatLabel,
    ReactiveFormsModule,
    ButtonModule,
    DialogModule,
    PopoverModule,
    CommonModule,
    ConfirmDialog,
    AvatarModule,
    TitleCasePipe,
    FileUpload,
    TooltipModule,
    NgClass,
    DatePickerModule,
    FormsModule,
  ],
  providers: [ConfirmationService],
  templateUrl: './view-customer.component.html',
  styleUrl: './view-customer.component.css',
})
export class ViewCustomerComponent implements OnInit {
  @ViewChild('op') op!: Popover;
  @ViewChild('deleteMsg') opDelete!: Popover;

  private confirmationService = inject(ConfirmationService);
  private messageService = inject(MessageService);

  customerId!: string;
  customerData: any;
  customerContactInfo: any;
  visible: boolean = false;
  visibleProductImage: boolean = false;
  isOpen = false;
  backedAppUrl = environment.apiUrl;

  toggle(event: any) {
    this.op.toggle(event);
  }

  viewLargeProductImage() {
    this.visibleProductImage = true;
  }

  constructor(
    private route: ActivatedRoute,
    private loginService: ApiService,
    private _activatedRoute: ActivatedRoute
  ) {}

  // add new chat comment
  chatForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  ngOnInit(): void {
    this.route.paramMap.subscribe((params) => {
      const id = params.get('id');
      if (id) {
        this.customerId = id;
        this.getChatHistory(id);
        this.getCustomerData();
      }
    });
    // Initialize menu items
  }
  getChatHistory(customer_id: string) {
    return this.loginService.getChatHistory(customer_id).subscribe(
      (res: any) => {
        console.log('Customer:', customer_id);
        console.log(res);
        this.customerData = res;
      },
      (error: any) => {
        console.log(error);
      }
    );
  }

  getCustomerData() {
    this._activatedRoute.params.subscribe((params) => {
      this.customerId = params['id'];
      this.loginService.viewCustomer(this.customerId).subscribe(
        (res: any) => {
          console.log('Customer:', this.customerId);
          console.log(res);
          this.customerContactInfo = res;
        },
        (error: any) => {
          console.log(error);
        }
      );
    });
  }

  submitChat() {
    this._activatedRoute.params.subscribe((params) => {
      this.customerId = params['id'];
      // console.log(this.customerId);

      if (this.chatForm.valid) {
        const chat = this.chatForm.value;
        const customer_id = this.customerId;
        this.loginService.updateChat(customer_id, chat).subscribe(
          (res: any) => {
            console.log('Chat updated successfully:', res);
            this.getChatHistory(this.customerId);
            this.chatForm.reset();
          },
          (error: any) => {
            console.error('Error updating chat:', error);
          }
        );
      } else {
        console.error('Chat form is invalid');
      }
    });
  }

  //edit previous chat
  editChatId!: string; // Variable to hold the chat ID for editing
  showDialog(chat_id: string) {
    this.visible = true;
    console.log(chat_id);
    this.editChatId = chat_id;
  }

  // get chat history
  editChatForm = new FormGroup({
    message: new FormControl('', [Validators.required]),
  });

  submitEditChat() {
    this._activatedRoute.params.subscribe((params) => {
      this.customerId = params['id'];
      const chat_id = this.editChatId; // Assuming chat_id is part of the form

      if (this.editChatForm.valid) {
        const chat = this.editChatForm.value;
        this.loginService.editChat(this.customerId, chat_id, chat).subscribe(
          (res: any) => {
            console.log('Chat updated successfully:', res);
            this.getChatHistory(this.customerId);
            this.editChatForm.reset();
            this.visible = false; // Close the dialog after editing
          },
          (error: any) => {
            console.error('Error updating chat:', error);
          }
        );
      } else {
        console.error('Edit chat form is invalid');
      }
    });
  }

  //delete chat
  deleteChat(deleteChat_id: string) {
    console.log(deleteChat_id);
    this.confirmationService.confirm({
      message: 'Are you sure that you want to delete?',
      header: 'Delete chat',
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
        severity: 'danger',
      },
      accept: () => {
        this.loginService.deleteChat(this.customerId, deleteChat_id).subscribe(
          (res: any) => {
            console.log(res);
            this.messageService.add({
              severity: 'success',
              summary: 'Success',
              detail: res.message,
            });
            this.getChatHistory(this.customerId);
          },
          (error: any) => {
            console.log(error);
            this.messageService.add({
              severity: 'error',
              summary: 'Error',
              detail: error.error.message,
            });
          }
        );
      },
    });
  }

  //updatecustomer status
  followUpDate: Date | null = null;

  updateFollowUpDate(newDate: Date) {
    console.log(newDate);
    this._activatedRoute.params.subscribe((params) => {
      this.customerId = params['id'];
      const customer_id = this.customerId;
      const nextFollowUp = { nextFollowUpDate: newDate };

      console.log(customer_id, newDate);
      this.loginService.updateCustomer(customer_id, nextFollowUp).subscribe(
        (res: any) => {
          // console.log(res);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: res.message,
          });
          this.getCustomerData();
        },
        (error: any) => {
          console.log(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error.message,
          });
        }
      );
    });
  }
  updateStatus(status: string) {
    this._activatedRoute.params.subscribe((params) => {
      this.customerId = params['id'];
      const customer_id = this.customerId;
      const changeStatus = { status: status };

      console.log(customer_id, status);
      this.loginService.updateCustomer(customer_id, changeStatus).subscribe(
        (res: any) => {
          // console.log(res);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: res.message,
          });
          this.getCustomerData();
        },
        (error: any) => {
          console.log(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error.message,
          });
        }
      );
    });
  }

  selectedFile: File | null = null;
  uploadButtonlabel = signal('Upload Image');
  onBasicUploadAuto(event: any) {
    this.uploadButtonlabel.set('Uploading...');
    this.selectedFile = event.files[0];
    const formData = new FormData();

    if (this.selectedFile) {
      formData.append(
        'productImage',
        this.selectedFile,
        this.selectedFile.name
      );
    }

    this._activatedRoute.params.subscribe((params) => {
      this.customerId = params['id'];
      const customer_id = this.customerId;
      formData.append('customer_id', customer_id);
      console.log('Form Data:', formData);

      this.loginService.updateCustomer(customer_id, formData).subscribe(
        (res: any) => {
          // console.log(res);
          this.messageService.add({
            severity: 'success',
            summary: 'Success',
            detail: res.message,
          });
          this.getCustomerData();
          this.uploadButtonlabel.set('Upload Image');
          this.selectedFile = null; // Reset the selected file after upload
        },
        (error: any) => {
          console.log(error);
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: error.error.message,
          });
          this.uploadButtonlabel.set('Upload Image');
          this.selectedFile = null; // Reset the selected file after upload
        }
      );
    });
  }
}
