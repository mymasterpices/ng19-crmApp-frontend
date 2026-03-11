// crmApp/app/src/app/pages/image-search/image-search.component.ts

import {
  Component,
  ElementRef,
  ViewChild,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { ProgressSpinnerModule } from 'primeng/progressspinner';
import { TooltipModule } from 'primeng/tooltip';
import { DrawerModule } from 'primeng/drawer';
import { MessageService } from 'primeng/api';
import {
  ImageSearchService,
  ImageResult,
} from '../../services/imagesearch/image-search.service';
import { NewOrderComponent } from '../orders/new-order/new-order.component';

@Component({
  selector: 'app-image-search',
  standalone: true,
  imports: [
    CommonModule,
    ButtonModule,
    CardModule,
    ProgressSpinnerModule,
    TooltipModule,
    DrawerModule,
    NewOrderComponent,
  ],
  templateUrl: './image-search.component.html',
})
export class ImageSearchComponent {
  @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;
  @ViewChild('cameraInput') cameraInputRef!: ElementRef<HTMLInputElement>;

  private svc = inject(ImageSearchService);
  private msg = inject(MessageService);

  // ── State ─────────────────────────────────────────────────────────────────
  selectedFile = signal<File | null>(null);
  previewUrl = signal<string | null>(null);
  results = signal<ImageResult[]>([]);
  loading = signal(false);
  isDragging = signal(false);
  searched = signal(false);
  lightbox = signal<ImageResult | null>(null);
  orderDrawer = signal(false); // new order drawer visibility
  topK = signal(12);
  maxDistance = signal(10);

  // Reference image passed to new order (base64 data URL)
  orderRefImage = signal<string | null>(null);
  orderRefName = signal<string>('');

  readonly topKOptions = [6, 12, 24];
  readonly distanceOptions = [
    { label: 'Exact', value: 3 },
    { label: 'Similar', value: 10 },
    { label: 'Loose', value: 20 },
  ];

  hasResults = computed(() => this.results().length > 0);

  // Show "Create Order" button when:
  // - search done AND (no results OR no exact match found)
  showCreateOrder = computed(() => {
    if (!this.searched() || this.loading()) return false;
    const results = this.results();
    if (results.length === 0) return true; // no matches at all
    const hasExact = results.some((r) => r.score >= 0.95);
    return !hasExact; // no identical match
  });

  // ── File / Camera ─────────────────────────────────────────────────────────
  openFilePicker() {
    this.fileInputRef.nativeElement.click();
  }
  openCamera() {
    this.cameraInputRef.nativeElement.click();
  }

  onFileChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (file) this.prepareFile(file);
    (e.target as HTMLInputElement).value = '';
  }

  onDrop(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(false);
    const file = e.dataTransfer?.files?.[0];
    if (file?.type.startsWith('image/')) this.prepareFile(file);
  }

  onDragOver(e: DragEvent) {
    e.preventDefault();
    this.isDragging.set(true);
  }
  onDragLeave() {
    this.isDragging.set(false);
  }

  private prepareFile(file: File) {
    this.selectedFile.set(file);
    this.results.set([]);
    this.searched.set(false);
    const reader = new FileReader();
    reader.onload = (e) => this.previewUrl.set(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  // ── Search ────────────────────────────────────────────────────────────────
  search() {
    const file = this.selectedFile();
    if (!file || this.loading()) return;

    this.loading.set(true);
    this.results.set([]);

    this.svc.search(file, this.topK()).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.searched.set(true);

        if (!res.success) {
          this.msg.add({
            severity: 'warn',
            summary: 'Not ready',
            detail: res.message || 'Images not indexed yet.',
          });
          return;
        }

        this.results.set(res.results);

        if (res.count === 0) {
          this.msg.add({
            severity: 'info',
            summary: 'No matches found',
            detail: 'You can create a new order for this item.',
          });
        }
      },
      error: () => {
        this.loading.set(false);
        this.msg.add({
          severity: 'error',
          summary: 'Search failed',
          detail: 'Make sure the Python service is running on port 8001.',
        });
      },
    });
  }

  // ── Order drawer ──────────────────────────────────────────────────────────

  // Open order drawer — pass searched image as reference
  openOrderDrawer(refImage?: ImageResult) {
    if (refImage) {
      // Use the matched product image as reference
      this.orderRefImage.set(refImage.imageUrl);
      this.orderRefName.set(refImage.filename);
    } else {
      // Use the uploaded query image as reference
      this.orderRefImage.set(this.previewUrl());
      this.orderRefName.set(this.selectedFile()?.name || 'Searched image');
    }
    this.orderDrawer.set(true);
  }

  closeOrderDrawer() {
    this.orderDrawer.set(false);
    this.orderRefImage.set(null);
    this.orderRefName.set('');
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  clear() {
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.results.set([]);
    this.searched.set(false);
    this.lightbox.set(null);
    this.orderDrawer.set(false);
  }

  setTopK(n: number) {
    this.topK.set(n);
    if (this.searched()) this.search();
  }
  setDistance(v: number) {
    this.maxDistance.set(v);
  }
  openLightbox(img: ImageResult) {
    this.lightbox.set(img);
  }
  closeLightbox() {
    this.lightbox.set(null);
  }

  matchLabel(score: number): string {
    if (score >= 0.95) return 'Identical';
    if (score >= 0.85) return 'Very Similar';
    if (score >= 0.7) return 'Similar';
    return 'Loose Match';
  }

  matchBadge(score: number): string {
    if (score >= 0.95) return 'bg-emerald-500 text-white';
    if (score >= 0.85) return 'bg-blue-500 text-white';
    if (score >= 0.7) return 'bg-yellow-400 text-zinc-900';
    return 'bg-zinc-400 text-white';
  }
}
