/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { SchoolDataService } from '../../services/school-data.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { User, UserRole, StaffManagementEmptyForm, EMPTY_STAFF_MANAGEMENT_FORM } from '../../models/app-types';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-staff-management',
  standalone: true,
  templateUrl: './staff-management.component.html',
  styleUrls: ['./staff-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe]
})
export class StaffManagementComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthService = inject(AuthService);

  staffForm = signal<StaffManagementEmptyForm>(EMPTY_STAFF_MANAGEMENT_FORM);
  editingStaff = signal<User | null>(null);

  isStaffFormValid = computed(() => {
    const staff = this.staffForm();
    if (!staff.name || !staff.role) return false;
    if (staff.role === 'teacher' && !staff.classId) return false;
    return true;
  });

  readonly staff = computed(() => {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!schoolId) return [];
    return this.dataService.getStaffForSchool(schoolId);
  });
  
  readonly classes = computed(() => {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!schoolId) return [];
    return this.dataService.getClassesBySchool(schoolId);
  });

  updateStaffForm(field: keyof StaffManagementEmptyForm, value: any): void {
    this.staffForm.update(s => ({ ...s, [field]: value }));
  }

  startEdit(staff: User): void {
    this.editingStaff.set(staff);
    this.staffForm.set({
      name: staff.name,
      phone: staff.phone || '',
      role: staff.role,
      classId: staff.classId || ''
    });
  }

  cancelEdit(): void {
    this.editingStaff.set(null);
    this.staffForm.set(EMPTY_STAFF_MANAGEMENT_FORM);
  }

  async saveStaff(): Promise<void> {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!this.isStaffFormValid() || !schoolId) return;

    const currentEditingStaff = this.editingStaff();
    const formValue = this.staffForm();
    
    if (currentEditingStaff) {
      // Update existing staff
      const updatedUser: User = {
        ...currentEditingStaff,
        name: formValue.name,
        phone: formValue.phone,
        role: formValue.role as UserRole,
        classId: formValue.role === 'teacher' ? formValue.classId : undefined,
      };
      await this.dataService.updateUser(updatedUser);
      this.toastService.show(this.translationService.translate('school-admin.staff.toast.staffUpdated'), 'success');
    } else {
      // Add new staff
       await this.dataService.addUser({
        name: formValue.name,
        phone: formValue.phone,
        role: formValue.role as UserRole,
        classId: formValue.role === 'teacher' ? formValue.classId : undefined,
        schoolId,
        email: `${formValue.name.split(' ')[0].toLowerCase()}@school.com`, // Auto-generate simple email for demo
        password: 'password'
      });
      this.toastService.show(this.translationService.translate('school-admin.staff.toast.staffAdded'), 'success');
    }
    
    this.cancelEdit();
  }

  async deleteStaff(staff: User): Promise<void> {
    if (confirm(this.translationService.translate('school-admin.staff.deleteConfirmation'))) {
      await this.dataService.deleteUserAndAssociatedData(staff.id);
      this.toastService.show(this.translationService.translate('school-admin.staff.toast.staffDeleted'), 'success');
    }
  }
}
