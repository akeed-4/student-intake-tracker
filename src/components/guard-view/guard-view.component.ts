/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  inject,
  OnDestroy,
  signal,
  ViewChild,
  effect,
} from '@angular/core';
import { PickupStateService } from '../../services/pickup-state.service';
import { PickupRequest } from '../../models/app-types';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

declare var Html5Qrcode: any;

@Component({
  selector: 'app-guard-view',
  standalone: true,
  templateUrl: './guard-view.component.html',
  styleUrls: ['./guard-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe],
})
export class GuardViewComponent implements OnDestroy {
  @ViewChild('codeInput') codeInput!: ElementRef<HTMLInputElement>;
  private readonly pickupStateService: PickupStateService = inject(PickupStateService);
  readonly translationService: TranslationService = inject(TranslationService);

  code = signal('');
  verifiedRequest = signal<PickupRequest | null>(null);
  error = signal('');
  isInvalid = signal(false);
  scannerActive = signal(false);
  private scanner: any | null = null;
  private readonly QR_READER_ELEMENT_ID = 'qr-reader';

  constructor() {
    effect((onCleanup) => {
      if (this.scannerActive()) {
        // Defer to ensure the div is in the DOM
        setTimeout(() => this.waitForScannerLibraryAndInitialize(), 0);
        
        onCleanup(() => {
          if (this.scanner?.isScanning) {
            this.scanner.stop().catch((err: any) => {
              console.error("Failed to stop html5-qrcode scanner:", err);
            });
          }
          this.scanner = null;
        });
      }
    });
  }

  onCodeInput(event: Event): void {
    const input = event.target as HTMLInputElement;
    const sanitizedValue = input.value.replace(/[^0-9]/g, '');
    this.code.set(sanitizedValue);
    input.value = sanitizedValue;
  }

  verifyCode(): void {
    this.error.set('');
    this.isInvalid.set(false);

    const request = this.pickupStateService.getRequestByCode(this.code());

    if (request) {
      this.verifiedRequest.set(request);
      if(this.scannerActive()) {
        this.stopScanner();
      }
    } else {
      this.error.set(this.translationService.translate('guard.errors.invalidCode'));
      this.isInvalid.set(true);
      setTimeout(() => this.isInvalid.set(false), 820);
    }
  }

  async confirmPickup(): Promise<void> {
    const currentRequest = this.verifiedRequest();
    if (currentRequest) {
      await this.pickupStateService.updateRequestStatus(currentRequest.code, 'completed');
      this.reset();
    }
  }

  simulateScan(): void {
    const firstRequest = this.pickupStateService.activeRequests().find(r => r.status === 'ready');
    if (firstRequest) {
      this.code.set(firstRequest.code);
      if (this.codeInput) {
        this.codeInput.nativeElement.value = firstRequest.code;
      }
      this.verifyCode();
    } else {
      this.error.set(this.translationService.translate('guard.errors.noReadyRequests'));
    }
  }

  startScanner(): void {
    this.error.set('');
    this.scannerActive.set(true);
  }

  stopScanner(): void {
    this.scannerActive.set(false);
  }
  
  private waitForScannerLibraryAndInitialize(retries = 50, delay = 100) {
    if (typeof Html5Qrcode !== 'undefined') {
      this.initializeScanner();
    } else if (retries > 0) {
      setTimeout(() => this.waitForScannerLibraryAndInitialize(retries - 1, delay), delay);
    } else {
      this.error.set(this.translationService.translate('guard.errors.scannerFailed'));
      this.scannerActive.set(false);
    }
  }

  private async initializeScanner(): Promise<void> {
    if (this.scanner || !document.getElementById(this.QR_READER_ELEMENT_ID)) return;

    this.scanner = new Html5Qrcode(this.QR_READER_ELEMENT_ID, /* verbose= */ false);

    const onScanSuccess = (decodedText: string) => {
      if (decodedText) {
        this.code.set(decodedText);
        this.verifyCode();
      }
    };

    const onScanFailure = (errorMessage: string) => {
      // Ignored. The library will keep scanning.
    };
    
    const config = {
      fps: 10,
      qrbox: { width: 250, height: 250 },
    };
    
    try {
      // First try to get the back camera. The `exact` keyword is a strong preference.
      await this.scanner.start(
        { facingMode: { exact: "environment" } },
        config,
        onScanSuccess,
        onScanFailure
      );
    } catch (err: any) {
      console.warn("Could not get 'environment' camera, trying default.", err);
      // If the back camera fails (e.g., on a laptop), try any available camera.
      try {
        await this.scanner.start(
          {}, // Let the library and browser decide.
          config,
          onScanSuccess,
          onScanFailure
        );
      } catch (fallbackErr: any) {
          console.error("Error starting any camera:", fallbackErr);
          if (fallbackErr?.name === 'NotAllowedError') {
              this.error.set(this.translationService.translate('guard.errors.permissionDenied'));
          } else if (fallbackErr?.name === 'NotFoundError' || (fallbackErr.message && fallbackErr.message.includes('not found'))) {
              this.error.set(this.translationService.translate('guard.errors.noCamera'));
          } else {
              this.error.set(this.translationService.translate('guard.errors.scannerFailed'));
          }
          this.scannerActive.set(false);
      }
    }
  }

  ngOnDestroy(): void {
    // The effect cleanup will handle stopping the scanner
    this.scannerActive.set(false);
  }

  private reset(): void {
    this.code.set('');
    this.verifiedRequest.set(null);
    this.error.set('');
    this.isInvalid.set(false);
    this.stopScanner();
  }
}
