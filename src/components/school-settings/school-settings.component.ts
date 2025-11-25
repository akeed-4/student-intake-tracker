/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal, AfterViewInit, ViewChild, ElementRef, OnDestroy, effect } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { TranslationService } from '../../services/translation.service';
import { ToastService } from '../../services/toast.service';
import { AuthService } from '../../services/auth.service';
import { SchoolDataService } from '../../services/school-data.service';
import { Coordinates } from '../../models/app-types';
import { TranslatePipe } from '../../pipes/translate.pipe';

declare const L: any;
declare const GeoSearch: any;

@Component({
  selector: 'app-school-settings',
  standalone: true,
  templateUrl: './school-settings.component.html',
  styleUrls: ['./school-settings.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe, FormsModule]
})
export class SchoolSettingsComponent implements AfterViewInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer?: ElementRef;
  @ViewChild('searchBox') searchBox?: ElementRef;

  readonly translationService: TranslationService = inject(TranslationService);
  private readonly toastService: ToastService = inject(ToastService);
  private readonly authService: AuthService = inject(AuthService);
  private readonly dataService: SchoolDataService = inject(SchoolDataService);
  
  readonly isMapsConfigured = signal(true); // Leaflet is always "configured"
  readonly mapAuthFailed = signal(false); // No auth needed
  isLoadingGeolocation = signal(false);
  locationError = signal('');
  
  private map: any | null = null;
  private marker: any | null = null;
  selectedLocation = signal<Coordinates | null>(null);
  
  // --- Pickup Zone Management ---
  newZoneName = signal('');
  newZoneSpots = signal(5);
  readonly currentSchool = computed(() => this.authService.currentUserSchool());
  readonly pickupZones = computed(() => this.currentSchool()?.pickupZones ?? []);

  readonly isZoneFormValid = computed(() => this.newZoneName().trim() !== '' && this.newZoneSpots() > 0);

  async addZone(): Promise<void> {
    if (!this.isZoneFormValid()) return;

    const school = this.currentSchool();
    if (!school) return;

    const newZone = { name: this.newZoneName().trim().toUpperCase(), spots: this.newZoneSpots() };
    const updatedZones = [...this.pickupZones(), newZone];
    
    await this.dataService.updateSchoolPickupZones(school.id, updatedZones);
    this.toastService.show(this.translationService.translate('school-admin.settings.pickupZones.toast.zoneAdded'), 'success');

    this.newZoneName.set('');
    this.newZoneSpots.set(5);
  }

  async deleteZone(zoneNameToDelete: string): Promise<void> {
    if (!confirm(this.translationService.translate('school-admin.settings.pickupZones.deleteConfirmation'))) return;
    
    const school = this.currentSchool();
    if (!school) return;

    const updatedZones = this.pickupZones().filter(z => z.name !== zoneNameToDelete);
    await this.dataService.updateSchoolPickupZones(school.id, updatedZones);
    this.toastService.show(this.translationService.translate('school-admin.settings.pickupZones.toast.zoneDeleted'), 'success');
  }
  
  readonly schoolLocation = computed(() => this.authService.currentUserSchool()?.location);
  
  isSaveDisabled = computed(() => {
    const selected = this.selectedLocation();
    const saved = this.schoolLocation();
    if (!selected) return true;
    if (!saved) return false; // Can save if there was no previous location
    return selected.lat === saved.lat && selected.lon === saved.lon;
  });

  ngAfterViewInit(): void {
    // We need to wait a bit for the view to be fully ready
    setTimeout(() => this.initMap(), 0);
  }

  ngOnDestroy(): void {
    if (this.map) {
      this.map.remove();
    }
  }

  private initMap(): void {
    if (!this.mapContainer || !this.searchBox) return;

    const initialCoords = this.authService.currentUserSchool()?.location ?? { lat: 24.7136, lon: 46.6753 }; // Default to Riyadh
    this.selectedLocation.set(initialCoords);

    this.map = L.map(this.mapContainer.nativeElement).setView([initialCoords.lat, initialCoords.lon], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(this.map);

    this.marker = L.marker([initialCoords.lat, initialCoords.lon], { draggable: true }).addTo(this.map);

    this.marker.on('dragend', (event: any) => {
      const latlng = event.target.getLatLng();
      this.selectedLocation.set({ lat: latlng.lat, lon: latlng.lng });
    });

    const searchControl = new GeoSearch.GeoSearchControl({
      provider: new GeoSearch.OpenStreetMapProvider(),
      style: 'bar',
      showMarker: false,
      searchLabel: this.translationService.translate('school-admin.settings.searchPlaceholder'),
    });
    this.map.addControl(searchControl);

    this.map.on('geosearch/showlocation', (result: any) => {
      const { x, y } = result.location; // x is lon, y is lat
      const latlng = { lat: y, lng: x };
      if (this.marker) {
        this.marker.setLatLng(latlng);
      }
      this.map.panTo(latlng);
      this.selectedLocation.set({ lat: y, lon: x });
    });
  }

  async centerOnMyLocation(): Promise<void> {
    this.isLoadingGeolocation.set(true);
    this.locationError.set('');

    try {
      const coords = await this.getGeolocation();
      const latlng = { lat: coords.latitude, lon: coords.longitude };
      
      this.map?.setView(latlng, 16);
      this.marker?.setLatLng(latlng);
      this.selectedLocation.set(latlng);

    } catch(e: any) {
      this.locationError.set(e.message);
    } finally {
      this.isLoadingGeolocation.set(false);
    }
  }

  async saveLocation(): Promise<void> {
    const schoolId = this.authService.currentUserSchool()?.id;
    const location = this.selectedLocation();
    if (!schoolId || !location) return;

    await this.dataService.updateSchoolLocation(schoolId, location.lat, location.lon);
    this.toastService.show(this.translationService.translate('school-admin.settings.toast.locationSet'), 'success');
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
        }
      );
    });
  }
}