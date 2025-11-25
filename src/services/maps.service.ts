/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, inject, signal } from '@angular/core';
import { GOOGLE_MAPS_CONFIG, GoogleMapsConfig } from '../app.config';

@Injectable({ providedIn: 'root' })
export class MapsService {
  // Fix: Explicitly type injected GoogleMapsConfig to resolve 'unknown' property errors.
  private readonly config: GoogleMapsConfig = inject(GOOGLE_MAPS_CONFIG);
  private readonly mapsApiUrl = 'https://maps.googleapis.com/maps/api/js';
  private apiLoaded = signal(false);
  authFailed = signal(false);

  readonly isConfigured = signal(!!this.config.apiKey);

  constructor() {
    if (!this.config.apiKey) {
      console.warn('Google Maps API Key is not configured. Map functionality will be limited.');
    }
  }

  loadApi(): Promise<void> {
    if (this.apiLoaded()) {
      return Promise.resolve();
    }

    if (!this.isConfigured()) {
      this.authFailed.set(true);
      return Promise.reject(new Error('Google Maps API Key is not provided.'));
    }

    return new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `${this.mapsApiUrl}?key=${this.config.apiKey}&libraries=places&callback=initMap`;
      script.async = true;
      script.defer = true;

      (window as any)['initMap'] = () => {
        this.apiLoaded.set(true);
        resolve();
      };

      script.onerror = (error: any) => {
        this.authFailed.set(true);
        console.error('Failed to load Google Maps script', error);
        reject(new Error('Failed to load Google Maps script. Check API key and network.'));
      };

      document.head.appendChild(script);
    });
  }
}