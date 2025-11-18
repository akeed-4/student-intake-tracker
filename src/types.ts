/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export type View = 'login' | 'parent' | 'school' | 'teacher' | 'guard' | 'admin' | 'role_management';
export type Status = 'idle' | 'notifying' | 'notified' | 'teacher_alerted' | 'ready' | 'picked_up';
export type ParentViewMode = 'request' | 'manage';

export interface AuthorizedPerson {
  id: number;
  name: string;
  relation: string;
  idNumber: string;
  photo: string; // base64 string
}

export interface VerifiedPickup {
  studentName: string;
  studentClass: string;
  authorizedPerson: AuthorizedPerson;
}
