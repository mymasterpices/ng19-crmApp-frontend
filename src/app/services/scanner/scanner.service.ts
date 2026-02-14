import { Injectable, signal } from '@angular/core';
import { ScannerQRCodeConfig, ScannerQRCodeResult } from 'ngx-scanner-qrcode';

@Injectable({
  providedIn: 'root'
})
export class ScannerService {
  // Global configuration for the rear camera
  public readonly config: ScannerQRCodeConfig = {
    constraints: {
      video: {
        facingMode: 'environment', // Priority to rear camera
        aspectRatio: { ideal: 1 },
      }
    },
    canvasStyles: [
      { lineWidth: 2, strokeStyle: '#22c55e', fillStyle: '#22c55e' }
    ]
  };

  // Signal to track the last scanned result globally
  lastScannedResult = signal<string | null>(null);

  constructor() {}

  /**
   * Safe parsing of the scan event
   */
  handleScanEvent(event: ScannerQRCodeResult[]): string | null {
    const result = Array.isArray(event) ? event[0]?.value : (event as any)?.value;
    if (result) {
      this.lastScannedResult.set(result);
      return result;
    }
    return null;
  }

  /**
   * Logic to cycle through cameras if properties exist
   */
  getNextDevice(devices: any[], currentId: string): string {
    if (!devices || devices.length < 2) return currentId;
    const currentIndex = devices.findIndex(d => d.deviceId === currentId);
    const nextIndex = (currentIndex + 1) % devices.length;
    return devices[nextIndex].deviceId;
  }
}