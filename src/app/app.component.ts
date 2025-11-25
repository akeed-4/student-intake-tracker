/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, effect, inject, OnInit, Renderer2, signal } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { SplashScreenComponent } from '../components/splash-screen/splash-screen.component';
import { LoginComponent } from '../components/login/login.component';
import { ParentPortalComponent } from '../components/parent-portal/parent-portal.component';
import { GuardViewComponent } from '../components/guard-view/guard-view.component';
import { TranslationService } from '../services/translation.service';
import { ToastComponent } from '../components/toast/toast.component';
import { TeacherDashboardComponent } from '../components/teacher-dashboard/teacher-dashboard.component';
import { SchoolSupervisorComponent } from '../components/school-supervisor/school-supervisor.component';
import { SchoolAdminDashboardComponent } from '../components/school-admin-dashboard/school-admin-dashboard.component';
import { SuperAdminDashboardComponent } from '../components/super-admin-dashboard/super-admin-dashboard.component';
import { DriverDashboardComponent } from '../components/driver-dashboard/driver-dashboard.component';
import { TranslatePipe } from '../pipes/translate.pipe';
import { RoleSelectionComponent } from '../components/role-selection/role-selection.component';
import { ThemeToggleComponent } from '../components/theme-toggle/theme-toggle.component';
import { ThemeService } from '../services/theme.service';

@Component({
  selector: 'app-root',
  standalone: true,
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    SplashScreenComponent,
    LoginComponent,
    ParentPortalComponent,
    GuardViewComponent,
    ToastComponent,
    TeacherDashboardComponent,
    SchoolSupervisorComponent,
    SchoolAdminDashboardComponent,
    SuperAdminDashboardComponent,
    DriverDashboardComponent,
    TranslatePipe,
    RoleSelectionComponent,
    ThemeToggleComponent,
  ],
})
export class AppComponent implements OnInit {
  readonly authService: AuthService = inject(AuthService);
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly renderer = inject(Renderer2);
  private readonly themeService = inject(ThemeService); // Inject to initialize

  bootstrapping = signal(true);

  constructor() {
    effect(() => {
      const lang = this.translationService.language();
      this.renderer.setAttribute(document.documentElement, 'lang', lang);
      this.renderer.setAttribute(document.documentElement, 'dir', lang === 'ar' ? 'rtl' : 'ltr');
    });
  }

  ngOnInit(): void {
    setTimeout(() => {
      this.bootstrapping.set(false);
    }, 1500);
  }

  logout(): void {
    this.authService.logout();
  }

  toggleLanguage(): void {
    const currentLang = this.translationService.language();
    this.translationService.setLanguage(currentLang === 'en' ? 'ar' : 'en');
  }
}