/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, signal, computed, inject, Injector } from '@angular/core';
import { AuthService } from './auth.service';
import { School, Class, Student, AuthorizedPerson, User, UserRole, Coordinates, SchoolBus, Activity, CarpoolGroup, CarpoolGroupMember } from '../models/app-types';
import { MOCK_AUTHORIZED_PERSONS, MOCK_BUSES, MOCK_CLASSES, MOCK_SCHOOLS, MOCK_STUDENTS, MOCK_USERS, MOCK_ACTIVITIES, MOCK_CARPOOL_GROUPS, MOCK_CARPOOL_MEMBERS } from './mock-data';

@Injectable({ providedIn: 'root' })
export class SchoolDataService {
  private injector = inject(Injector);
  private _authService: AuthService | null = null;
  private get authService(): AuthService {
    if (!this._authService) {
      this._authService = this.injector.get(AuthService);
    }
    return this._authService;
  }

  private _schools = signal<School[]>([]);
  private _classes = signal<Class[]>([]);
  private _students = signal<Student[]>([]);
  private _authorizedPersons = signal<AuthorizedPerson[]>([]);
  private _users = signal<User[]>([]);
  private _buses = signal<SchoolBus[]>([]);
  private _activities = signal<Activity[]>([]);
  private _carpoolGroups = signal<CarpoolGroup[]>([]);
  private _carpoolMembers = signal<CarpoolGroupMember[]>([]);

  readonly schools = this._schools.asReadonly();
  readonly classes = this._classes.asReadonly();
  readonly students = this._students.asReadonly();
  readonly authorizedPersons = this._authorizedPersons.asReadonly();
  readonly users = this._users.asReadonly();
  readonly buses = this._buses.asReadonly();
  readonly activities = this._activities.asReadonly();

  constructor() {
    this.loadInitialData();
  }

  private loadInitialData(): void {
    this._schools.set(MOCK_SCHOOLS);
    this._classes.set(MOCK_CLASSES);
    this._students.set(MOCK_STUDENTS);
    this._authorizedPersons.set(MOCK_AUTHORIZED_PERSONS);
    this._users.set(MOCK_USERS);
    this._buses.set(MOCK_BUSES);
    this._activities.set(MOCK_ACTIVITIES);
    this._carpoolGroups.set(MOCK_CARPOOL_GROUPS);
    this._carpoolMembers.set(MOCK_CARPOOL_MEMBERS);
  }

  // --- Getters ---
  getSchoolById(id: string): School | undefined {
    return this._schools().find(s => s.id === id);
  }

  getClassesBySchool(schoolId: string): Class[] {
    return this._classes().filter(c => c.schoolId === schoolId);
  }
  
  getClassById(classId: string): Class | undefined {
    return this._classes().find(c => c.id === classId);
  }
  
  getStudentsByParentId(parentId: string): Student[] {
    return this._students().filter(s => s.parentId === parentId);
  }
  
  getStudentsBySchool(schoolId: string): Student[] {
    return this._students().filter(s => s.schoolId === schoolId);
  }
  
  getAuthorizedPersonsByParentId(parentId: string): AuthorizedPerson[] {
    return this._authorizedPersons().filter(p => p.parentId === parentId);
  }
  
  getAdminForSchool(schoolId: string): User | undefined {
    return this._users().find(u => u.schoolId === schoolId && u.role === 'school-admin');
  }
  
  getStaffForSchool(schoolId: string): User[] {
    return this._users().filter(u => 
      u.schoolId === schoolId && (u.role === 'teacher' || u.role === 'school-supervisor' || u.role === 'guard')
    );
  }

  getBusById(busId: string): SchoolBus | undefined {
    return this._buses().find(b => b.id === busId);
  }

  getBusesBySchool(schoolId: string): SchoolBus[] {
    return this._buses().filter(b => b.schoolId === schoolId);
  }

  getActivitiesBySchool(schoolId: string): Activity[] {
    return this._activities().filter(a => a.schoolId === schoolId);
  }
  
  getCarpoolGroupsForUser(userId: string): CarpoolGroup[] {
    const groupIds = new Set(this._carpoolMembers().filter(m => m.userId === userId).map(m => m.groupId));
    return this._carpoolGroups().filter(g => groupIds.has(g.id));
  }

  getMembersForGroup(groupId: string): User[] {
    const memberUserIds = new Set(this._carpoolMembers().filter(m => m.groupId === groupId).map(m => m.userId));
    return this._users().filter(u => memberUserIds.has(u.id));
  }

  getParentsForSchool(schoolId: string): User[] {
    return this._users().filter(u => u.schoolId === schoolId && u.role === 'parent');
  }

  // --- Adders ---
  async addSchool(name: string, adminName: string, adminEmail: string, adminPassword?: string): Promise<void> {
    const schoolId = crypto.randomUUID();
    const newSchool: School = { id: schoolId, name };
    this._schools.update(s => [...s, newSchool]);
    
    const newAdmin: User = {
      id: crypto.randomUUID(),
      name: adminName,
      email: adminEmail,
      role: 'school-admin',
      schoolId: schoolId,
      password: adminPassword,
    };
    this._users.update(u => [...u, newAdmin]);
  }

  async addClass(name: string, schoolId: string): Promise<void> {
    const newClass: Class = { id: crypto.randomUUID(), name, schoolId };
    this._classes.update(c => [...c, newClass]);
  }
  
  async addStudent(student: Omit<Student, 'id'>): Promise<void> {
    const newStudent: Student = { ...student, id: crypto.randomUUID() };
    this._students.update(s => [...s, newStudent]);
  }
  
  async addAuthorizedPerson(person: Omit<AuthorizedPerson, 'id' | 'photoUrl'>): Promise<void> {
    const newPerson: AuthorizedPerson = { ...person, id: crypto.randomUUID(), photoUrl: 'https://picsum.photos/seed/default/50/50' };
    this._authorizedPersons.update(p => [...p, newPerson]);
  }
  
  async addUser(user: Omit<User, 'id'>): Promise<void> {
    const newUser: User = { ...user, id: crypto.randomUUID() };
    this._users.update(u => [...u, newUser]);
  }

  async addBus(busData: { schoolId: string; busNumber: string; driverName: string; }): Promise<void> {
    const newBus: SchoolBus = {
      ...busData,
      id: crypto.randomUUID(),
      studentIds: [],
      status: 'stationary',
    };
    this._buses.update(b => [...b, newBus]);
  }

  async addActivity(activityData: Omit<Activity, 'id' | 'studentIds'>): Promise<void> {
    const newActivity: Activity = { ...activityData, id: crypto.randomUUID(), studentIds: [] };
    this._activities.update(a => [...a, newActivity]);
  }

  async createCarpoolGroup(name: string, schoolId: string, adminId: string): Promise<void> {
    const newGroup: CarpoolGroup = {
      id: crypto.randomUUID(),
      name,
      schoolId,
      adminId,
    };
    this._carpoolGroups.update(g => [...g, newGroup]);
    this.addMemberToGroup(newGroup.id, adminId);
  }

  async addMemberToGroup(groupId: string, userId: string): Promise<void> {
    const newMember: CarpoolGroupMember = { groupId, userId };
    this._carpoolMembers.update(m => [...m, newMember]);
  }

  // --- Updaters ---
  async updateSchoolAndAdmin(schoolId: string, schoolName: string, adminId: string, adminName: string, adminEmail: string, adminPassword?: string): Promise<void> {
    this._schools.update(schools => schools.map(s => s.id === schoolId ? { ...s, name: schoolName } : s));
    
    this._users.update(users => users.map(u => {
      if (u.id === adminId) {
        const updatedAdmin = { ...u, name: adminName, email: adminEmail };
        if (adminPassword) {
          updatedAdmin.password = adminPassword;
        }
        return updatedAdmin;
      }
      return u;
    }));
  }

  async updateSchoolLocation(schoolId: string, lat: number, lon: number): Promise<void> {
    this._schools.update(schools => schools.map(s => s.id === schoolId ? { ...s, location: { lat, lon } } : s));
    if (this.authService.currentUserSchool()?.id === schoolId) {
      this.authService.currentUserSchool.update(school => ({ ...school!, location: { lat, lon } }));
    }
  }
  
  async updateUser(user: User): Promise<void> {
    this._users.update(users => users.map(u => u.id === user.id ? user : u));
    if (this.authService.currentUser()?.id === user.id) {
      this.authService.currentUser.set(user);
    }
  }
  
  async updateStudent(student: Student): Promise<void> {
    this._students.update(students => students.map(s => s.id === student.id ? student : s));
  }
  
  async updateAuthorizedPerson(person: AuthorizedPerson): Promise<void> {
    this._authorizedPersons.update(persons => persons.map(p => p.id === person.id ? person : p));
  }

  async updateBus(bus: SchoolBus): Promise<void> {
    this._buses.update(buses => buses.map(b => b.id === bus.id ? bus : b));
  }

  async updateBusAssignments(busId: string, studentIds: string[]): Promise<void> {
    this._students.update(students => students.map(s => {
      if (s.busId === busId && !studentIds.includes(s.id)) {
        return { ...s, busId: undefined };
      }
      if (studentIds.includes(s.id)) {
        return { ...s, busId: busId };
      }
      return s;
    }));
    this._buses.update(buses => buses.map(b => b.id === busId ? { ...b, studentIds } : b));
  }
  
  async updateActivity(activity: Activity): Promise<void> {
    this._activities.update(activities => activities.map(a => a.id === activity.id ? activity : a));
  }

  async updateActivityAssignments(activityId: string, studentIds: string[]): Promise<void> {
    this._activities.update(activities => activities.map(a => 
      a.id === activityId ? { ...a, studentIds } : a
    ));
  }

  async updateSchoolPickupZones(schoolId: string, zones: { name: string; spots: number }[]): Promise<void> {
    this._schools.update(schools => schools.map(s => s.id === schoolId ? { ...s, pickupZones: zones } : s));
    if (this.authService.currentUserSchool()?.id === schoolId) {
        this.authService.currentUserSchool.update(school => ({ ...school!, pickupZones: zones }));
    }
  }

  // --- Deleters ---
  async deleteSchoolAndAdmin(schoolId: string): Promise<void> {
    this._schools.update(schools => schools.filter(s => s.id !== schoolId));
    this._users.update(users => users.filter(u => u.schoolId !== schoolId));
    this._classes.update(classes => classes.filter(c => c.schoolId !== schoolId));
    this._students.update(students => students.filter(s => s.schoolId !== schoolId));
  }

  async deleteUserAndAssociatedData(userId: string): Promise<void> {
    const userToDelete = this._users().find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.role === 'school-admin' && userToDelete.schoolId) {
      await this.deleteSchoolAndAdmin(userToDelete.schoolId);
    } else {
      this._users.update(users => users.filter(u => u.id !== userId));
    }
  }
  
  async deleteAuthorizedPerson(personId: string): Promise<void> {
    this._authorizedPersons.update(persons => persons.filter(p => p.id !== personId));
  }

  async deleteClass(classId: string): Promise<void> {
    this._classes.update(classes => classes.filter(c => c.id !== classId));
    // Also unassign students and teachers
    this._students.update(students => students.map(s => s.classId === classId ? { ...s, classId: '', class: 'Unassigned' } : s));
    this._users.update(users => users.map(u => u.classId === classId ? { ...u, classId: undefined } : u));
  }

  async deleteStudent(studentId: string): Promise<void> {
    this._students.update(students => students.filter(s => s.id !== studentId));
  }
  
  async deleteBus(busId: string): Promise<void> {
    // Unassign students from this bus
    this._students.update(students => students.map(s => s.busId === busId ? { ...s, busId: undefined } : s));
    // Remove the bus
    this._buses.update(buses => buses.filter(b => b.id !== busId));
  }

  async deleteActivity(activityId: string): Promise<void> {
    this._activities.update(activities => activities.filter(a => a.id !== activityId));
  }

  // --- Other Methods ---
  async inviteDriver(parentId: string, phone: string): Promise<User | null> {
    const parent = this._users().find(u => u.id === parentId);
    if (!parent || !parent.schoolId) return null;
  
    const existingUser = this._users().find(u => u.phone === phone);
    if (existingUser) {
        // In a real app, you might notify the parent that this user already exists.
        return null; 
    }
  
    const driverName = `Driver (${phone})`;
    const newDriver: User = {
      id: crypto.randomUUID(),
      name: driverName,
      email: `${phone}@school-pickup.app`,
      phone: phone,
      role: 'driver',
      schoolId: parent.schoolId,
      password: 'password',
      employerId: parentId,
    };
    this._users.update(u => [...u, newDriver]);
  
    // Also automatically add them as an authorized person for the parent
    const newAuthorizedPerson: Omit<AuthorizedPerson, 'id' | 'photoUrl'> = {
      parentId: parentId,
      name: driverName,
      relation: 'Driver',
      phone: phone,
      idNumber: 'N/A', // Drivers might not have ID numbers on file initially
    };
    await this.addAuthorizedPerson(newAuthorizedPerson);
    
    return newDriver;
  }
}
