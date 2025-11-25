/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { School, User, Class, Student, AuthorizedPerson, SchoolBus, Activity, CarpoolGroup, CarpoolGroupMember } from '../models/app-types';

export const MOCK_SCHOOLS: School[] = [
  {
    id: 'school-1',
    name: 'Al-Bayan Model School',
    location: { lat: 24.7136, lon: 46.6753 },
    pickupZones: [
      { name: 'A', spots: 10 },
      { name: 'B', spots: 5 },
    ]
  },
  { id: 'school-2', name: 'Dar Al-Fikr Schools' },
];

export const MOCK_USERS: User[] = [
  // Super Admin
  { id: 'user-super-admin', name: 'Super Admin', email: 'super@school.com', role: 'super-admin', password: 'password' },
  
  // School 1 Admins & Staff
  { id: 'user-admin-1', name: 'Nora Al-Saud', email: 'admin@school.com', role: 'school-admin', schoolId: 'school-1', password: 'password' },
  { id: 'user-supervisor-1', name: 'Fatima Al-Mutairi', email: 'supervisor@school.com', role: 'school-supervisor', schoolId: 'school-1', password: 'password' },
  { id: 'user-teacher-1a', name: 'Ahmad Al-Ghamdi', email: 'teacher@school.com', role: 'teacher', schoolId: 'school-1', classId: 'class-1a', password: 'password' },
  { id: 'user-teacher-1b', name: 'Layla Al-Johani', email: 'teacher2@school.com', role: 'teacher', schoolId: 'school-1', classId: 'class-1b', password: 'password' },
  { id: 'user-guard-1', name: 'Mohammed Salah', email: 'guard@school.com', role: 'guard', schoolId: 'school-1', password: 'password' },
  
  // School 2 Admins & Staff
  { id: 'user-admin-2', name: 'Khalid Al-Faisal', email: 'admin2@school.com', role: 'school-admin', schoolId: 'school-2', password: 'password' },

  // Parents
  { id: 'user-parent-1', name: 'Abdullah Al-Qahtani', email: 'parent@school.com', phone: '0501234567', role: 'parent', schoolId: 'school-1', password: 'password' },
  { id: 'user-parent-2', name: 'Sara Al-Otaibi', email: 'parent2@school.com', phone: '0557654321', role: 'parent', schoolId: 'school-1', password: 'password' },

  // Driver
  { 
    id: 'user-driver-1', 
    name: 'Ali Khan', 
    email: 'driver@school.com',
    phone: '0512345678', 
    role: 'driver', 
    schoolId: 'school-1', 
    password: 'password',
    employerId: 'user-parent-1' // Linked to Abdullah Al-Qahtani
  },
];

export const MOCK_CLASSES: Class[] = [
  { id: 'class-1a', name: 'Grade 1 - Section A', schoolId: 'school-1' },
  { id: 'class-1b', name: 'Grade 1 - Section B', schoolId: 'school-1' },
  { id: 'class-2a', name: 'Grade 2 - Section A', schoolId: 'school-1' },
  { id: 'class-dar', name: 'Grade 3', schoolId: 'school-2' },
];

export const MOCK_STUDENTS: Student[] = [
  { id: 'student-1', name: 'Faisal Abdullah Al-Qahtani', grade: 'Grade 1', class: 'Grade 1 - Section A', classId: 'class-1a', schoolId: 'school-1', parentId: 'user-parent-1', parentPhone: '0501234567', photoUrl: 'https://picsum.photos/seed/Faisal/50/50', busId: 'bus-1' },
  { id: 'student-2', name: 'Joud Abdullah Al-Qahtani', grade: 'Grade 2', class: 'Grade 2 - Section A', classId: 'class-2a', schoolId: 'school-1', parentId: 'user-parent-1', parentPhone: '0501234567', photoUrl: 'https://picsum.photos/seed/Joud/50/50' },
  { id: 'student-3', name: 'Saud Al-Otaibi', grade: 'Grade 1', class: 'Grade 1 - Section B', classId: 'class-1b', schoolId: 'school-1', parentId: 'user-parent-2', parentPhone: '0557654321', photoUrl: 'https://picsum.photos/seed/Saud/50/50', busId: 'bus-1' },
];

export const MOCK_AUTHORIZED_PERSONS: AuthorizedPerson[] = [
  { id: 'ap-1', parentId: 'user-parent-1', name: 'Abdullah Al-Qahtani', relation: 'Father', phone: '0501234567', idNumber: '1012345678', photoUrl: 'https://picsum.photos/seed/Abdullah/50/50' },
  { id: 'ap-2', parentId: 'user-parent-1', name: 'Hessa Al-Qahtani', relation: 'Mother', phone: '0508765432', idNumber: '2012345678', photoUrl: 'https://picsum.photos/seed/Hessa/50/50' },
  { id: 'ap-3', parentId: 'user-parent-2', name: 'Sara Al-Otaibi', relation: 'Mother', phone: '0557654321', idNumber: '2098765432', photoUrl: 'https://picsum.photos/seed/Sara/50/50' },
];

export const MOCK_BUSES: SchoolBus[] = [
  { 
    id: 'bus-1', 
    schoolId: 'school-1', 
    busNumber: 'Bus 01 - North Route', 
    driverName: 'Sameer Ahmed',
    studentIds: ['student-1', 'student-3'],
    liveLocation: { lat: 24.7336, lon: 46.6953 },
    status: 'en_route',
  },
  { 
    id: 'bus-2', 
    schoolId: 'school-1', 
    busNumber: 'Bus 02 - South Route', 
    driverName: 'Yusuf Islam',
    studentIds: [],
    liveLocation: { lat: 24.6936, lon: 46.6553 },
    status: 'stationary',
  },
];

export const MOCK_ACTIVITIES: Activity[] = [
  {
    id: 'activity-1',
    schoolId: 'school-1',
    name: 'Soccer Club',
    supervisorId: 'user-teacher-1a',
    studentIds: ['student-1', 'student-2'],
    startTime: '15:00',
    endTime: '16:00',
    location: 'Main Field'
  },
  {
    id: 'activity-2',
    schoolId: 'school-1',
    name: 'Art Club',
    supervisorId: 'user-teacher-1b',
    studentIds: ['student-3'],
    startTime: '15:30',
    endTime: '16:30',
    location: 'Art Room'
  },
];

// Fix: Add missing exports for carpool mock data.
export const MOCK_CARPOOL_GROUPS: CarpoolGroup[] = [];
export const MOCK_CARPOOL_MEMBERS: CarpoolGroupMember[] = [];
