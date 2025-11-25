/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, signal, computed, inject } from '@angular/core';
import { SupabaseService } from './supabase.service';
import { AuthService } from './auth.service';
import { School, Class, Student, AuthorizedPerson, User, UserRole, Coordinates } from '../models/app-types';

@Injectable({ providedIn: 'root' })
export class SchoolDataService {
  // Fix: Explicitly type injected service to resolve 'unknown' property errors.
  private readonly supabaseService: SupabaseService = inject(SupabaseService);
  // Fix: Explicitly type injected service to resolve 'unknown' property errors.
  private readonly authService: AuthService = inject(AuthService);

  private _schools = signal<School[]>([]);
  private _classes = signal<Class[]>([]);
  private _students = signal<Student[]>([]);
  private _authorizedPersons = signal<AuthorizedPerson[]>([]);
  private _users = signal<User[]>([]);

  readonly schools = computed(() => this._schools());
  readonly classes = computed(() => this._classes());
  readonly students = computed(() => this._students());
  readonly authorizedPersons = computed(() => this._authorizedPersons());
  readonly users = computed(() => this._users());

  constructor() {
    this.loadInitialData();
  }

  private async loadInitialData(): Promise<void> {
    await Promise.all([
      this.fetchSchools(),
      this.fetchClasses(),
      this.fetchStudents(),
      this.fetchAuthorizedPersons(),
      this.fetchUsers()
    ]);
  }

  async fetchSchools(): Promise<void> {
    const { data, error } = await this.supabaseService.client.from('schools').select('*');
    if (error) console.error('Error fetching schools:', error);
    else this._schools.set(data as School[]);
  }

  async fetchClasses(): Promise<void> {
    const { data, error } = await this.supabaseService.client.from('classes').select('*');
    if (error) console.error('Error fetching classes:', error);
    else this._classes.set(data as Class[]);
  }

  async fetchStudents(): Promise<void> {
    const { data, error } = await this.supabaseService.client.from('students').select('*');
    if (error) console.error('Error fetching students:', error);
    else this._students.set(data as Student[]);
  }

  async fetchAuthorizedPersons(): Promise<void> {
    const { data, error } = await this.supabaseService.client.from('authorized_persons').select('*');
    if (error) console.error('Error fetching authorized persons:', error);
    else this._authorizedPersons.set(data as AuthorizedPerson[]);
  }

  async fetchUsers(): Promise<void> {
    const { data, error } = await this.supabaseService.client.from('users').select('*');
    if (error) console.error('Error fetching users:', error);
    else this._users.set(data as User[]);
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

  // --- Adders ---
  async addSchool(name: string, adminName: string, adminEmail: string): Promise<void> {
    const schoolId = crypto.randomUUID();
    const adminId = crypto.randomUUID(); // Supabase auth generates real IDs, this is for demo users

    // Add school
    const { error: schoolError } = await this.supabaseService.client
      .from('schools')
      .insert({ id: schoolId, name });
    if (schoolError) {
      console.error('Error adding school:', schoolError);
      return;
    }

    // Add admin user (assuming it's already registered via auth or we create a dummy entry)
    const { error: userError } = await this.supabaseService.client
      .from('users')
      .insert({ id: adminId, name: adminName, email: adminEmail, role: 'school-admin', schoolId });
    if (userError) {
      console.error('Error adding school admin user:', userError);
      return;
    }

    await this.fetchSchools();
    await this.fetchUsers();
  }

  async addClass(name: string, schoolId: string): Promise<void> {
    const newClass: Class = { id: crypto.randomUUID(), name, schoolId };
    const { error } = await this.supabaseService.client.from('classes').insert(newClass);
    if (error) console.error('Error adding class:', error);
    else this._classes.update(classes => [...classes, newClass]);
  }

  async addStudent(student: Omit<Student, 'id'>): Promise<void> {
    const newStudent = { ...student, id: crypto.randomUUID() };
    const { error } = await this.supabaseService.client.from('students').insert(newStudent);
    if (error) console.error('Error adding student:', error);
    else this._students.update(students => [...students, newStudent]);
  }

  async addAuthorizedPerson(person: Omit<AuthorizedPerson, 'id' | 'photoUrl'>): Promise<void> {
    const newPerson = { ...person, id: crypto.randomUUID(), photoUrl: 'https://picsum.photos/50/50' };
    const { error } = await this.supabaseService.client.from('authorized_persons').insert(newPerson);
    if (error) console.error('Error adding authorized person:', error);
    else this._authorizedPersons.update(persons => [...persons, newPerson]);
  }

  async addUser(user: Omit<User, 'id'>): Promise<void> {
    const newUser = { ...user, id: crypto.randomUUID() };
    const { error } = await this.supabaseService.client.from('users').insert(newUser);
    if (error) console.error('Error adding user:', error);
    else this._users.update(users => [...users, newUser]);
  }

  // --- Updaters ---
  async updateSchoolAndAdmin(schoolId: string, schoolName: string, adminId: string, adminName: string, adminEmail: string): Promise<void> {
    // Update school
    const { error: schoolError } = await this.supabaseService.client
      .from('schools')
      .update({ name: schoolName })
      .eq('id', schoolId);
    if (schoolError) {
      console.error('Error updating school:', schoolError);
      return;
    }

    // Update admin user
    const { error: userError } = await this.supabaseService.client
      .from('users')
      .update({ name: adminName, email: adminEmail })
      .eq('id', adminId);
    if (userError) {
      console.error('Error updating admin user:', userError);
      return;
    }

    await this.fetchSchools();
    await this.fetchUsers();
  }

  async updateSchoolLocation(schoolId: string, lat: number, lon: number): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('schools')
      .update({ location: { lat, lon } })
      .eq('id', schoolId);
    if (error) {
      console.error('Error updating school location:', error);
    } else {
      await this.fetchSchools(); // Refresh to get updated location
      // Also update current user's school if it's the one being updated
      // Fix: Explicitly check for null before accessing properties.
      if (this.authService.currentUserSchool()?.id === schoolId) {
        this.authService.currentUserSchool.update(school => ({ ...school!, location: { lat, lon } }));
      }
    }
  }

  async updateUser(user: User): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('users')
      .update(user)
      .eq('id', user.id);
    if (error) {
      console.error('Error updating user:', error);
    } else {
      await this.fetchUsers();
      // Fix: Explicitly check for null before accessing properties.
      if (this.authService.currentUser()?.id === user.id) {
        this.authService.currentUser.set(user);
      }
    }
  }

  async updateStudent(student: Student): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('students')
      .update(student)
      .eq('id', student.id);
    if (error) console.error('Error updating student:', error);
    else await this.fetchStudents();
  }

  async updateAuthorizedPerson(person: AuthorizedPerson): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('authorized_persons')
      .update(person)
      .eq('id', person.id);
    if (error) console.error('Error updating authorized person:', error);
    else await this.fetchAuthorizedPersons();
  }

  // --- Deleters ---
  async deleteSchoolAndAdmin(schoolId: string): Promise<void> {
    // Delete all related data first (classes, students, authorized persons, pickup requests, absence reports)
    await this.supabaseService.client.from('classes').delete().eq('schoolId', schoolId);
    await this.supabaseService.client.from('students').delete().eq('schoolId', schoolId);
    // Note: authorized persons might be linked to parents who are linked to students.
    // This cascading deletion needs careful handling in a real app.
    // For demo, we'll assume direct deletion is fine.
    const { data: studentsInSchool } = await this.supabaseService.client.from('students').select('parentId').eq('schoolId', schoolId);
    const parentIds = [...new Set(studentsInSchool?.map(s => s.parentId))];
    if (parentIds.length > 0) {
      await this.supabaseService.client.from('authorized_persons').delete().in('parentId', parentIds);
    }
    await this.supabaseService.client.from('pickup_requests').delete().eq('schoolId', schoolId);
    await this.supabaseService.client.from('absence_reports').delete().eq('schoolId', schoolId);

    // Delete users associated with the school
    const { data: usersInSchool } = await this.supabaseService.client.from('users').select('id').eq('schoolId', schoolId);
    const userIds = usersInSchool?.map(u => u.id);
    if (userIds && userIds.length > 0) {
      await this.supabaseService.client.from('users').delete().in('id', userIds);
    }

    // Delete school
    const { error: schoolError } = await this.supabaseService.client
      .from('schools')
      .delete()
      .eq('id', schoolId);

    if (schoolError) {
      console.error('Error deleting school:', schoolError);
    } else {
      await this.fetchSchools();
      await this.fetchUsers();
      await this.fetchClasses();
      await this.fetchStudents();
      await this.fetchAuthorizedPersons();
    }
  }

  async deleteUserAndAssociatedData(userId: string): Promise<void> {
    const userToDelete = this._users().find(u => u.id === userId);
    if (!userToDelete) return;

    if (userToDelete.role === 'school-admin' && userToDelete.schoolId) {
      // If deleting a school admin, delete the entire school and its data
      await this.deleteSchoolAndAdmin(userToDelete.schoolId);
    } else {
      // Delete user
      const { error } = await this.supabaseService.client
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user:', error);
      } else {
        await this.fetchUsers();
      }
    }
  }

  async deleteAuthorizedPerson(personId: string): Promise<void> {
    const { error } = await this.supabaseService.client
      .from('authorized_persons')
      .delete()
      .eq('id', personId);
    if (error) console.error('Error deleting authorized person:', error);
    else await this.fetchAuthorizedPersons();
  }
}