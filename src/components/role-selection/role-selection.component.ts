/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { AuthService } from '../../services/auth.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { UserRole } from '../../models/app-types';

@Component({
  selector: 'app-role-selection',
  standalone: true,
  templateUrl: './role-selection.component.html',
  styleUrls: ['./role-selection.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe]
})
export class RoleSelectionComponent {
  private readonly authService: AuthService = inject(AuthService);
  readonly translationService: TranslationService = inject(TranslationService);

  readonly currentUser = this.authService.currentUser;
  
  readonly translatedRole = computed(() => {
    const user = this.currentUser();
    if (!user) return '';
    return this.translationService.translate(`roles.${user.role}.title`);
  });

  proceedToDashboard(): void {
    this.authService.completeRoleSelection();
  }
}
