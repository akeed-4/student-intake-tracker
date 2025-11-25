/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  OnDestroy,
  signal,
} from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { GoogleGenAI, GenerateContentResponse } from '@google/genai';
import {
  Student,
  AuthorizedPerson,
  CarInfo,
  ParentPortalPickupStatus,
  ParentView,
  SchoolBus,
  Activity,
  Coordinates,
} from '../../models/app-types';
import { PickupStateService } from '../../services/pickup-state.service';
import { TranslationService } from '../../services/translation.service';
import { FormsModule } from '@angular/forms';
import { ToastService } from '../../services/toast.service';
import { SchoolDataService } from '../../services/school-data.service';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { AuthorizedPersonManagementComponent } from '../authorized-person-management/authorized-person-management.component';
import { PickupStatusCardComponent } from '../pickup-status-card/pickup-status-card.component';
import { CarpoolingComponent } from '../carpooling/carpooling.component';
import { NotificationService } from '../../services/notification.service';
import { environment } from '../../environments/environment';


@Component({
  selector: 'app-parent-portal',
  standalone: true,
  templateUrl: './parent-portal.component.html',
  styleUrls: ['./parent-portal.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, TranslatePipe, AuthorizedPersonManagementComponent, PickupStatusCardComponent, CarpoolingComponent],
})
export class ParentPortalComponent implements OnDestroy {
  private readonly pickupStateService: PickupStateService = inject(PickupStateService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly schoolDataService: SchoolDataService = inject(SchoolDataService);
  readonly authService: AuthService = inject(AuthService);
  readonly translationService: TranslationService = inject(TranslationService);
  // Fix: Explicitly type injected DomSanitizer to resolve 'unknown' property errors.
  private readonly sanitizer: DomSanitizer = inject(DomSanitizer);
  private readonly notificationService = inject(NotificationService);
  
  readonly students = computed(() => {
    const parent = this.authService.currentUser();
    if (!parent) return [];
    return this.schoolDataService.getStudentsByParentId(parent.id);
  });
  
  readonly authorizedPersons = computed(() => {
    const parent = this.authService.currentUser();
    if (!parent) return [];
    return this.schoolDataService.getAuthorizedPersonsByParentId(parent.id);
  });
  
  carInfo = signal<CarInfo>({
    color: 'تويوتا لاند كروزر بيضاء',
    plateNumber: 'د ب ١٢٣٤٥',
  });
  pickupNotes = signal('');
  
  activeView = signal<ParentView>('pickup');
  isMobileMenuOpen = signal(false);
  selectedStudents = signal(new Set<Student>());
  selectedAuthorizedPerson = signal<AuthorizedPerson | null>(null);

  pickupStatus = signal<ParentPortalPickupStatus>('idle');
  pickupMessage = signal('');
  pickupCode = signal('');
  error = signal('');
  eta = signal<number | null>(null);
  distance = signal<number | null>(null);
  locationError = signal('');
  personForDetails = signal<AuthorizedPerson | null>(null);
  preflightCheckStatus = signal<'idle' | 'calculating' | 'confirming'>('idle');

  // Absence reporting state
  absence = {
    student: signal<Student | null>(null),
    date: signal(''),
    reason: signal(''),
  };

  private etaUpdateInterval: any = null;
  private readonly GEOFENCE_RADIUS_METERS = 500;
  private isCheckingArrival = signal(false);

  readonly features = [
    { id: 'pickup', titleKey: 'parent.tabs.pickup', descriptionKey: 'parent.tabs.pickup.description', iconPath: 'M3 4a1 1 0 00-1 1v10a1 1 0 001 1h1.05a2.5 2.5 0 014.9 0H10a1 1 0 001-1V5a1 1 0 00-1-1H3zM6 7h4v2H6V7z' },
    { id: 'absence', titleKey: 'parent.tabs.absence', descriptionKey: 'parent.tabs.absence.description', iconPath: 'M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0h18' },
    { id: 'management', titleKey: 'parent.tabs.management', descriptionKey: 'parent.tabs.management.description', iconPath: 'M15 19.128a9.38 9.38 0 002.625.372 9.337 9.337 0 004.121-.952 4.125 4.125 0 00-7.533-2.493M15 19.128v-.003c0-1.113-.285-2.16-.786-3.07M15 19.128v.106A12.318 12.318 0 018.624 21c-2.331 0-4.512-.645-6.374-1.766l-.001-.109a6.375 6.375 0 0111.964-4.663v.003zM12 5.25a3 3 0 11-6 0 3 3 0 016 0z' },
    { id: 'bus', titleKey: 'parent.tabs.bus', descriptionKey: 'parent.tabs.bus.description', iconPath: 'M8.25 18.75a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h6m-9 0H3.375a1.125 1.125 0 01-1.125-1.125V14.25m17.25 4.5a1.5 1.5 0 01-3 0m3 0a1.5 1.5 0 00-3 0m3 0h1.125c.621 0 1.125-.504 1.125-1.125V14.25m-17.25 4.5v-1.875a.375.375 0 00-.375-.375h-1.5a.375.375 0 00-.375.375v1.875m17.25 0v-1.875a.375.375 0 00-.375-.375h-1.5a.375.375 0 00-.375.375v1.875m-1.5-4.5H5.625c-.621 0-1.125.504-1.125 1.125v3.375c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125v-3.375c0-.621-.504-1.125-1.125-1.125H18.375m-1.5-4.5H5.625m11.25 0v-1.5c0-.621-.504-1.125-1.125-1.125H6.75c-.621 0-1.125.504-1.125 1.125v1.5m11.25 0h-1.5m-9.75 0h9.75' },
    { id: 'activities', titleKey: 'parent.tabs.activities', descriptionKey: 'parent.tabs.activities.description', iconPath: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
    { id: 'carpooling', titleKey: 'parent.tabs.carpooling', descriptionKey: 'parent.tabs.carpooling.description', iconPath: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm-9 3a2 2 0 11-4 0 2 2 0 014 0zM19 10a2 2 0 11-4 0 2 2 0 014 0z' },
  ];

  readonly submittedRequest = computed(() => {
    const code = this.pickupCode();
    if (!code) return null;
    return this.pickupStateService.getRequestByCode(code);
  });

  readonly studentsOnBus = computed(() => {
    const parentId = this.authService.currentUser()?.id;
    if (!parentId) return [];
    
    return this.schoolDataService.getStudentsByParentId(parentId)
        .filter(student => student.busId)
        .map(student => {
            const bus = this.schoolDataService.getBusById(student.busId!);
            return { student, bus };
        })
        .filter((item): item is { student: Student, bus: SchoolBus } => !!item.bus);
  });

  readonly studentActivities = computed(() => {
      const parentStudents = this.students();
      const schoolId = this.authService.currentUserSchool()?.id;
      if (!schoolId) return [];
      const schoolActivities = this.schoolDataService.getActivitiesBySchool(schoolId);
      const schoolStaff = this.schoolDataService.getStaffForSchool(schoolId);

      return parentStudents.map(student => {
          const activities = schoolActivities
              .filter(activity => activity.studentIds.includes(student.id))
              .map(activity => {
                  const supervisor = schoolStaff.find(s => s.id === activity.supervisorId);
                  return {
                      ...activity,
                      supervisorName: supervisor?.name ?? 'N/A'
                  };
              });
          return { student, activities };
      }).filter(item => item.activities.length > 0);
  });

  isRequestValid = computed(() => this.selectedStudents().size > 0 && this.selectedAuthorizedPerson() !== null);
  isAbsenceReportValid = computed(() => this.absence.student() && this.absence.date());

  selectedStudentNames = computed(() => {
    return Array.from(this.selectedStudents()).map((s: Student) => s.name).join(', ');
  });

  private readonly ai: GoogleGenAI | null = environment.googleMapsApiKey ? new GoogleGenAI({ apiKey: environment.googleMapsApiKey }) : null;

  constructor() {
    effect(() => {
        const user = this.authService.currentUser();
        const people = this.authorizedPersons();
        if (user && people.length > 0) {
            const self = people.find(p => p.name === user.name);
            this.selectedAuthorizedPerson.set(self ?? people[0]);
        }
    }, { allowSignalWrites: true });

    effect(() => {
      const request = this.submittedRequest();
      if (request?.status === 'completed') {
        this.stopEtaUpdates();
        this.setView('pickup'); // Go to main pickup screen when done
        this.pickupStatus.set('idle');
        this.selectedStudents.set(new Set());
      }
    });

    effect(() => {
      const broadcast = this.notificationService.latestBroadcast();
      if (broadcast) {
        this.toastService.show(`📢 ${broadcast.message}`, 'info', 10000);
      }
    });
  }

  ngOnDestroy(): void {
    this.stopEtaUpdates();
  }

  setView(view: ParentView): void {
    this.activeView.set(view);
    this.isMobileMenuOpen.set(false);
  }

  toggleStudentSelection(student: Student): void {
    this.selectedStudents.update(currentSet => {
        const newSet = new Set(currentSet);
        if (newSet.has(student)) {
            newSet.delete(student);
        } else {
            newSet.add(student);
        }
        return newSet;
    });
  }

  selectAuthorizedPerson(person: AuthorizedPerson): void {
    this.selectedAuthorizedPerson.set(person);
  }

  updateCarInfo(field: keyof CarInfo, value: string): void {
    this.carInfo.update(c => ({...c, [field]: value}));
  }

  async initiatePickupSequence(): Promise<void> {
    debugger
    this.preflightCheckStatus.set('calculating');
    this.resetState();
    await this.updateEtaAndDistance();
    this.preflightCheckStatus.set('confirming');
  }

  cancelPickupSequence(): void {
      this.preflightCheckStatus.set('idle');
  }

  async confirmAndSendRequest(): Promise<void> {
    this.preflightCheckStatus.set('idle');
    this.pickupStatus.set('loading');
    
    const students: Student[] = Array.from(this.selectedStudents());
    const authorizedPerson: AuthorizedPerson | null = this.selectedAuthorizedPerson();
    
    if (!this.ai) {
      this.pickupStatus.set('error');
      this.error.set(this.translationService.translate('parent.errors.apiKeyMissing'));
      return;
    }

    if (students.length === 0 || !authorizedPerson) {
      this.pickupStatus.set('idle');
      return;
    }
    
    try {
      const newPickupCode = Math.floor(1000 + Math.random() * 9000).toString();
      this.pickupCode.set(newPickupCode);

      const studentNames = students.map((s: Student) => `${s.name} (${s.grade})`).join(', ');
      const etaValue = this.eta();
      const etaMessage = etaValue !== null
          ? `The estimated time of arrival is ${etaValue} minutes.`
          : 'The parent is on their way, with an estimated arrival of 15-20 minutes.';
      
      const languageInstruction = this.translationService.language() === 'ar' 
        ? 'Please respond in Arabic.' 
        : 'Please respond in English.';

      const prompt = `Generate a brief, reassuring message for school staff about a student pickup.
        The student(s) to be picked up are: ${studentNames}.
        The authorized person is: ${authorizedPerson.name}, who is the ${authorizedPerson.relation}.
        The vehicle is a ${this.carInfo().color} with plate number ${this.carInfo().plateNumber}.
        ${etaMessage}
        Any additional notes: ${this.pickupNotes() || 'None'}.
        ${languageInstruction} The message should be polite and clear, around 2-3 sentences.`;

      const response: GenerateContentResponse = await this.ai!.models.generateContent({ 
        model: 'gemini-2.5-flash', 
        contents: prompt 
      });
      this.pickupMessage.set(response.text.trim());
      this.pickupStatus.set('success');

      for (const student of students) {
        await this.pickupStateService.addRequest({
          code: newPickupCode,
          student: { ...student },
          authorizedPerson: { ...authorizedPerson },
          carInfo: { ...this.carInfo() },
          status: 'pending',
          eta: this.eta(),
          distance: this.distance(),
          notes: this.pickupNotes(),
          schoolId: student.schoolId,
        });
      }
      this.startEtaUpdates();

    } catch (e) {
      console.error(e);
      this.error.set(this.translationService.translate('parent.errors.notificationFailed'));
      this.pickupStatus.set('error');
    }
  }

  async signalArrival(): Promise<void> {
    if (this.isCheckingArrival()) return;
    this.isCheckingArrival.set(true);
    this.locationError.set('');

    try {
      // NOTE: Geolocation check is temporarily bypassed as per user request.
      // The logic is kept here for future re-activation.
      /*
      const schoolLocation = this.authService.currentUserSchool()?.location;
      if (!schoolLocation) {
        throw new Error(this.translationService.translate('parent.errors.noSchoolLocation'));
      }
      
      const userCoords = await this.getGeolocation();
      const userLocation = { lat: userCoords.latitude, lon: userCoords.longitude };
      
      const distance = this.calculateDistance(schoolLocation, userLocation);
      
      if (distance * 1000 > this.GEOFENCE_RADIUS_METERS) {
        const replacements = { 
          distance: this.GEOFENCE_RADIUS_METERS.toString(), 
          currentDistance: (distance * 1000).toFixed(0) 
        };
        this.toastService.show(this.translationService.translate('parent.geofence.message', replacements), 'warn', 5000);
        this.isCheckingArrival.set(false);
        return; // Stop execution if outside the geofence
      }
      */

      // If check passes (or is bypassed), proceed
      const code = this.pickupCode();
      if (code) {
        await this.pickupStateService.assignPickupSpot(code);
        // Set ETA and distance to 0 since they've arrived
        await this.pickupStateService.updateRequestEtaAndDistance(code, 0, 0);
      }
    } catch (e: any) {
      this.toastService.show(e.message, 'error');
    } finally {
      this.isCheckingArrival.set(false);
    }
  }

  private getGeolocation(): Promise<GeolocationCoordinates> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error(this.translationService.translate('parent.errors.geoNotSupported')));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => resolve(position.coords),
        (error) => {
          let message = '';
          switch (error.code) {
            case error.PERMISSION_DENIED: message = this.translationService.translate('parent.errors.geoPermissionDenied'); break;
            case error.POSITION_UNAVAILABLE: message = this.translationService.translate('parent.errors.geoUnavailable'); break;
            case error.TIMEOUT: message = this.translationService.translate('parent.errors.geoTimeout'); break;
            default: message = this.translationService.translate('parent.errors.geoUnknown'); break;
          }
          reject(new Error(message));
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    });
  }

  private calculateDistance(coord1: Coordinates, coord2: Coordinates): number {
    const R = 6371; // Radius of the Earth in km
    const dLat = (coord2.lat - coord1.lat) * (Math.PI / 180);
    const dLon = (coord2.lon - coord1.lon) * (Math.PI / 180);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(coord1.lat * (Math.PI / 180)) * Math.cos(coord2.lat * (Math.PI / 180)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  async updateEtaAndDistance(): Promise<void> {
    this.locationError.set('');
    try {
      const schoolLocation = this.authService.currentUserSchool()?.location;
      if (!schoolLocation) {
        this.locationError.set(this.translationService.translate('parent.errors.noSchoolLocation'));
        this.eta.set(15);
        this.distance.set(10);
        return;
      }

      const userCoords = await this.getGeolocation();
      const userLocation = { lat: userCoords.latitude, lon: userCoords.longitude };
      const distanceKm = this.calculateDistance(schoolLocation, userLocation);
      
      const averageSpeedKmph = 40;
      const etaMinutes = Math.round((distanceKm / averageSpeedKmph) * 60);

      this.distance.set(distanceKm);
      this.eta.set(etaMinutes);
    } catch (e: any) {
      this.locationError.set(e.message);
      this.eta.set(15);
      this.distance.set(10);
      console.error('Geolocation error:', e);
    }
  }

  private startEtaUpdates(): void {
    this.stopEtaUpdates();
    this.etaUpdateInterval = setInterval(async () => {
      await this.updateEtaAndDistance();
      const code = this.pickupCode();
      const eta = this.eta();
      const distance = this.distance();
      if (code && eta !== null && distance !== null) {
        this.pickupStateService.updateRequestEtaAndDistance(code, eta, distance);
      }
    }, 30000); // Update every 30 seconds
  }

  private stopEtaUpdates(): void {
    if (this.etaUpdateInterval) {
      clearInterval(this.etaUpdateInterval);
      this.etaUpdateInterval = null;
    }
  }

  private resetState(): void {
    this.pickupMessage.set('');
    this.pickupCode.set('');
    this.error.set('');
    this.eta.set(null);
    this.distance.set(null);
    this.locationError.set('');
  }

  selectAbsenceStudent(student: Student): void {
    this.absence.student.set(student);
    const today = new Date().toISOString().split('T')[0];
    this.absence.date.set(today);
  }

  async reportAbsence(): Promise<void> {
    const report = {
      student: this.absence.student(),
      date: this.absence.date(),
      reason: this.absence.reason(),
    };

    if (!report.student || !report.date) return;

    await this.pickupStateService.reportAbsence({
      student: report.student,
      date: report.date,
      reason: report.reason,
      reportedByParentId: this.authService.currentUser()?.id,
      schoolId: this.authService.currentUserSchool()?.id,
    });

    this.toastService.show(this.translationService.translate('parent.toast.absenceReported'), 'success');
    this.absence.student.set(null);
    this.absence.date.set('');
    this.absence.reason.set('');
  }

  showPersonDetails(person: AuthorizedPerson): void {
    this.personForDetails.set(person);
  }

  closeDetailsModal(): void {
    this.personForDetails.set(null);
  }

  getBusMapUrl(location: Coordinates): SafeResourceUrl {
    const apiKey = (window as any).GOOGLE_MAPS_API_KEY ?? null;
    if (!apiKey) {
      // Fallback to a generic OpenStreetMap view if API key is missing
      const url = `https://www.openstreetmap.org/export/embed.html?bbox=${location.lon-0.01}%2C${location.lat-0.01}%2C${location.lon+0.01}%2C${location.lat+0.01}&layer=mapnik&marker=${location.lat}%2C${location.lon}`;
      return this.sanitizer.bypassSecurityTrustResourceUrl(url);
    }
    const url = `https://www.google.com/maps/embed/v1/view?key=${apiKey}&center=${location.lat},${location.lon}&zoom=15`;
    return this.sanitizer.bypassSecurityTrustResourceUrl(url);
  }
}