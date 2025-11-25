/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { SchoolDataService } from '../../services/school-data.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { Activity, Student, ActivityManagementEmptyForm, EMPTY_ACTIVITY_MANAGEMENT_FORM, User } from '../../models/app-types';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-activity-management',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './activity-management.component.html',
  styleUrls: ['./activity-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ActivityManagementComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthService = inject(AuthService);

  activityForm = signal<ActivityManagementEmptyForm>(EMPTY_ACTIVITY_MANAGEMENT_FORM);
  editingActivity = signal<Activity | null>(null);
  assigningStudentsToActivity = signal<Activity | null>(null);
  
  selectedStudentsForAssignment = signal<Set<string>>(new Set());

  isActivityFormValid = computed(() => {
    const form = this.activityForm();
    return form.name && form.supervisorId && form.startTime && form.endTime && form.location;
  });

  readonly schoolId = computed(() => this.authService.currentUserSchool()?.id);

  readonly activities = computed(() => {
    const id = this.schoolId();
    return id ? this.dataService.getActivitiesBySchool(id) : [];
  });

  readonly teachers = computed(() => {
    const id = this.schoolId();
    if (!id) return [];
    return this.dataService.getStaffForSchool(id).filter(s => s.role === 'teacher');
  });
  
  readonly studentsForAssignmentModal = computed(() => {
    const activity = this.assigningStudentsToActivity();
    const schoolId = this.schoolId();
    if (!activity || !schoolId) return [];

    const allStudents = this.dataService.getStudentsBySchool(schoolId);
    
    // An available student is one not in ANY activity. 
    // This is a simplification; in a real app, you'd check for time conflicts.
    const allAssignedStudentIds = new Set(
        this.activities().flatMap(a => a.id !== activity.id ? a.studentIds : [])
    );
    
    const available = allStudents.filter(s => !allAssignedStudentIds.has(s.id));
    
    return available;
  });

  getSupervisorName(supervisorId: string): string {
    const supervisor = this.dataService.users().find(u => u.id === supervisorId);
    return supervisor?.name ?? 'N/A';
  }

  startEdit(activity: Activity): void {
    this.editingActivity.set(activity);
    this.activityForm.set({
      name: activity.name,
      supervisorId: activity.supervisorId,
      startTime: activity.startTime,
      endTime: activity.endTime,
      location: activity.location,
    });
  }

  cancelEdit(): void {
    this.editingActivity.set(null);
    this.activityForm.set(EMPTY_ACTIVITY_MANAGEMENT_FORM);
  }

  async saveActivity(): Promise<void> {
    if (!this.isActivityFormValid() || !this.schoolId()) return;

    const formValue = this.activityForm();
    const currentEditingActivity = this.editingActivity();

    if (currentEditingActivity) {
      const updatedActivity: Activity = { ...currentEditingActivity, ...formValue };
      await this.dataService.updateActivity(updatedActivity);
      this.toastService.show(this.translationService.translate('activityManagement.toast.updated'), 'success');
    } else {
      await this.dataService.addActivity({ schoolId: this.schoolId()!, ...formValue });
      this.toastService.show(this.translationService.translate('activityManagement.toast.added'), 'success');
    }
    this.cancelEdit();
  }

  async deleteActivity(activity: Activity): Promise<void> {
    if (confirm(this.translationService.translate('activityManagement.deleteConfirmation'))) {
      await this.dataService.deleteActivity(activity.id);
      this.toastService.show(this.translationService.translate('activityManagement.toast.deleted'), 'success');
    }
  }
  
  openStudentAssignmentModal(activity: Activity): void {
    this.assigningStudentsToActivity.set(activity);
    this.selectedStudentsForAssignment.set(new Set(activity.studentIds));
  }

  closeStudentAssignmentModal(): void {
    this.assigningStudentsToActivity.set(null);
    this.selectedStudentsForAssignment.set(new Set());
  }
  
  toggleStudentSelection(studentId: string): void {
    this.selectedStudentsForAssignment.update(currentSet => {
      const newSet = new Set(currentSet);
      if (newSet.has(studentId)) {
        newSet.delete(studentId);
      } else {
        newSet.add(studentId);
      }
      return newSet;
    });
  }
  
  async saveStudentAssignments(): Promise<void> {
    const activity = this.assigningStudentsToActivity();
    if (!activity) return;
    
    const newStudentIds = [...this.selectedStudentsForAssignment()];
    await this.dataService.updateActivityAssignments(activity.id, newStudentIds);
    
    this.toastService.show(this.translationService.translate('activityManagement.toast.assignmentsUpdated'), 'success');
    this.closeStudentAssignmentModal();
  }

  updateActivityForm(field: keyof ActivityManagementEmptyForm, value: string): void {
    this.activityForm.update(s => ({ ...s, [field]: value }));
  }
}