

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { SchoolDataService } from '../../services/school-data.service';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';
import { User, UserRole } from '../../models/app-types';
import { TranslatePipe } from '../../pipes/translate.pipe';
// Fix: Import types and EMPTY_FORM from the consolidated app-types.ts
import { AccountManagementEmptyForm, UserWithSchoolName, EMPTY_ACCOUNT_MANAGEMENT_FORM } from '../../models/app-types';

@Component({
  selector: 'app-account-management',
  standalone: true,
  templateUrl: './account-management.component.html',
  styleUrls: ['./account-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe]
})
export class AccountManagementComponent {
  // Fix: Explicitly type injected services to resolve 'unknown' property errors.
  readonly translationService: TranslationService = inject(TranslationService);
  // Fix: Explicitly type injected services to resolve 'unknown' property errors.
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  // Fix: Explicitly type injected services to resolve 'unknown' property errors.
  private readonly toastService: ToastService = inject(ToastService);

  searchTerm = signal('');
  editingUser = signal<UserWithSchoolName | null>(null);
  // Fix: Type editForm signal with AccountManagementEmptyForm and use EMPTY_ACCOUNT_MANAGEMENT_FORM
  editForm = signal<AccountManagementEmptyForm>(EMPTY_ACCOUNT_MANAGEMENT_FORM);
  
  readonly allUsers = computed(() => {
    return this.dataService.users().map(user => {
      const school = user.schoolId ? this.dataService.getSchoolById(user.schoolId) : null;
      return {
        ...user,
        schoolName: school?.name ?? 'N/A'
      };
    });
  });

  readonly filteredUsers = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) {
      return this.allUsers();
    }
    return this.allUsers().filter(user => 
      user.name.toLowerCase().includes(term) ||
      user.email.toLowerCase().includes(term) ||
      user.schoolName.toLowerCase().includes(term)
    );
  });
  
  readonly schools = computed(() => this.dataService.schools());
  readonly classesForSelectedSchool = computed(() => {
    const schoolId = this.editForm().schoolId;
    if (!schoolId) return [];
    return this.dataService.getClassesBySchool(schoolId);
  });

  isEditFormValid = computed(() => {
    const form = this.editForm();
    if (!form.name || !form.email || !form.role) return false;
    
    // School is required for all roles except super-admin
    if (form.role !== 'super-admin' && !form.schoolId) return false;

    // Class is required only for teacher role
    if (form.role === 'teacher' && !form.classId) return false;

    return true;
  });
  
  readonly userRoles: UserRole[] = ['parent', 'guard', 'teacher', 'school-supervisor', 'school-admin', 'super-admin'];

  startEdit(user: UserWithSchoolName): void {
    this.editingUser.set(user);
    this.editForm.set({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      schoolId: user.schoolId || '',
      classId: user.classId || '',
    });
  }

  cancelEdit(): void {
    this.editingUser.set(null);
    this.editForm.set(EMPTY_ACCOUNT_MANAGEMENT_FORM); // Fix: Use EMPTY_ACCOUNT_MANAGEMENT_FORM
  }

  async saveUser(): Promise<void> {
    const originalUser = this.editingUser();
    if (!this.isEditFormValid() || !originalUser) return;
    
    const formValue = this.editForm();
    
    const userFromDB = this.dataService.users().find(u => u.id === originalUser.id);
    if (!userFromDB) return;

    const updatedUser: User = {
      ...userFromDB,
      id: originalUser.id,
      name: formValue.name,
      email: formValue.email,
      role: formValue.role as UserRole,
      schoolId: formValue.role !== 'super-admin' ? formValue.schoolId : undefined,
      classId: formValue.role === 'teacher' ? formValue.classId : undefined,
    };
    
    await this.dataService.updateUser(updatedUser);
    this.toastService.show(this.translationService.translate('super-admin.accountManagement.toast.userUpdated'), 'success');
    this.cancelEdit();
  }

  updateEditForm(field: keyof AccountManagementEmptyForm, value: any): void {
    this.editForm.update(s => {
      const newState = { ...s, [field]: value };
      if (field === 'role' && value !== 'teacher') {
        newState.classId = '';
      }
      if (field === 'schoolId') {
        newState.classId = '';
      }
      return newState;
    });
  }

  async deleteUser(user: User): Promise<void> {
    const isSchoolAdmin = user.role === 'school-admin';
    let confirmationText = this.translationService.translate('super-admin.accountManagement.deleteConfirmationText');
    if (isSchoolAdmin) {
      confirmationText += '\n\n' + this.translationService.translate('super-admin.accountManagement.deleteAdminWarning');
    }

    if (confirm(this.translationService.translate('super-admin.accountManagement.deleteConfirmationTitle') + '\n\n' + confirmationText)) {
      await this.dataService.deleteUserAndAssociatedData(user.id);
      this.toastService.show(this.translationService.translate('super-admin.accountManagement.toast.userDeleted'), 'success');
    }
  }

  getRoleTranslation(role: string): string {
    // Use the generic role translation keys directly
    return this.translationService.translate(`roles.${role}.title`);
  }
}
    