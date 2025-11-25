/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, signal, computed, inject, effect } from '@angular/core';
import { PickupRequest, PickupRequestStatus, AbsenceReport, School } from '../models/app-types';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';
import { TranslationService } from './translation.service';

@Injectable({ providedIn: 'root' })
export class PickupStateService {
  private readonly authService: AuthService = inject(AuthService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly translationService: TranslationService = inject(TranslationService);

  private _allRequests = signal<PickupRequest[]>([]);
  private _absenceReports = signal<AbsenceReport[]>([]);
  
  private spotTimers = new Map<string, number>(); // <code, timerId>
  private readonly SPOT_HOLD_TIME_MS = 3 * 60 * 1000; // 3 minutes

  readonly allRequests = this._allRequests.asReadonly();

  readonly activeRequests = computed(() => {
    const currentUserSchoolId = this.authService.currentUserSchool()?.id;
    if (!currentUserSchoolId) return [];
    return this._allRequests().filter(req => 
      req.schoolId === currentUserSchoolId && req.status !== 'completed'
    );
  });
  
  readonly schoolAbsenceReports = computed(() => {
    const currentUserSchoolId = this.authService.currentUserSchool()?.id;
    if (!currentUserSchoolId) return [];
    return this._absenceReports().filter(report => report.schoolId === currentUserSchoolId);
  });

  constructor() {
    effect(() => {
      // This effect runs whenever _allRequests changes.
      // We use this to detect when a spot might have been freed up (by a request completing)
      // and automatically assign it to a parent who is waiting in the virtual queue.
      this._allRequests(); // Depend on the signal
      this.tryAssigningSpotToWaitingParent();
    }, { allowSignalWrites: true });

    // New effect for spot timers
    effect(() => {
        const requestsWithSpots = this.activeRequests().filter(
            r => r.status === 'arrived' && r.assignedZone
        );
        const requestsWithSpotsCodes = new Set(requestsWithSpots.map(r => r.code));

        // Start timers for new requests with spots
        for (const req of requestsWithSpots) {
            if (!this.spotTimers.has(req.code)) {
                const timerId = window.setTimeout(() => {
                    this.releaseSpot(req.code);
                }, this.SPOT_HOLD_TIME_MS);
                this.spotTimers.set(req.code, timerId);
            }
        }

        // Clear timers for requests that no longer have a spot or are completed
        for (const [code, timerId] of this.spotTimers.entries()) {
            if (!requestsWithSpotsCodes.has(code)) {
                clearTimeout(timerId);
                this.spotTimers.delete(code);
            }
        }
    });
  }

  private releaseSpot(code: string): void {
    const request = this.getRequestByCode(code);
    // Double-check the condition before releasing
    if (request && request.status === 'arrived' && request.assignedZone) {
        this._allRequests.update(requests => 
            requests.map(req => {
                if (req.code === code) {
                    return { 
                        ...req, 
                        assignedZone: undefined,
                        assignedSpot: undefined
                    };
                }
                return req;
            })
        );
        this.spotTimers.delete(code);
        this.toastService.show(this.translationService.translate('parent.toast.spotReleased'), 'warn');
    }
  }

  private async tryAssigningSpotToWaitingParent(): Promise<void> {
    const school = this.authService.currentUserSchool();
    if (!school || !school.pickupZones || school.pickupZones.length === 0) {
      return; // No zones configured to assign spots from.
    }
  
    // Find parents who have arrived but don't have a spot yet, oldest first.
    const waitingParents = this.activeRequests()
      .filter(r => r.status === 'arrived' && !r.assignedZone)
      .sort((a, b) => new Date(a.created_at!).getTime() - new Date(b.created_at!).getTime());
  
    if (waitingParents.length === 0) {
      return; // No one is waiting for a spot.
    }
  
    // Check if there are any available spots
    const activeSchoolRequests = this.activeRequests().filter(r => r.schoolId === school.id);
    const occupiedSpots = new Set(
      activeSchoolRequests
        .filter(r => r.assignedSpot)
        .map(r => `${r.assignedZone}-${r.assignedSpot}`)
    );
  
    const totalSpots = school.pickupZones.reduce((acc, zone) => acc + zone.spots, 0);
  
    if (occupiedSpots.size < totalSpots) {
      // An empty spot is available. Assign it to the oldest waiting parent.
      const oldestWaitingParent = waitingParents[0];
      // assignPickupSpot already contains the logic to find the next free spot.
      this.assignPickupSpot(oldestWaitingParent.code);
    }
  }

  async addRequest(request: Omit<PickupRequest, 'id' | 'created_at'>): Promise<void> {
    const newRequest: PickupRequest = { 
      ...request, 
      id: crypto.randomUUID(),
      created_at: new Date().toISOString()
    };
    this._allRequests.update(requests => [...requests, newRequest]);
  }

  getRequestByCode(code: string): PickupRequest | undefined {
    return this.activeRequests().find(req => req.code === code);
  }

  async updateRequestStatus(code: string, status: PickupRequestStatus): Promise<void> {
    this._allRequests.update(requests => 
      requests.map(req => {
        if (req.code === code) {
          const updatedReq = { ...req, status };
          if (status === 'completed' && !req.completed_at) {
            updatedReq.completed_at = new Date().toISOString();
          }
          return updatedReq;
        }
        return req;
      })
    );
  }

  async updateRequestEtaAndDistance(code: string, eta: number, distance: number): Promise<void> {
     this._allRequests.update(requests => 
      requests.map(req => req.code === code ? { ...req, eta, distance } : req)
    );
  }
  
  async assignPickupSpot(code: string): Promise<void> {
    const request = this.getRequestByCode(code);
    if (!request) return;

    const school = this.authService.currentUserSchool() as School | null;
    if (!school || !school.pickupZones || school.pickupZones.length === 0) {
      // If no zones configured, just mark as arrived.
      this.updateRequestStatus(code, 'arrived');
      return;
    }

    // `activeRequests` is already computed for the current school
    const occupiedSpots = new Set(
      this.activeRequests()
        .filter(r => r.assignedSpot && r.code !== code) // Exclude current request in case it's being reassigned
        .map(r => `${r.assignedZone}-${r.assignedSpot}`)
    );

    let assignedZone: string | undefined;
    let assignedSpot: number | undefined;

    for (const zone of school.pickupZones) {
      for (let i = 1; i <= zone.spots; i++) {
        const spotId = `${zone.name}-${i}`;
        if (!occupiedSpots.has(spotId)) {
          assignedZone = zone.name;
          assignedSpot = i;
          break;
        }
      }
      if (assignedSpot) break;
    }

    this._allRequests.update(requests => 
      requests.map(req => {
        if (req.code === code) {
          return { 
            ...req, 
            status: 'arrived',
            assignedZone: assignedZone,
            assignedSpot: assignedSpot
          };
        }
        return req;
      })
    );
  }

  async reportAbsence(report: Omit<AbsenceReport, 'id'>): Promise<void> {
    const newReport = { ...report, id: crypto.randomUUID() };
    this._absenceReports.update(reports => [...reports, newReport]);
  }

  async clearAllRequests(): Promise<void> {
    const schoolId = this.authService.currentUserSchool()?.id;
    if (!schoolId) return;
    this._allRequests.update(reqs => reqs.filter(r => r.schoolId !== schoolId || r.status === 'completed'));
  }
}