/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, effect, inject, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PickupStateService } from '../pickup-state.service';
import { AuthorizedPerson, ParentViewMode } from '../types';

declare var QRCode: any;

@Component({
  selector: 'app-parent-portal',
  templateUrl: './parent-portal.component.html',
  styleUrls: ['./parent-portal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule],
})
export class ParentPortalComponent {
  pickupState = inject(PickupStateService);
  logoutRequest = output<void>();

  // Component-specific state
  parentViewMode = signal<ParentViewMode>('request');
  shareStatusMessage = signal<string | null>(null);
  saveStatusMessage = signal<string | null>(null);
  personToDeleteId = signal<number | null>(null);
  
  personToDelete = computed(() => {
      const id = this.personToDeleteId();
      if (!id) return null;
      return this.authorizedPersons().find(p => p.id === id) ?? null;
  });

  // Authorized Persons Management
  authorizedPersons = signal<AuthorizedPerson[]>([
    { id: 1, name: 'الأب', relation: 'ولي الأمر', idNumber: '1012345678', photo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2E1YjRjNyI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTEuNzUgOC4yNUExLjUgMS41IDAgMCAwIDEwLjUgNi43NUg3LjVBNy41IDcuNSAwIDAgMCAwIDE0LjI1VjIwLjI1YzAgLjQxNC4zMzYuNzUuNzUuNzVoMy4xN2ExLjEyNiAxLjEyNiAwIDAgMSAxLjEyNS0xLjEyNVYxNWEzIDMgMCAwIDEgMy0zaDIuMjVhMyAzIDAgMCAxIDMgM3Y0Ljg3NWExLjEyNSAxLjEyNSAwIDAgMSAxLjEyNSAxLjEyNWgzLjE3YS43NS43NSAwIDAgMCAuNzUtLjc1VjE0LjI1QTcuNSA3LjUgMCAwIDAgMTYuNSA2Ljc1aC0zQTEuNSAxLjUgMCAwIDAgMTEuNzUgOC4yNVpNNy41IDEzLjVBNiA2IDAgMCAxIDEzLjUgNy41aDFBNiA2IDAgMCAxIDIwLjI1IDEzLjVWMjFINDEuNzV2LTcuNUE2IDYgMCAwIDEgNy41IDEzLjVaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIC8+PC9zdmc+' },
    { id: 2, name: 'الأم', relation: 'ولي الأمر', idNumber: '1087654321', photo: 'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0iI2E1YjRjNyI+PHBhdGggZmlsbC1ydWxlPSJldmVub2RkIiBkPSJNMTQgMy43NUMxNCAyLjc4NCAxMy4yMTYgMiAxMi4yNSAyaC0uNUMxMC43ODQgMiAxMCAyLjc4NCAxMCAzLjc1VjVoNGExLjUgMS41IDAgMCAxIDEuNSAxdjQuNVYxNWE2IDYgMCAwIDEgNiA2djIuMjVhLjc1Ljc1IDAgMCAxLS43NS43NWgtNC4zMzhhMS4xMjUgMS4xMjUgMCAwIDEtMS4xMjUtMS4xMjVWMjFINy4xNjNhMS4xMjUgMS4xMjUgMCAwIDEtMS4xMjYgMS4xMjVILjcyYS43NS43NSAwIDAgMS0uNzUtLjc1VjIxYTYgNiAwIDAgMSA2LTZWMTAuNVY2LjVjMC0uODI4LjY3Mi0xLjUgMS41LTEuNWg0VjMuNzVaIiBjbGlwLXJ1bGU9ImV2ZW5vZGQiIC8+PC9zdmc+' }
  ]);
  selectedPickupPersonId = signal<number | null>(1);

  // Form state for adding/editing a person
  personFormName = signal('');
  personFormRelation = signal('');
  personFormIdNumber = signal('');
  personFormPhoto = signal<string | null>(null);
  editingPersonId = signal<number | null>(null);
  
  constructor() {
    effect(() => {
      const status = this.pickupState.status();
      const code = this.pickupState.pickupCode();
      if ((status === 'notified' || status === 'teacher_alerted' || status === 'ready') && code) {
        setTimeout(() => {
          const qrcodeElement = document.getElementById('qrcode');
          if (qrcodeElement) {
            qrcodeElement.innerHTML = '';
            new QRCode(qrcodeElement, {
              text: code,
              width: 128,
              height: 128,
              colorDark : "#000000",
              colorLight : "#ffffff",
              correctLevel : QRCode.CorrectLevel.H
            });
          }
        }, 0);
      }
    });
  }

  logout = () => this.logoutRequest.emit();

  onStudentNameInput = (event: Event) => this.pickupState.studentName.set((event.target as HTMLInputElement).value);
  onStudentClassInput = (event: Event) => this.pickupState.studentClass.set((event.target as HTMLInputElement).value);
  onCarColorInput = (event: Event) => this.pickupState.carColor.set((event.target as HTMLInputElement).value);
  onCarPlateInput = (event: Event) => this.pickupState.carPlate.set((event.target as HTMLInputElement).value);
  onNotesInput = (event: Event) => this.pickupState.notes.set((event.target as HTMLTextAreaElement).value);
  setEta = (minutes: number) => this.pickupState.eta.set(minutes);
  
  notifySchool(): void {
    const selectedPerson = this.authorizedPersons().find(p => p.id === this.selectedPickupPersonId());
    if (selectedPerson) {
      this.pickupState.notifySchool(selectedPerson);
    }
  }

  resetAndStartNew(): void {
    this.pickupState.resetPickupState();
    this.parentViewMode.set('request');
    this.selectedPickupPersonId.set(1);
  }

  async sharePickupDetails(): Promise<void> {
    const { studentName, studentClass, pickupCode } = this.pickupState;
    if (!studentName() || !studentClass() || !pickupCode()) return;

    const shareText = `تفاصيل استلام الطالب: ${studentName()}\n` +
                      `الفصل: ${studentClass()}\n` +
                      `رمز الاستلام: ${pickupCode()}`;

    const shareData = { title: 'تفاصيل استلام الطالب', text: shareText };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
        this.shareStatusMessage.set('تمت المشاركة بنجاح!');
      } else {
        await navigator.clipboard.writeText(shareText);
        this.shareStatusMessage.set('تم نسخ التفاصيل إلى الحافظة!');
      }
    } catch (err) {
      // Ignore AbortError which is triggered when the user cancels the share dialog.
      if (err instanceof DOMException && err.name === 'AbortError') {
        console.log('Share was canceled by the user.');
        return; // Don't show any message and exit.
      }
      console.error('Share/Copy failed:', err);
      this.shareStatusMessage.set('فشلت المشاركة أو النسخ.');
    }
    setTimeout(() => this.shareStatusMessage.set(null), 3000);
  }

  // --- Authorized Persons Methods ---
  onPersonFormNameInput = (event: Event) => this.personFormName.set((event.target as HTMLInputElement).value);
  onPersonFormRelationInput = (event: Event) => this.personFormRelation.set((event.target as HTMLInputElement).value);
  onPersonFormIdNumberInput = (event: Event) => this.personFormIdNumber.set((event.target as HTMLInputElement).value);

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const reader = new FileReader();
      reader.onload = (e) => this.personFormPhoto.set(e.target?.result as string);
      reader.readAsDataURL(input.files[0]);
    }
  }

  saveAuthorizedPerson(): void {
    if (!this.personFormName() || !this.personFormRelation() || !this.personFormIdNumber() || !this.personFormPhoto()) {
      return;
    }
    
    if (this.editingPersonId()) {
      this.authorizedPersons.update(persons => 
        persons.map(p => p.id === this.editingPersonId() ? {
          ...p,
          name: this.personFormName(),
          relation: this.personFormRelation(),
          idNumber: this.personFormIdNumber(),
          photo: this.personFormPhoto()!,
        } : p)
      );
    } else {
      const newPerson: AuthorizedPerson = {
        id: Date.now(),
        name: this.personFormName(),
        relation: this.personFormRelation(),
        idNumber: this.personFormIdNumber(),
        photo: this.personFormPhoto()!,
      };
      this.authorizedPersons.update(persons => [...persons, newPerson]);
    }
    
    this.resetPersonForm();
    this.saveStatusMessage.set('تم حفظ التغييرات بنجاح!');
    setTimeout(() => this.saveStatusMessage.set(null), 3000);
  }

  editPerson(person: AuthorizedPerson): void {
    this.editingPersonId.set(person.id);
    this.personFormName.set(person.name);
    this.personFormRelation.set(person.relation);
    this.personFormIdNumber.set(person.idNumber);
    this.personFormPhoto.set(person.photo);
  }

  requestDeletePerson(personId: number): void {
    this.personToDeleteId.set(personId);
  }

  confirmDelete(): void {
    const idToDelete = this.personToDeleteId();
    if (idToDelete) {
        this.authorizedPersons.update(persons => persons.filter(p => p.id !== idToDelete));
        if (this.selectedPickupPersonId() === idToDelete) {
            this.selectedPickupPersonId.set(null);
        }
    }
    this.personToDeleteId.set(null);
  }

  cancelDelete(): void {
    this.personToDeleteId.set(null);
  }

  resetPersonForm(): void {
    this.editingPersonId.set(null);
    this.personFormName.set('');
    this.personFormRelation.set('');
    this.personFormIdNumber.set('');
    this.personFormPhoto.set(null);
  }
}