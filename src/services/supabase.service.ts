/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class SupabaseService {
  /**
   * This service is intentionally left blank.
   * As per the user's request, Supabase integration has been removed,
   * and the application now uses in-memory mock data for all operations.
   */
  public readonly client: any = null; // Set to null to break dependencies
}
