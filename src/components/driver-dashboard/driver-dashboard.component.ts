/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { SchoolDataService } from '../../services/school-data.service';
import { PickupStateService } from '../../services/pickup-state.service';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { CarInfo, AuthorizedPerson } from '../../models/app-types';
import { PickupStatusCardComponent } from '../pickup-status-card/pickup-status-card.component';
import { ToastService } from '../../services/toast.service';

@Component({
  selector: 'app-driver-dashboard',
  standalone: true,
  imports: [FormsModule, TranslatePipe, PickupStatusCardComponent],
  templateUrl: './driver-dashboard.component.html',
  styleUrls: ['./driver-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class DriverDashboardComponent {
  readonly authService: AuthService = inject(AuthService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly pickupStateService: PickupStateService = inject(PickupStateService);
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly toastService: ToastService = inject(ToastService);

  readonly currentUser = this.authService.currentUser;

  carInfo = signal<CarInfo>({ color: '', plateNumber: '' });
  pickupNotes = signal('');

  readonly assignedStudents = computed(() => {
    const driver = this.currentUser();
    if (!driver || !driver.employerId) return [];
    return this.dataService.getStudentsByParentId(driver.employerId);
  });

  readonly activeRequestForDriver = computed(() => {
    const driver = this.currentUser();
    if (!driver) return null;
    return this.pickupStateService.activeRequests().find(
      req => req.initiatedByDriverId === driver.id
    ) ?? null;
  });

  readonly isRequestValid = computed(() => {
    return this.carInfo().color.trim() !== '' && this.carInfo().plateNumber.trim() !== '';
  });

  updateCarInfo(field: keyof CarInfo, value: string): void {
    this.carInfo.update(c => ({...c, [field]: value}));
  }

  async requestPickup(): Promise<void> {
    const driver = this.currentUser();
    const students = this.assignedStudents();
    const school = this.authService.currentUserSchool();

    if (!driver || students.length === 0 || !school) {
      this.toastService.show('Error: Missing required information to start pickup.', 'error');
      return;
    }

    // Create an AuthorizedPerson object on-the-fly from the driver's user data
    const driverAsAuthorizedPerson: AuthorizedPerson = {
      id: driver.id,
      parentId: driver.employerId!,
      name: driver.name,
      relation: 'Driver',
      photoUrl: 'https://picsum.photos/seed/Driver/50/50',
      idNumber: 'N/A',
      phone: driver.phone,
    };

    const newPickupCode = Math.floor(1000 + Math.random() * 9000).toString();

    try {
      for (const student of students) {
        await this.pickupStateService.addRequest({
          code: newPickupCode,
          student: student,
          authorizedPerson: driverAsAuthorizedPerson,
          carInfo: this.carInfo(),
          status: 'pending',
          eta: 20, // Default ETA for drivers for now
          distance: 10, // Default distance
          notes: this.pickupNotes(),
          schoolId: school.id,
          initiatedByDriverId: driver.id,
        });
      }
      this.toastService.show('Pickup requested successfully!', 'success');
    } catch (e) {
      console.error(e);
      this.toastService.show('Failed to create pickup request.', 'error');
    }
  }

  async signalArrival(): Promise<void> {
    const request = this.activeRequestForDriver();
    if (request) {
      await this.pickupStateService.assignPickupSpot(request.code);
      await this.pickupStateService.updateRequestEtaAndDistance(request.code, 0, 0);
    }
  }
}