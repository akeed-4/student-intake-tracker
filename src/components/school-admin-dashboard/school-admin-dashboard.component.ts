/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { PickupStateService } from '../../services/pickup-state.service';
import { ToastService } from '../../services/toast.service';
import { StaffManagementComponent } from '../staff-management/staff-management.component';
import { StudentManagementComponent } from '../student-management/student-management.component';
import { ClassManagementComponent } from '../class-management/class-management.component';
import { SchoolSettingsComponent } from '../school-settings/school-settings.component';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AdminView, PickupRequestStatus } from '../../models/app-types';
import { AnalyticsDashboardComponent } from '../analytics-dashboard/analytics-dashboard.component';
import { BusManagementComponent } from '../bus-management/bus-management.component';
import { ActivityManagementComponent } from '../activity-management/activity-management.component';
import { AuthService } from '../../services/auth.service';
import { BroadcastComponent } from '../broadcast/broadcast.component';

const statusPriority: Record<PickupRequestStatus, number> = {
  arrived: 1,
  ready: 2,
  acknowledged: 3,
  pending: 4,
  completed: 5,
};

@Component({
  selector: 'app-school-admin-dashboard',
  standalone: true,
  templateUrl: './school-admin-dashboard.component.html',
  styleUrls: ['./school-admin-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    StaffManagementComponent,
    StudentManagementComponent,
    ClassManagementComponent,
    SchoolSettingsComponent,
    AnalyticsDashboardComponent,
    BusManagementComponent,
    ActivityManagementComponent,
    BroadcastComponent,
    TranslatePipe
  ]
})
export class SchoolAdminDashboardComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly pickupStateService: PickupStateService = inject(PickupStateService);
  private readonly toastService: ToastService = inject(ToastService);
  readonly authService: AuthService = inject(AuthService);

  readonly activeRequests = computed(() => {
    return this.pickupStateService.activeRequests()
      .slice()
      .sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
  });

  activeView = signal<AdminView>('monitor');
  isMobileMenuOpen = signal(false);
  
  readonly adminTabs = [
    { id: 'monitor', labelKey: 'school-admin.tabs.monitor', iconPath: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z' },
    { id: 'staff', labelKey: 'school-admin.tabs.staff', iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
    { id: 'students', labelKey: 'school-admin.tabs.students', iconPath: 'M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M15 21v-2a6 6 0 00-5.656-5.958' },
    { id: 'classes', labelKey: 'school-admin.tabs.classes', iconPath: 'M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4' },
    { id: 'buses', labelKey: 'school-admin.tabs.buses', iconPath: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a.375.375 0 00-.375-.375h-1.5a.375.375 0 00-.375.375v1.875m17.25 0v-1.875a.375.375 0 00-.375-.375h-1.5a.375.375 0 00-.375.375v1.875m-1.5-4.5H5.625c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-3.375c0-.621-.504-1.125-1.125-1.125H18.375m-1.5-4.5H5.625m11.25 0v-1.5c0-.621-.504-1.125-1.125-1.125H6.75c-.621 0-1.125.504-1.125 1.125v1.5m11.25 0h-1.5m-9.75 0h9.75' },
    { id: 'activities', labelKey: 'school-admin.tabs.activities', iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'analytics', labelKey: 'school-admin.tabs.analytics', iconPath: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z' },
    { id: 'broadcast', labelKey: 'school-admin.tabs.broadcast', iconPath: 'M2 5a2 2 0 012-2h12a2 2 0 012 2v8a2 2 0 01-2 2h-2.293l-2.853 2.854a.5.5 0 01-.854 0L9.293 17H4a2 2 0 01-2-2V5z' },
    { id: 'settings', labelKey: 'school-admin.tabs.settings', iconPath: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z M15 12a3 3 0 11-6 0 3 3 0 016 0z' }
  ];

  setView(view: AdminView): void {
    this.activeView.set(view);
    this.isMobileMenuOpen.set(false);
  }

  async resetDay(): Promise<void> {
    if (confirm(this.translationService.translate('school-admin.portal.resetConfirmation'))) {
      await this.pickupStateService.clearAllRequests();
      this.toastService.show(this.translationService.translate('school-admin.toast.dayReset'), 'success');
    }
  }
}