/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthService } from '../../services/auth.service';
import { SchoolDataService } from '../../services/school-data.service';
import { ToastService } from '../../services/toast.service';
import { TranslationService } from '../../services/translation.service';
import { CarpoolGroup, User } from '../../models/app-types';

type GroupWithMembers = CarpoolGroup & { members: User[], admin: User | undefined };

@Component({
  selector: 'app-carpooling',
  standalone: true,
  imports: [FormsModule, TranslatePipe],
  templateUrl: './carpooling.component.html',
  styleUrls: ['./carpooling.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CarpoolingComponent {
  private readonly authService = inject(AuthService);
  private readonly dataService = inject(SchoolDataService);
  private readonly toastService = inject(ToastService);
  readonly translationService = inject(TranslationService);

  readonly currentUser = this.authService.currentUser;

  // UI state signals
  showCreateGroupForm = signal(false);
  showInviteModalForGroup = signal<GroupWithMembers | null>(null);
  
  // Form signals
  newGroupName = signal('');
  inviteeUserId = signal<string>('');
  
  readonly myGroups = computed<GroupWithMembers[]>(() => {
    const user = this.currentUser();
    if (!user) return [];
    const groups = this.dataService.getCarpoolGroupsForUser(user.id);
    return groups.map(group => {
      const members = this.dataService.getMembersForGroup(group.id);
      const admin = members.find(m => m.id === group.adminId);
      return { ...group, members, admin };
    });
  });

  readonly parentsToInvite = computed(() => {
    const group = this.showInviteModalForGroup();
    const schoolId = this.currentUser()?.schoolId;
    if (!group || !schoolId) return [];

    const allParents = this.dataService.getParentsForSchool(schoolId);
    const memberIds = new Set(group.members.map(m => m.id));
    
    return allParents.filter(p => !memberIds.has(p.id));
  });

  // --- Actions ---
  toggleCreateGroupForm(): void {
    this.showCreateGroupForm.update(v => !v);
    this.newGroupName.set('');
  }

  async createGroup(): Promise<void> {
    const name = this.newGroupName().trim();
    const user = this.currentUser();
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!name || !user || !schoolId) return;

    await this.dataService.createCarpoolGroup(name, schoolId, user.id);
    this.toastService.show(this.translationService.translate('carpooling.toast.groupCreated'), 'success');
    this.toggleCreateGroupForm();
  }

  openInviteModal(group: GroupWithMembers): void {
    this.inviteeUserId.set('');
    this.showInviteModalForGroup.set(group);
  }

  closeInviteModal(): void {
    this.showInviteModalForGroup.set(null);
  }

  async sendInvite(): Promise<void> {
    const group = this.showInviteModalForGroup();
    const userId = this.inviteeUserId();
    if (!group || !userId) return;

    await this.dataService.addMemberToGroup(group.id, userId);
    this.toastService.show(this.translationService.translate('carpooling.toast.memberInvited'), 'success');
    this.closeInviteModal();
  }
}
