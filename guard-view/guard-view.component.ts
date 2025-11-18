/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, ElementRef, inject, output, signal, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PickupStateService } from '../pickup-state.service';

@Component({
  selector: 'app-guard-view',
  templateUrl: './guard-view.component.html',
  styleUrls: ['./guard-view.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class GuardViewComponent {
  pickupState = inject(PickupStateService);
  logoutRequest = output<void>();

  // Component-specific state
  guardInputCode = signal<string>('');
  verificationError = signal<string | null>(null);
  justConfirmedPickup = signal<boolean>(false);

  @ViewChild('guardCodeInput') guardCodeInput!: ElementRef<HTMLInputElement>;

  logout = () => this.logoutRequest.emit();

  onGuardCodeInput(event: Event): void {
    const value = (event.target as HTMLInputElement).value;
    this.guardInputCode.set(value.replace(/[^0-9]/g, '').substring(0, 4));
  }
  
  simulateScan(): void {
    const code = this.pickupState.pickupCode();
    if (code) {
      this.guardInputCode.set(code);
      this.verifyCode();
    }
  }

  verifyCode(): void {
    this.verificationError.set(null);
    const isValid = this.pickupState.verifyCode(this.guardInputCode());
    if (!isValid) {
      this.verificationError.set('الرمز غير صحيح. يرجى المحاولة مرة أخرى.');
      if (this.guardCodeInput) {
        const el = this.guardCodeInput.nativeElement;
        el.classList.add('animate-shake');
        setTimeout(() => el.classList.remove('animate-shake'), 600);
      }
    }
  }
  
  confirmPickup(): void {
    this.pickupState.confirmPickup();
    this.justConfirmedPickup.set(true);
    setTimeout(() => {
      this.justConfirmedPickup.set(false);
      this.guardInputCode.set('');
      this.verificationError.set(null);
      // The service will reset verifiedPickup as part of the global state reset
    }, 3000);
  }
}
