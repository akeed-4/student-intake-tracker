/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  ChangeDetectionStrategy,
  Component,
  signal,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { View } from './types';
import { PickupStateService } from './pickup-state.service';

// Import new components
import { LoginComponent } from './login/login.component';
import { ParentPortalComponent } from './parent-portal/parent-portal.component';
import { SchoolDashboardComponent } from './school-dashboard/school-dashboard.component';
import { TeacherDashboardComponent } from './teacher-dashboard/teacher-dashboard.component';
import { GuardViewComponent } from './guard-view/guard-view.component';
import { AdminDashboardComponent } from './admin-dashboard/admin-dashboard.component';
import { RoleManagementComponent } from './role-management/role-management.component';


@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    LoginComponent,
    ParentPortalComponent,
    SchoolDashboardComponent,
    TeacherDashboardComponent,
    GuardViewComponent,
    AdminDashboardComponent,
    RoleManagementComponent
  ],
})
export class AppComponent {
  private pickupStateService = inject(PickupStateService);

  // Global State
  currentView = signal<View>('login');
  
  // Login State
  loginError = signal<string | null>(null);
  
  private users = new Map<string, { password: string, role: View }>([
      ['ولي', { password: '123', role: 'parent' }],
      ['parent', { password: '123', role: 'parent' }],
      ['مدرسة', { password: '123', role: 'school' }],
      ['school', { password: '123', role: 'school' }],
      ['معلم', { password: '123', role: 'teacher' }],
      ['teacher', { password: '123', role: 'teacher' }],
      ['حارس', { password: '123', role: 'guard' }],
      ['guard', { password: '123', role: 'guard' }],
      ['مدير', { password: '123', role: 'admin' }],
      ['admin', { password: '123', role: 'admin' }],
  ]);

  // --- View Management ---
  selectView(view: View): void {
    this.currentView.set(view);
  }

  // --- Login/Logout Methods ---
  handleLogin = (credentials: {username: string, password: string}): void => {
    this.loginError.set(null);
    const username = credentials.username.trim().toLowerCase();
    const user = this.users.get(username);

    if (user && user.password === credentials.password) {
        this.currentView.set(user.role);
    } else {
        this.loginError.set('اسم المستخدم أو كلمة المرور غير صحيحة.');
    }
  }

  logout(): void {
    this.loginError.set(null);
    this.currentView.set('login');
  }
}