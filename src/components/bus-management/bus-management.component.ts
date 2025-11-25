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
import { SchoolBus, Student, BusManagementEmptyForm, EMPTY_BUS_MANAGEMENT_FORM } from '../../models/app-types';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-bus-management',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './bus-management.component.html',
  styleUrls: ['./bus-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class BusManagementComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthService = inject(AuthService);

  busForm = signal<BusManagementEmptyForm>(EMPTY_BUS_MANAGEMENT_FORM);
  editingBus = signal<SchoolBus | null>(null);
  assigningStudentsToBus = signal<SchoolBus | null>(null);
  
  selectedStudentsForAssignment = signal<Set<string>>(new Set());

  isBusFormValid = computed(() => this.busForm().busNumber && this.busForm().driverName);

  readonly schoolId = computed(() => this.authService.currentUserSchool()?.id);

  readonly buses = computed(() => {
    const id = this.schoolId();
    return id ? this.dataService.getBusesBySchool(id) : [];
  });
  
  readonly studentsForAssignmentModal = computed(() => {
    const bus = this.assigningStudentsToBus();
    const schoolId = this.schoolId();
    if (!bus || !schoolId) return { assigned: [], available: [] };

    const allStudents = this.dataService.getStudentsBySchool(schoolId);
    const assigned = allStudents.filter(s => bus.studentIds.includes(s.id));
    const available = allStudents.filter(s => !s.busId || s.busId === bus.id);
    
    return { assigned, available };
  });

  startEdit(bus: SchoolBus): void {
    this.editingBus.set(bus);
    this.busForm.set({
      busNumber: bus.busNumber,
      driverName: bus.driverName,
    });
  }

  cancelEdit(): void {
    this.editingBus.set(null);
    this.busForm.set(EMPTY_BUS_MANAGEMENT_FORM);
  }

  async saveBus(): Promise<void> {
    if (!this.isBusFormValid() || !this.schoolId()) return;

    const formValue = this.busForm();
    const currentEditingBus = this.editingBus();

    if (currentEditingBus) {
      const updatedBus: SchoolBus = { ...currentEditingBus, ...formValue };
      await this.dataService.updateBus(updatedBus);
      this.toastService.show('Bus updated successfully!', 'success');
    } else {
      await this.dataService.addBus({ schoolId: this.schoolId()!, ...formValue });
      this.toastService.show('Bus added successfully!', 'success');
    }
    this.cancelEdit();
  }

  async deleteBus(bus: SchoolBus): Promise<void> {
    if (confirm('Are you sure you want to delete this bus? Students will be unassigned.')) {
      await this.dataService.deleteBus(bus.id);
      this.toastService.show('Bus deleted successfully!', 'success');
    }
  }
  
  openStudentAssignmentModal(bus: SchoolBus): void {
    this.assigningStudentsToBus.set(bus);
    this.selectedStudentsForAssignment.set(new Set(bus.studentIds));
  }

  closeStudentAssignmentModal(): void {
    this.assigningStudentsToBus.set(null);
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
    const bus = this.assigningStudentsToBus();
    if (!bus) return;
    
    // FIX: Use spread syntax to correctly convert Set<string> to string[] and fix type error.
    const newStudentIds = [...this.selectedStudentsForAssignment()];
    await this.dataService.updateBusAssignments(bus.id, newStudentIds);
    
    this.toastService.show('Bus assignments updated!', 'success');
    this.closeStudentAssignmentModal();
  }

  updateBusForm(field: keyof BusManagementEmptyForm, value: string): void {
    this.busForm.update(s => ({ ...s, [field]: value }));
  }
}
