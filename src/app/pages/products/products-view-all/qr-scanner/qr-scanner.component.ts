import { Component, signal, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ZXingScannerModule } from '@zxing/ngx-scanner';
import { BarcodeFormat } from '@zxing/library';

@Component({
  selector: 'app-qr-scanner',
  standalone: true,
  imports: [CommonModule, ZXingScannerModule],
  template: `
    <div class="scanner-wrapper">
      <zxing-scanner
        [formats]="allowedFormats"
        (camerasFound)="onCamerasFound($event)"
        (scanSuccess)="onScanSuccess($event)"
        (scanError)="onScanError($event)"
        [autostart]="true"
        [device]="selectedDevice"
        class="rounded-xl"
      ></zxing-scanner>

      <div class="scan-area" [style.border-color]="borderColor()"></div>
    </div>

    <div *ngIf="scannedResult()">
      <h3>Result:</h3>
      <p>{{ scannedResult() }}</p>
    </div>

    <div *ngIf="errorMessage">
      <h3>Error:</h3>
      <p>{{ errorMessage }}</p>
    </div>
  `,
  styles: [
    `
      .scanner-wrapper {
        position: relative;
        width: 100%;
      }

      zxing-scanner {
        width: 100%;
        height: auto;
        display: block;
      }

      .scan-area {
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        width: 250px;
        height: 250px;
        border: 4px dashed;
        box-sizing: border-box;
        pointer-events: none;
        transition: border-color 0.3s ease;
      }
    `,
  ],
})
export class QrScannerComponent {
  allowedFormats = [BarcodeFormat.QR_CODE];
  selectedDevice?: MediaDeviceInfo;

  scannedResult = signal<string | null>(null);
  borderColor = signal<string>('#ffff00'); // default yellow
  errorMessage: string | null = null;

  @Output() scanCompleted = new EventEmitter<string>();

  onCamerasFound(devices: MediaDeviceInfo[]): void {
    if (devices && devices.length > 0) {
      this.selectedDevice = devices[0];
    }
  }

  onScanSuccess(result: string): void {
    this.scannedResult.set(result);
    this.borderColor.set('#00ff00'); // green for success
    this.scanCompleted.emit(result);

    // Reset border after 1 second so scanner is ready for next scan
    setTimeout(() => {
      this.borderColor.set('#ffff00'); // reset to yellow
      this.scannedResult.set(null); // optionally clear scanned result
      this.errorMessage = null; // clear error if any
    }, 1000);
  }

  onScanError(error: any): void {
    this.errorMessage = error;
    this.borderColor.set('#ff0000'); // red on error

    // Reset border after 1 second
    setTimeout(() => {
      this.borderColor.set('#ffff00'); // back to yellow
      this.errorMessage = null;
    }, 1000);

    console.error('Scan error:', error);
  }
}
