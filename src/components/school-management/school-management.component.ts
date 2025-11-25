/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { SchoolDataService } from '../../services/school-data.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { School, User, SchoolManagementEmptyForm, EMPTY_SCHOOL_MANAGEMENT_FORM } from '../../models/app-types';

type SchoolWithAdmin = { school: School, admin: User };

@Component({
  selector: 'app-school-management',
  standalone: true,
  templateUrl: './school-management.component.html',
  styleUrls: ['./school-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe],
})
export class SchoolManagementComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);

  schoolForm = signal<SchoolManagementEmptyForm>(EMPTY_SCHOOL_MANAGEMENT_FORM);
  editingSchool = signal<SchoolWithAdmin | null>(null);
  formMode = signal<'hidden' | 'add' | 'edit'>('hidden');

  readonly schoolsWithAdmins = computed(() => {
    return this.dataService.schools().map(school => ({
      school,
      admin: this.dataService.getAdminForSchool(school.id)
    })).filter((item): item is SchoolWithAdmin => item.admin !== undefined);
  });
  
  readonly passwordsDoNotMatch = computed(() => {
    const form = this.schoolForm();
    return form.adminPassword && form.adminPassword !== form.adminPasswordConfirm;
  });

  readonly isFormValid = computed(() => {
    const form = this.schoolForm();
    if (!form.name || !form.adminName || !form.adminEmail) {
      return false;
    }
    if (this.formMode() === 'add' && !form.adminPassword) {
      return false;
    }
    if (form.adminPassword !== form.adminPasswordConfirm) {
      return false;
    }
    return true;
  });

  showAddForm(): void {
    this.formMode.set('add');
    this.editingSchool.set(null);
    this.schoolForm.set(EMPTY_SCHOOL_MANAGEMENT_FORM);
  }

  startEdit(item: SchoolWithAdmin): void {
    this.formMode.set('edit');
    this.editingSchool.set(item);
    this.schoolForm.set({
      name: item.school.name,
      adminName: item.admin.name,
      adminEmail: item.admin.email,
      adminPassword: '',
      adminPasswordConfirm: ''
    });
  }

  cancelForm(): void {
    this.formMode.set('hidden');
    this.editingSchool.set(null);
    this.schoolForm.set(EMPTY_SCHOOL_MANAGEMENT_FORM);
  }

  async saveSchool(): Promise<void> {
    if (!this.isFormValid()) return;
    
    const formValue = this.schoolForm();
    const currentEditing = this.editingSchool();

    if (this.formMode() === 'edit' && currentEditing) {
      await this.dataService.updateSchoolAndAdmin(
        currentEditing.school.id,
        formValue.name,
        currentEditing.admin.id,
        formValue.adminName,
        formValue.adminEmail,
        formValue.adminPassword
      );
      this.toastService.show(this.translationService.translate('schoolManagement.toast.schoolUpdated'), 'success');
    } else {
      await this.dataService.addSchool(formValue.name, formValue.adminName, formValue.adminEmail, formValue.adminPassword!);
      this.toastService.show(this.translationService.translate('schoolManagement.toast.schoolAdded'), 'success');
    }
    
    this.cancelForm();
  }
  
  async deleteSchool(item: SchoolWithAdmin): Promise<void> {
      const confirmationText = this.translationService.translate('schoolManagement.deleteConfirmationText');
      const confirmationTitle = this.translationService.translate('schoolManagement.deleteConfirmationTitle')
    if (confirm(`${confirmationTitle}\n\n${confirmationText}`)) {
      await this.dataService.deleteSchoolAndAdmin(item.school.id);
      this.toastService.show(this.translationService.translate('schoolManagement.toast.schoolDeleted'), 'success');
    }
  }

  updateSchoolForm(field: keyof SchoolManagementEmptyForm, value: string): void {
    this.schoolForm.update(s => ({ ...s, [field]: value }));
  }
}
