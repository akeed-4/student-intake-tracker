/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { inject, Injectable, signal } from '@angular/core';
import { User, School } from '../models/app-types';
import { SchoolDataService } from './school-data.service';
import { ToastService } from './toast.service';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly schoolDataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly translationService: TranslationService = inject(TranslationService);
  
  currentUser = signal<User | null>(null);
  currentUserSchool = signal<School | null>(null);
  // Fix: Add state to manage role selection screen.
  hasSelectedRole = signal(false);
  
  async loginWithCredentials(identifier: string, password: string): Promise<boolean> {
    const identifierLower = identifier.toLowerCase();
    const user = this.schoolDataService.users().find(u =>
        (u.email?.toLowerCase() === identifierLower || u.phone === identifier) && u.password === password
    );

    if (user) {
      this.currentUser.set(user);
      if (user.schoolId) {
        const school = this.schoolDataService.getSchoolById(user.schoolId);
        this.currentUserSchool.set(school ?? null);
      } else {
        this.currentUserSchool.set(null);
      }
      // Fix: Reset role selection status on a new login.
      this.hasSelectedRole.set(false);
      this.toastService.show(this.translationService.translate('login.toast.success', { role: user.role }), 'success');
      return true;
    } else {
      return false;
    }
  }

  async logout(): Promise<void> {
    this.currentUser.set(null);
    this.currentUserSchool.set(null);
    // Fix: Reset role selection status on logout.
    this.hasSelectedRole.set(false);
  }

  // Fix: Implement the missing method to proceed from the role selection screen.
  completeRoleSelection(): void {
    this.hasSelectedRole.set(true);
  }
}
