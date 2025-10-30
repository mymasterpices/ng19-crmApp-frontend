import { Component, EventEmitter, OnInit, Output, signal } from '@angular/core';
import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { Location } from '@angular/common';
import { InputTextModule } from 'primeng/inputtext';
import { DropdownModule } from 'primeng/dropdown';
import { InputNumberModule } from 'primeng/inputnumber';
import { FileUploadModule } from 'primeng/fileupload';
import { MultiSelectModule } from 'primeng/multiselect';
import { ButtonModule } from 'primeng/button';
import { Select } from 'primeng/select';
import { FileUpload } from 'primeng/fileupload';
import { CardModule } from 'primeng/card';
import { SharevideosService } from '../../../services/sharevideos.service';
import { MessageService } from 'primeng/api';
import { ToastModule } from 'primeng/toast';
import { FloatLabel } from 'primeng/floatlabel';

interface Categories {
  name: string;
}

interface UploadEvent {
  files: File[];
}
@Component({
  selector: 'app-upload-new-video',
  imports: [
    FormsModule,
    InputTextModule,
    DropdownModule,
    InputNumberModule,
    FileUploadModule,
    ButtonModule,
    MultiSelectModule,
    Select,
    ToastModule,
    CardModule,
    ReactiveFormsModule,
    FileUpload,
    FloatLabel,
  ],
  templateUrl: './upload-new-video.component.html',
  styleUrl: './upload-new-video.component.css',
})
export class UploadNewVideoComponent implements OnInit {
  @Output() close = new EventEmitter<void>();

  constructor(
    private SharevideosService: SharevideosService,
    private messageService: MessageService
  ) {}

  addVideoForm: FormGroup = new FormGroup({
    tagNumber: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
    videoUpload: new FormControl(null, [Validators.required]),
    tags: new FormControl([]),
    category: new FormControl(null, [Validators.required]),
  });

  uploadedFiles: File[] = [];
  categories: Categories[] = [
    { name: 'Rings' },
    { name: 'Earrings' },
    { name: 'Bracelets' },
    { name: 'Bangles' },
    { name: 'Necklaces' },
    { name: 'Brooches & Pins' },
    { name: 'Cufflinks & Tie Pins' },
  ];

  //declare tag as value
  tag = [
    { name: 'Studs' },
    { name: 'Hoops' },
    { name: 'Drops' },
    { name: 'Chandeliers' },
    { name: 'Ear Cuffs' },
    { name: 'Chains' },
    { name: 'Pendants' },
    { name: 'Chokers' },
    { name: 'Lockets' },
    { name: 'Engagement' },
    { name: 'Wedding' },
    { name: 'Emerald' },
    { name: 'Ruby' },
    { name: 'Sapphire' },
    { name: 'Polki' },
    { name: 'Temple Jewelry' },
    { name: 'Kundan' },
  ];

  ngOnInit() {
    // console.log('Form data:', this.addVideoForm.value);
  }

  onChangeCategory($event: string): void {
    this.SharevideosService.getTagWithCategory($event).subscribe({
      next: (response: any) => {
        const category = response.category;

        if (!category) {
          this.messageService.add({
            severity: 'error',
            summary: 'Error',
            detail: 'Category not found',
          });
          return;
        }
        console.log('Category:', category.tags);
        // const tagList = category.tags;
        // this.tag.set(tagList);
      },
      error: (error) => {
        console.error('Error fetching category tags:', error);
        // this.tag.set([]);
      },
    });
  }

  onUpload(event: UploadEvent) {
    this.uploadedFiles = event.files;
    this.addVideoForm.patchValue({
      videoUpload: this.uploadedFiles,
    });
    this.messageService.add({
      severity: 'info',
      summary: 'File Selected',
      detail: '',
    });
    // console.log('Uploaded files:', this.uploadedFiles);
  }

  // dynamic button text
  isUploading = signal('Save');

  onSubmit() {
    this.isUploading.set('Uploading...');
    const formValues = { ...this.addVideoForm.value };

    // 🟡 Extract category name if it's an object
    if (
      formValues.category &&
      typeof formValues.category === 'object' &&
      formValues.category.name
    ) {
      formValues.category = formValues.category.name;
    }

    // ✅ Prepare FormData for upload
    const formData = new FormData();
    formData.append('tagNumber', formValues.tagNumber || '');

    formData.append('category', formValues.category || '');

    // ✅ Properly append `tags` as a JSON string
    if (Array.isArray(formValues.tags)) {
      formData.append('tags', JSON.stringify(formValues.tags));
    } else {
      formData.append('tags', '[]');
    }

    // ✅ Append video file
    if (this.uploadedFiles && this.uploadedFiles.length > 0) {
      formData.append('videoUpload', this.uploadedFiles[0]);
    } else {
      this.messageService.add({
        severity: 'error',
        summary: 'Missing Video',
        detail: 'Please upload a video.',
      });
      return;
    }

    console.log('Submitting FormData:', formValues);

    // ✅ Call the service
    this.SharevideosService.uploadVideo(formData).subscribe({
      next: (res) => {
        console.log('Response:', res);
        this.messageService.add({
          severity: 'success',
          summary: 'Video Uploaded',
          detail: 'Data inserted successfully',
        });
        this.addVideoForm.reset();
        this.isUploading.set('Save');
        //close dialog
        // Refresh the video list in the parent component
        this.close.emit();
        // this.getAllVideoData();
      },
      error: (err) => {
        console.error('Upload error:', err);
        this.messageService.add({
          severity: 'error',
          summary: 'Upload Failed',
          detail: err.error?.message,
        });
        this.isUploading.set('Re-try');
      },
    });
  }
}
