/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';

@Component({
  selector: 'app-toast',
  standalone: true,
  templateUrl: './toast.component.html',
  styleUrls: ['./toast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToastComponent {
  // Fix: Explicitly type injected service to resolve 'unknown' property errors.
  private readonly toastService: ToastService = inject(ToastService);
  readonly translationService = inject(TranslationService);
  readonly toasts = this.toastService.toasts;

  removeToast(id: number): void {
    this.toastService.remove(id);
  }
}