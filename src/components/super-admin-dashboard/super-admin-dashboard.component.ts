/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { SchoolManagementComponent } from '../school-management/school-management.component';
import { AccountManagementComponent } from '../account-management/account-management.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { SuperAdminView } from '../../models/app-types'; // Fix: Use consolidated type from app-types.ts

@Component({
  selector: 'app-super-admin-dashboard',
  standalone: true,
  templateUrl: './super-admin-dashboard.component.html',
  styleUrls: ['./super-admin-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [SchoolManagementComponent, AccountManagementComponent, TranslatePipe],
})
export class SuperAdminDashboardComponent {
  readonly translationService = inject(TranslationService);
  activeView = signal<SuperAdminView>('schools');
}