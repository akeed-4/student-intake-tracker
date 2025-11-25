/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class NotificationService {
  readonly latestBroadcast = signal<{ message: string; timestamp: number } | null>(null);

  sendBroadcast(message: string): void {
    this.latestBroadcast.set({ message, timestamp: Date.now() });
  }
}
