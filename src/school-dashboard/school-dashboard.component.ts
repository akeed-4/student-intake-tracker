/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PickupStateService } from '../pickup-state.service';

@Component({
  selector: 'app-school-dashboard',
  templateUrl: './school-dashboard.component.html',
  styleUrls: ['./school-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class SchoolDashboardComponent {
  pickupState = inject(PickupStateService);
  logoutRequest = output<void>();

  logout = () => this.logoutRequest.emit();

  alertTeacher(): void {
    this.pickupState.alertTeacher();
  }
}
