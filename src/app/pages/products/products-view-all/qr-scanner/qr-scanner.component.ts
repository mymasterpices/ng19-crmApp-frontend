import {
  Component,
  signal,
  Output,
  EventEmitter,
  ViewChild,
  AfterViewInit,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import {
  NgxScannerQrcodeComponent,
  ScannerQRCodeConfig,
  ScannerQRCodeResult,
} from 'ngx-scanner-qrcode';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, NgxScannerQrcodeComponent],
  template: `
    <div class="scanner-shell">
      <ngx-scanner-qrcode
        #action="scanner"
        [config]="config"
        (event)="handleScan($event)"
        (error)="onScanError($event)"
      >
      </ngx-scanner-qrcode>

      <div class="scan-area" [style.border-color]="borderColor()">
        <div class="laser" *ngIf="isScanning()"></div>
      </div>
    </div>

    <div *ngIf="errorMessage()" class="error-msg">
      <p>{{ errorMessage() }}</p>
    </div>
  `,
  styles: [
    `
      /* 3. FIXED SIZE CSS */
      .scanner-shell {
        position: relative;
        width: 100%;
        height: 300px; /* Locked Height */
        background: #000;
        border-radius: 16px;
        overflow: hidden;
        margin-bottom: 1rem;
      }

      ::ng-deep ngx-scanner-qrcode video {
        width: 100% !important;
        height: 100% !important;
        object-fit: cover !important; /* Prevents distortion */
      }

      .scan-area {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 100%;
        height: 300px;
        border-radius: 12px;
        pointer-events: none;
        transition: all 0.3s ease;
        z-index: 10;
      }

      /* 4. LASER ANIMATION */
      .laser {
        width: 100%;
        height: 2px;
        background-color: rgba(0, 255, 0, 0.5);
        position: absolute;
        box-shadow: 0 0 10px 2px rgba(0, 255, 0, 0.4);
        animation: scanning 2s infinite ease-in-out;
      }

      @keyframes scanning {
        0% {
          top: 0;
        }
        50% {
          top: 100%;
        }
        100% {
          top: 0;
        }
      }

      .error-msg {
        color: #ef4444;
        font-size: 0.875rem;
        margin-top: 0.5rem;
        text-align: center;
      }
      /* Ensure the video is not mirrored */
      ngx-scanner-qrcode video {
        transform: scaleX(1) !important;
      }
    `,
  ],
})
export class QrScannerComponent implements AfterViewInit {
  @ViewChild('action') scanner!: NgxScannerQrcodeComponent;
  @Output() scanCompleted = new EventEmitter<string>();

  // Use Signals for state management
  borderColor = signal<string>('#ffffff80'); // Semi-transparent white
  errorMessage = signal<string | null>(null);
  isScanning = signal<boolean>(true);

  // 5. CONFIG: Optimal for Jewelry Tags
  public config: ScannerQRCodeConfig = {
    constraints: {
      video: {
        facingMode: 'environment',
        aspectRatio: { ideal: 1 },
      },
    },
  };

  ngAfterViewInit() {
    // Autostart on load
    setTimeout(() => {
      this.scanner.start();
    }, 500);
  }

  handleScan(event: ScannerQRCodeResult[]): void {
    const result = Array.isArray(event)
      ? event[0]?.value
      : (event as any)?.value;

    if (result) {
      this.borderColor.set('#22c55e'); // Green on success
      this.scanCompleted.emit(result);

      // Note: We DO NOT call this.scanner.stop() here
      // This keeps the camera alive and prevents the black screen.

      // Reset border color after 1.5 seconds
      setTimeout(() => {
        this.borderColor.set('#ffffff80');
      }, 1500);
    }
  }

  onScanError(error: any): void {
    this.errorMessage.set('Camera access failed. Please check permissions.');
    this.borderColor.set('#ef4444'); // Red on error
    console.error('Scan error:', error);
  }
}
