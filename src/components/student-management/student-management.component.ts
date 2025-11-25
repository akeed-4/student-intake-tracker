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
import { Student, StudentManagementEmptyForm, EMPTY_STUDENT_MANAGEMENT_FORM, UserRole } from '../../models/app-types';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-student-management',
  standalone: true,
  templateUrl: './student-management.component.html',
  styleUrls: ['./student-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe]
})
export class StudentManagementComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthService = inject(AuthService);
  
  studentForm = signal<StudentManagementEmptyForm>(EMPTY_STUDENT_MANAGEMENT_FORM);
  editingStudent = signal<Student | null>(null);

  isStudentFormValid = computed(() => {
    const s = this.studentForm();
    return s.name && s.parentPhone && s.classId;
  });

  readonly students = computed(() => {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!schoolId) return [];
    return this.dataService.getStudentsBySchool(schoolId);
  });
  
  readonly classes = computed(() => {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!schoolId) return [];
    return this.dataService.getClassesBySchool(schoolId);
  });

  updateStudentForm(field: keyof StudentManagementEmptyForm, value: string): void {
    this.studentForm.update(s => ({ ...s, [field]: value }));
  }

  startEdit(student: Student): void {
    this.editingStudent.set(student);
    this.studentForm.set({
      name: student.name,
      parentPhone: student.parentPhone || '',
      classId: student.classId,
    });
  }

  cancelEdit(): void {
    this.editingStudent.set(null);
    this.studentForm.set(EMPTY_STUDENT_MANAGEMENT_FORM);
  }

  async saveStudent(): Promise<void> {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!this.isStudentFormValid() || !schoolId) return;

    const currentEditingStudent = this.editingStudent();
    const formValue = this.studentForm();

    const studentClass = this.dataService.getClassById(formValue.classId);
    if(!studentClass) {
      this.toastService.show('Selected class not found.', 'error');
      return;
    }

    const gradeMatch = studentClass.name.match(/Grade \d+/);
    const grade = gradeMatch ? gradeMatch[0] : 'N/A';

    if (currentEditingStudent) {
      const updatedStudent: Student = {
        ...currentEditingStudent,
        name: formValue.name,
        parentPhone: formValue.parentPhone,
        classId: formValue.classId,
        class: studentClass.name, 
        grade: grade, 
      };
      await this.dataService.updateStudent(updatedStudent);
      this.toastService.show(this.translationService.translate('school-admin.students.toast.studentUpdated'), 'success');
    } else {
      let parent = this.dataService.users().find(u => u.role === 'parent' && u.phone === formValue.parentPhone);
      if (!parent) {
        const newParentData = {
          name: `Parent (${formValue.name})`,
          email: `${formValue.parentPhone}@school-pickup.app`,
          phone: formValue.parentPhone,
          role: 'parent' as UserRole,
          schoolId: schoolId,
          password: 'password'
        };
        await this.dataService.addUser(newParentData);
        parent = this.dataService.users().find(u => u.role === 'parent' && u.phone === formValue.parentPhone);
      }

      if (!parent) {
        this.toastService.show('Failed to find or create a parent account.', 'error');
        return;
      }

      await this.dataService.addStudent({
        name: formValue.name,
        parentPhone: formValue.parentPhone,
        classId: formValue.classId,
        class: studentClass.name,
        grade: grade,
        schoolId,
        parentId: parent.id,
        photoUrl: `https://picsum.photos/seed/${formValue.name}/50/50`
      });
      this.toastService.show(this.translationService.translate('school-admin.students.toast.studentAdded'), 'success');
    }

    this.cancelEdit();
  }

  sendInvite(phone: string): void {
    const message = this.translationService.translate('school-admin.students.toast.inviteSent', { phone });
    this.toastService.show(message, 'info');
  }

  async deleteStudent(student: Student): Promise<void> {
    if (confirm(this.translationService.translate('school-admin.students.deleteConfirmation'))) {
      await this.dataService.deleteStudent(student.id);
      this.toastService.show(this.translationService.translate('school-admin.students.toast.studentDeleted'), 'success');
    }
  }
}