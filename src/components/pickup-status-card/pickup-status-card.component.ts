/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, input, output } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { PickupStateService } from '../../services/pickup-state.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { QrCodeComponent } from '../qr-code/qr-code.component';

@Component({
  selector: 'app-pickup-status-card',
  standalone: true,
  imports: [TranslatePipe, QrCodeComponent],
  templateUrl: './pickup-status-card.component.html',
  styleUrls: ['./pickup-status-card.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PickupStatusCardComponent {
  readonly authService = inject(AuthService);
  private readonly pickupStateService = inject(PickupStateService);
  private readonly toastService = inject(ToastService);
  readonly translationService = inject(TranslationService);

  pickupCode = input.required<string>();
  arrivalSignaled = output<void>();

  readonly allRequestsForCode = computed(() => 
    this.pickupStateService.allRequests().filter(r => r.code === this.pickupCode())
  );

  readonly firstRequest = computed(() => this.allRequestsForCode()[0] ?? null);
  
  readonly students = computed(() => this.allRequestsForCode().map(r => r.student));

  readonly studentNames = computed(() => this.students().map(s => s.name).join(', '));

  getShareableText(): string {
    const request = this.firstRequest();
    if (!request) return '';

    const t = (key: string) => this.translationService.translate(key);
    
    const details = [
      t('parent.share.title'),
      '----------------------',
      `${t('parent.share.student')}: ${this.studentNames()}`,
      `${t('parent.share.person')}: ${request.authorizedPerson.name}`,
      `${t('parent.share.vehicle')}: ${request.carInfo.color} - ${request.carInfo.plateNumber}`,
      `${t('parent.share.code')}: ${this.pickupCode()}`,
      `${t('parent.share.eta')}: ~${request.eta ?? 'N/A'} min`
    ];
    return details.join('\n');
  }

  async shareRequest(): Promise<void> {
    const shareText = this.getShareableText();
    const shareTitle = this.translationService.translate('parent.share.title');

    if (!navigator.share) {
      this.copyRequestDetails();
      this.toastService.show(this.translationService.translate('parent.toast.shareNotSupported'), 'info');
      return;
    }

    try {
      await navigator.share({
        title: shareTitle,
        text: shareText,
      });
    } catch (error) {
      console.error('Error using Web Share API:', error);
    }
  }

  copyRequestDetails(): void {
    navigator.clipboard.writeText(this.getShareableText())
      .then(() => {
        this.toastService.show(this.translationService.translate('parent.toast.copied'), 'success');
      })
      .catch(err => {
        console.error('Failed to copy:', err);
        this.toastService.show(this.translationService.translate('parent.toast.copyFailed'), 'error');
      });
  }
}