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
import { AuthorizedPerson } from '../../models/app-types';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthorizedPersonManagementEmptyForm, EMPTY_AUTHORIZED_PERSON_FORM } from '../../models/app-types';

@Component({
  selector: 'app-authorized-person-management',
  templateUrl: './authorized-person-management.component.html',
  styleUrls: ['./authorized-person-management.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [FormsModule, TranslatePipe]
})
export class AuthorizedPersonManagementComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthService = inject(AuthService);

  personForm = signal<AuthorizedPersonManagementEmptyForm>(EMPTY_AUTHORIZED_PERSON_FORM);
  editingPerson = signal<AuthorizedPerson | null>(null);
  driverPhoneNumber = signal('');
  
  readonly authorizedPersons = computed(() => {
    const parent = this.authService.currentUser();
    if (!parent) return [];
    return this.dataService.getAuthorizedPersonsByParentId(parent.id);
  });

  readonly isFormValid = computed(() => {
    const form = this.personForm();
    return form.name && form.relation && form.idNumber;
  });

  startEdit(person: AuthorizedPerson): void {
    this.editingPerson.set(person);
    this.personForm.set({
      name: person.name,
      relation: person.relation,
      phone: person.phone || '',
      idNumber: person.idNumber,
    });
  }

  cancelForm(): void {
    this.editingPerson.set(null);
    this.personForm.set(EMPTY_AUTHORIZED_PERSON_FORM);
  }

  async savePerson(): Promise<void> {
    if (!this.isFormValid()) return;

    const formValue = this.personForm();
    const currentUser = this.authService.currentUser();
    if (!currentUser) return;

    const currentEditing = this.editingPerson();

    if (currentEditing) {
      const updatedPerson: AuthorizedPerson = {
        ...currentEditing,
        name: formValue.name,
        relation: formValue.relation,
        phone: formValue.phone,
        idNumber: formValue.idNumber,
      };
      await this.dataService.updateAuthorizedPerson(updatedPerson);
      this.toastService.show(this.translationService.translate('parent.management.toast.personUpdated'), 'success');
    } else {
      await this.dataService.addAuthorizedPerson({
        parentId: currentUser.id,
        name: formValue.name,
        relation: formValue.relation,
        phone: formValue.phone,
        idNumber: formValue.idNumber,
      });
      this.toastService.show(this.translationService.translate('parent.management.toast.personAdded'), 'success');
    }
    this.cancelForm();
  }

  async deletePerson(person: AuthorizedPerson): Promise<void> {
    if (confirm(this.translationService.translate('parent.management.deleteConfirmation'))) {
      await this.dataService.deleteAuthorizedPerson(person.id);
      this.toastService.show(this.translationService.translate('parent.management.toast.personDeleted'), 'success');
    }
  }

  updatePersonForm(field: keyof AuthorizedPersonManagementEmptyForm, value: string): void {
    this.personForm.update(s => ({ ...s, [field]: value }));
  }

  async inviteDriver(): Promise<void> {
    const phone = this.driverPhoneNumber();
    const parentId = this.authService.currentUser()?.id;
    if (phone && parentId) {
      const newDriver = await this.dataService.inviteDriver(parentId, phone);
      if (newDriver) {
        const message = this.translationService.translate('parent.management.toast.inviteSent', { phone });
        this.toastService.show(message, 'info');
        this.driverPhoneNumber.set(''); // Clear the input
      } else {
        this.toastService.show('Failed to invite driver.', 'error');
      }
    }
  }
}