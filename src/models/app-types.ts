/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

export interface Coordinates {
  lat: number;
  lon: number;
}

export interface School {
  id: string;
  name: string;
  location?: Coordinates;
  pickupZones?: { name: string; spots: number }[];
}

export interface Class {
  id: string;
  name: string;
  schoolId: string;
}

export interface Student {
  id: string;
  name: string;
  grade: string;
  class: string; // The name of the class
  classId: string;
  schoolId: string;
  parentId: string;
  parentPhone?: string;
  photoUrl?: string;
  busId?: string;
}

export interface AuthorizedPerson {
  id: string;
  parentId: string;
  name: string;
  relation: string;
  photoUrl: string;
  idNumber: string;
  phone?: string;
}

export interface CarInfo {
  color: string;
  plateNumber: string;
}

export type PickupRequestStatus = 'pending' | 'acknowledged' | 'arrived' | 'ready' | 'completed';

export interface PickupRequest {
  id: string; 
  code: string;
  student: Student;
  authorizedPerson: AuthorizedPerson;
  carInfo: CarInfo;
  status: PickupRequestStatus;
  eta: number | null;
  distance: number | null;
  notes: string | null;
  schoolId: string;
  created_at?: string;
  completed_at?: string;
  assignedZone?: string;
  assignedSpot?: number;
  initiatedByDriverId?: string;
}

export type UserRole =
  | 'parent'
  | 'guard'
  | 'teacher' // Represents a Class Supervisor
  | 'school-supervisor' // Represents a General Supervisor
  | 'school-admin'
  | 'super-admin'
  | 'driver';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  password?: string;
  schoolId?: string;
  classId?: string; // For teachers/class supervisors
  phone?: string;
  employerId?: string; // For drivers, links to the parent user ID
}

export interface Toast {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info' | 'warn';
  duration?: number;
}

export interface AbsenceReport {
  id: string;
  student: Student;
  date: string;
  reason: string;
  reportedByParentId?: string;
  schoolId?: string;
  created_at?: string;
}

export interface SchoolBus {
  id: string;
  schoolId: string;
  busNumber: string;
  driverName: string;
  studentIds: string[];
  liveLocation?: Coordinates;
  status: 'stationary' | 'en_route' | 'stopped';
}

export interface Activity {
  id: string;
  schoolId: string;
  name: string;
  supervisorId: string; // a user id (teacher)
  studentIds: string[];
  startTime: string; // "HH:MM"
  endTime: string; // "HH:MM"
  location: string; // e.g., "Gym", "Library"
}

export interface CarpoolScheduleItem {
  dayOfWeek: number; // 0 for Sunday, 1 for Monday, etc.
  driverId: string;
}

export interface ActiveCarpoolTrip {
  driverId: string;
  startTime: string; // ISO string
  status: 'in_progress' | 'completed';
  liveLocation?: Coordinates;
  pickedUpStudentIds: string[];
}


export interface CarpoolGroup {
  id: string;
  name: string;
  schoolId: string;
  adminId: string; // The user ID of the group's creator/admin
  schedule?: CarpoolScheduleItem[];
  activeTrip?: ActiveCarpoolTrip | null;
}

export interface CarpoolGroupMember {
  userId: string;
  groupId: string;
}


// Consolidating component-specific types here since adding new `model.ts` files is forbidden.
// These types will then be imported and used by their respective components directly.

// For ParentPortalComponent
export type ParentView = 'pickup' | 'absence' | 'management' | 'bus' | 'activities' | 'carpooling';
export type ParentPortalPickupStatus = 'idle' | 'loading' | 'success' | 'error';

// For AccountManagementComponent
export type UserWithSchoolName = User & { schoolName: string };
export interface AccountManagementEmptyForm {
  id: string;
  name: string;
  email: string;
  role: UserRole | '';
  // Fix: Add missing properties to align the form model with its usage within the component, resolving a type error.
  schoolId: string;
  classId: string;
}
export interface AuthorizedPersonManagementEmptyForm {
  name: string;
  relation: string;
  phone: string;
  idNumber: string;
}
export const EMPTY_AUTHORIZED_PERSON_FORM: AuthorizedPersonManagementEmptyForm = { name: '', relation: '', phone: '', idNumber: '' };

export interface StaffManagementEmptyForm {
  name: string;
  phone: string;
  role: UserRole | '';
  classId: string;
}
export const EMPTY_STAFF_MANAGEMENT_FORM: StaffManagementEmptyForm = { name: '', phone: '', role: '', classId: '' };

export interface StudentManagementEmptyForm {
  name: string;
  parentPhone: string;
  classId: string;
}
export const EMPTY_STUDENT_MANAGEMENT_FORM: StudentManagementEmptyForm = { name: '', parentPhone: '', classId: '' };

export interface SchoolManagementEmptyForm {
  name: string;
  adminName: string;
  adminEmail: string;
  adminPassword?: string;
  adminPasswordConfirm?: string;
}
export const EMPTY_SCHOOL_MANAGEMENT_FORM: SchoolManagementEmptyForm = { name: '', adminName: '', adminEmail: '', adminPassword: '', adminPasswordConfirm: ''};
export type SuperAdminView = 'schools' | 'accounts';

export const EMPTY_ACCOUNT_MANAGEMENT_FORM: AccountManagementEmptyForm = {
  id: '',
  name: '',
  email: '',
  role: '',
  // Fix: Initialize missing properties to align the empty form object with its updated interface.
  schoolId: '',
  classId: '',
};

export type AdminView = 'monitor' | 'staff' | 'students' | 'classes' | 'settings' | 'analytics' | 'buses' | 'activities' | 'broadcast';

export interface BusManagementEmptyForm {
  busNumber: string;
  driverName: string;
}
export const EMPTY_BUS_MANAGEMENT_FORM: BusManagementEmptyForm = { busNumber: '', driverName: ''};

export interface ActivityManagementEmptyForm {
    name: string;
    supervisorId: string;
    startTime: string;
    endTime: string;
    location: string;
}
export const EMPTY_ACTIVITY_MANAGEMENT_FORM: ActivityManagementEmptyForm = { name: '', supervisorId: '', startTime: '', endTime: '', location: ''};