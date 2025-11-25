/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { inject, Injectable, signal } from '@angular/core';
import { SupabaseClient, User } from '@supabase/supabase-js';
import { SUPABASE_CONFIG, SupabaseConfig } from './app.config';
import { UserRole } from './models/app-types';

@Injectable({ providedIn: 'root' })
export class AuthService {
  // Fix: Explicitly type injected SupabaseConfig to resolve 'unknown' property errors.
  private readonly supabase: SupabaseConfig = inject(SUPABASE_CONFIG);
  private readonly client = new SupabaseClient(this.supabase.url, this.supabase.anonKey);

  currentUser = signal<User | null>(null);
  currentUserSchool = signal<any | null>(null); // Placeholder for school, will be properly typed by SchoolDataService

  constructor() {
    // Fix: Apply 'as any' type assertion to 'this.client.auth' to resolve TypeScript error.
    // This is a workaround for a type definition issue where SupabaseAuthClient is reported
    // as not having 'onAuthStateChange', which it should.
    (this.client.auth as any).onAuthStateChange(async (event:any, session:any) => {
      if (session?.user) {
        // Fetch user profile from public.users table
        const { data, error } = await this.client
          .from('users')
          .select('*')
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.error('Error fetching user profile:', error);
          this.currentUser.set(null);
        } else if (data) {
          this.currentUser.set(data as User);
          // Assuming school data needs to be fetched based on user's schoolId
          if (data.schoolId) {
            const { data: schoolData, error: schoolError } = await this.client
              .from('schools')
              .select('*')
              .eq('id', data.schoolId)
              .single();
            if (schoolError) {
              console.error('Error fetching school data:', schoolError);
              this.currentUserSchool.set(null);
            } else if (schoolData) {
              this.currentUserSchool.set(schoolData);
            }
          } else {
            this.currentUserSchool.set(null);
          }
        }
      } else {
        this.currentUser.set(null);
        this.currentUserSchool.set(null);
      }
    });
    this.checkSession();
  }

  private async checkSession(): Promise<void> {
    // Fix: Apply 'as any' type assertion to 'this.client.auth' to resolve TypeScript error.
    // This is a workaround for a type definition issue where SupabaseAuthClient is reported
    // as not having 'getSession', which it should.
    const { data: { session } } = await (this.client.auth as any).getSession();
    if (session) {
      // Trigger onAuthStateChange listener to update current user and school
    } else {
      this.currentUser.set(null);
      this.currentUserSchool.set(null);
    }
  }

  async login(role: UserRole): Promise<boolean> {
    // This is a simplified demo login. In a real app, you'd use actual credentials.
    // The demo relies on pre-configured users in Supabase.
    const demoEmailMap: Record<UserRole, string> = {
      'parent': 'parent@school.com',
      'guard': 'guard@school.com',
      'teacher': 'teacher@school.com',
      'school-supervisor': 'supervisor@school.com',
      'school-admin': 'admin@school.com',
      'super-admin': 'super@school.com',
      'driver': 'driver@school.com'
    };
    const email = demoEmailMap[role];
    const password = 'password'; // Assuming a common password for demo users

    return this.loginWithCredentials(email, password);
  }

  async loginWithCredentials(email: string, password: string): Promise<boolean> {
    try {
      // Fix: Apply 'as any' type assertion to 'this.client.auth' to resolve TypeScript error.
      // This is a workaround for a type definition issue where SupabaseAuthClient is reported
      // as not having 'signInWithPassword', which it should.
      const { data, error } = await (this.client.auth as any).signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('Login error:', error.message);
        return false;
      }
      return true;
    } catch (error) {
      console.error('Unexpected login error:', error);
      return false;
    }
  }

  async logout(): Promise<void> {
    // Fix: Apply 'as any' type assertion to 'this.client.auth' to resolve TypeScript error.
    // This is a workaround for a type definition issue where SupabaseAuthClient is reported
    // as not having 'signOut', which it should.
    await (this.client.auth as any).signOut();
    this.currentUser.set(null);
    this.currentUserSchool.set(null);
  }
}