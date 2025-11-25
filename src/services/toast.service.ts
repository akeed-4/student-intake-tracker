/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, signal } from '@angular/core';
import { Toast } from '../models/app-types';

@Injectable({ providedIn: 'root' })
export class ToastService {
  readonly toasts = signal<Toast[]>([]);
  private nextId = 0;

  show(message: string, type: 'success' | 'error' | 'info' | 'warn', duration: number = 3000): void {
    const id = this.nextId++;
    this.toasts.update(currentToasts => [...currentToasts, { id, message, type, duration }]);

    if (duration > 0) {
      setTimeout(() => this.remove(id), duration);
    }
  }

  remove(id: number): void {
    this.toasts.update(currentToasts => currentToasts.filter(toast => toast.id !== id));
  }
}
