/**
 * @license
 * SPDX-License-Identifier: Apache-20.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { SchoolDataService } from '../../services/school-data.service';
import { ToastService } from '../../services/toast.service';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { Class } from '../../models/app-types';

@Component({
  selector: 'app-class-management',
  standalone: true,
  templateUrl: './class-management.component.html',
  styleUrls: ['./class-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe]
})
export class ClassManagementComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthService = inject(AuthService);

  newClassName = signal('');
  
  readonly classes = computed(() => {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!schoolId) return [];
    return this.dataService.getClassesBySchool(schoolId);
  });

  async addClass(): Promise<void> {
    const schoolId = this.authService.currentUserSchool()?.id;
    const name = this.newClassName();
    if (name && schoolId) {
      await this.dataService.addClass(name, schoolId);
      this.toastService.show(this.translationService.translate('school-admin.classes.toast.classAdded'), 'success');
      this.newClassName.set('');
    }
  }

  async deleteClass(classItem: Class): Promise<void> {
    if (confirm(this.translationService.translate('school-admin.classes.deleteConfirmation'))) {
        await this.dataService.deleteClass(classItem.id);
        this.toastService.show(this.translationService.translate('school-admin.classes.toast.classDeleted'), 'success');
    }
  }
}
