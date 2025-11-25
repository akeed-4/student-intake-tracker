/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';
import { NotificationService } from '../../services/notification.service';

@Component({
  selector: 'app-broadcast',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './broadcast.component.html',
  styleUrls: ['./broadcast.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BroadcastComponent {
  readonly translationService = inject(TranslationService);
  private readonly toastService = inject(ToastService);
  private readonly notificationService = inject(NotificationService);

  message = signal('');

  sendMessage(): void {
    if (!this.message().trim()) return;

    this.notificationService.sendBroadcast(this.message().trim());
    this.toastService.show(this.translationService.translate('broadcast.toast.sent'), 'success');
    this.message.set('');
  }
}
