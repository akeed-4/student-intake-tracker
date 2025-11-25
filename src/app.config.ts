/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { InjectionToken } from '@angular/core';
import { environment } from './environments/environment';

export interface GoogleMapsConfig {
  apiKey: string | null;
}

export const GOOGLE_MAPS_CONFIG = new InjectionToken<GoogleMapsConfig>('GOOGLE_MAPS_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    apiKey: environment.googleMapsApiKey,
  }),
});

// To satisfy other services that might be looking for Supabase config,
// we'll provide dummy values here. The app logic has shifted to mock data.
export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export const SUPABASE_CONFIG = new InjectionToken<SupabaseConfig>('SUPABASE_CONFIG', {
  providedIn: 'root',
  factory: () => ({
    url: environment.supabase.url,
    anonKey: environment.supabase.anonKey,
  }),
});
