/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, ElementRef, input, ViewChild, AfterViewInit, signal, effect } from '@angular/core';

declare var qrcode: any;

@Component({
  selector: 'app-qr-code',
  standalone: true,
  templateUrl: './qr-code.component.html',
  styleUrls: ['./qr-code.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class QrCodeComponent implements AfterViewInit {
  @ViewChild('qrContainer') qrContainer!: ElementRef<HTMLDivElement>;
  
  data = input.required<string>();
  private isViewReady = signal(false);

  constructor() {
    effect(() => {
      if (this.data() && this.isViewReady()) {
        this.waitForQRCodeLibraryAndGenerate();
      }
    });
  }

  ngAfterViewInit(): void {
    this.isViewReady.set(true);
  }

  private generateQRCode(): void {
    const currentData = this.data();
    if (currentData && this.qrContainer) {
      try {
        // Clear previous QR code
        this.qrContainer.nativeElement.innerHTML = '';
        // typeNumber 0 means auto-detect length
        const qr = qrcode(0, 'L'); // Error Correction Level 'L'
        qr.addData(currentData);
        qr.make();
        // create an img tag with specific cell size and margin
        this.qrContainer.nativeElement.innerHTML = qr.createImgTag(6, 4); 
      } catch (e) {
        console.error("Failed to generate QR Code.", e);
      }
    }
  }

  private waitForQRCodeLibraryAndGenerate(retries = 50, delay = 100): void {
    if (typeof qrcode !== 'undefined') {
      this.generateQRCode();
    } else if (retries > 0) {
      setTimeout(() => {
        this.waitForQRCodeLibraryAndGenerate(retries - 1, delay);
      }, delay);
    } else {
      console.error("qrcode-generator library failed to load after several retries.");
    }
  }
}
