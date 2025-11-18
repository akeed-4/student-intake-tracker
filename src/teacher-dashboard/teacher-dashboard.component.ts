/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PickupStateService } from '../pickup-state.service';

@Component({
  selector: 'app-teacher-dashboard',
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class TeacherDashboardComponent {
  pickupState = inject(PickupStateService);
  logoutRequest = output<void>();

  logout = () => this.logoutRequest.emit();

  markAsReady(): void {
    this.pickupState.markAsReady();
  }
}
