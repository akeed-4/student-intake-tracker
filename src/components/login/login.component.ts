/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { UserRole } from '../../models/app-types';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-login',
  standalone: true,
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe]
})
export class LoginComponent {
  private readonly authService: AuthService = inject(AuthService);
  private readonly toastService: ToastService = inject(ToastService);
  readonly translationService: TranslationService = inject(TranslationService);

  // Set default credentials for demo login
  identifier = signal('parent@school.com');
  password = signal('password');
  loginError = signal('');

  async handleLogin(): Promise<void> {
    this.loginError.set('');
    const success = await this.authService.loginWithCredentials(this.identifier(), this.password());
    if (!success) {
      this.loginError.set(this.translationService.translate('login.errors.invalidCredentials'));
    }
  }
}