

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { PickupStateService } from '../../services/pickup-state.service';
import { AuthService } from '../../services/auth.service';
import { SchoolDataService } from '../../services/school-data.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { PickupRequestStatus } from '../../models/app-types';

const statusPriority: Record<PickupRequestStatus, number> = {
  arrived: 1,
  ready: 2,
  acknowledged: 3,
  pending: 4,
  completed: 5,
};

@Component({
  selector: 'app-teacher-dashboard',
  standalone: true,
  templateUrl: './teacher-dashboard.component.html',
  styleUrls: ['./teacher-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe]
})
export class TeacherDashboardComponent {
    readonly translationService = inject(TranslationService);
    // Fix: Explicitly type injected service to resolve 'unknown' property errors.
    private readonly pickupStateService: PickupStateService = inject(PickupStateService);
    // Fix: Explicitly type injected service to resolve 'unknown' property errors.
    private readonly authService: AuthService = inject(AuthService);
    // Fix: Explicitly type injected service to resolve 'unknown' property errors.
    private readonly schoolDataService: SchoolDataService = inject(SchoolDataService);

    readonly myClass = computed(() => {
        const currentUser = this.authService.currentUser();
        if (!currentUser || !currentUser.classId) return null;
        return this.schoolDataService.getClassById(currentUser.classId);
    });

    readonly myClassName = computed(() => this.myClass()?.name ?? '...');
    
    readonly activeRequests = computed(() => this.pickupStateService.activeRequests());
    
    readonly activeRequestsForMyClass = computed(() => {
        const cls = this.myClass();
        if (!cls) return [];
        // Filter requests for students whose classId matches the teacher's classId
        return this.activeRequests()
          .filter(req => req.student.classId === cls.id)
          .slice() // Create a shallow copy to avoid mutating the original signal array
          .sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
    });

    async acknowledgeRequest(code: string): Promise<void> {
      await this.pickupStateService.updateRequestStatus(code, 'acknowledged');
    }

    async markAsReady(code: string): Promise<void> {
        await this.pickupStateService.updateRequestStatus(code, 'ready');
    }
}
