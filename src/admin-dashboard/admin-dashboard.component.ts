/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { inject } from '@angular/core';

import { PickupStateService } from '../pickup-state.service';
import { View } from '../types';

@Component({
  selector: 'app-admin-dashboard',
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class AdminDashboardComponent {
  pickupState = inject(PickupStateService);
  logoutRequest = output<void>();
  changeView = output<View>();

  logout = () => this.logoutRequest.emit();

  selectView(view: View): void {
    this.changeView.emit(view);
  }

  resetForNewDay(): void {
    this.pickupState.resetPickupState();
    this.logout();
  }
}
