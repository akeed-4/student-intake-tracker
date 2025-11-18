/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { Injectable, signal, WritableSignal, effect, inject, Injector, runInInjectionContext } from '@angular/core';
import { Status, AuthorizedPerson, VerifiedPickup } from './types';
import { environment } from './environments/environment';
import { GoogleGenAI } from '@google/genai';

// The shape of the state object to be persisted.
interface AppState {
  status: Status;
  pickupCode: string | null;
  studentName: string;
  studentClass: string;
  eta: number;
  geminiMessage: string | null;
  carColor: string;
  carPlate: string;
  notes: string;
  pickupRequestAuthorizedPerson: AuthorizedPerson | null;
  verifiedPickup: VerifiedPickup | null;
}

@Injectable({
  providedIn: 'root'
})
export class PickupStateService {
  // Shared State Signals
  status = signal<Status>('idle');
  pickupCode = signal<string | null>(null);
  error = signal<string | null>(null);
  studentName: WritableSignal<string> = signal('');
  studentClass: WritableSignal<string> = signal('');
  eta = signal<number>(5);
  geminiMessage = signal<string | null>(null);
  carColor = signal<string>('');
  carPlate = signal<string>('');
  notes = signal<string>('');
  pickupRequestAuthorizedPerson = signal<AuthorizedPerson | null>(null);
  verifiedPickup = signal<VerifiedPickup | null>(null);

  private readonly ai: GoogleGenAI | null = null;
  private readonly storageKey = 'pickupAppState';
  private readonly injector = inject(Injector);

  constructor() {
    if (environment.apiKey) {
      this.ai = new GoogleGenAI({apiKey: environment.apiKey});
    } else {
      console.error('API Key not found. Please set it in src/environments/environment.ts');
    }

    this.loadStateFromLocalStorage();

    // Persist state changes to localStorage
    runInInjectionContext(this.injector, () => {
        effect(() => {
            const state: AppState = {
              status: this.status(),
              pickupCode: this.pickupCode(),
              studentName: this.studentName(),
              studentClass: this.studentClass(),
              eta: this.eta(),
              geminiMessage: this.geminiMessage(),
              carColor: this.carColor(),
              carPlate: this.carPlate(),
              notes: this.notes(),
              pickupRequestAuthorizedPerson: this.pickupRequestAuthorizedPerson(),
              verifiedPickup: this.verifiedPickup(),
            };
            localStorage.setItem(this.storageKey, JSON.stringify(state));
        });
    });
  }

  private loadStateFromLocalStorage(): void {
    const savedState = localStorage.getItem(this.storageKey);
    if (savedState) {
        try {
            const state: AppState = JSON.parse(savedState);
            this.status.set(state.status);
            this.pickupCode.set(state.pickupCode);
            this.studentName.set(state.studentName);
            this.studentClass.set(state.studentClass);
            this.eta.set(state.eta);
            this.geminiMessage.set(state.geminiMessage);
            this.carColor.set(state.carColor);
            this.carPlate.set(state.carPlate);
            this.notes.set(state.notes);
            this.pickupRequestAuthorizedPerson.set(state.pickupRequestAuthorizedPerson);
            this.verifiedPickup.set(state.verifiedPickup);
        } catch (e) {
            console.error('Failed to parse state from localStorage', e);
            localStorage.removeItem(this.storageKey);
        }
    }
  }

  async notifySchool(selectedPerson: AuthorizedPerson): Promise<void> {
    if (!this.studentName() || !this.studentClass() || !selectedPerson) {
      this.error.set('يرجى ملء جميع الحقول الإلزامية واختيار المستلم.');
      return;
    }
    if (!this.ai) {
        this.error.set('مفتاح API غير مُعد. يرجى تعيين متغير البيئة API_KEY.');
        return;
    }

    this.status.set('notifying');
    this.error.set(null);
    this.pickupRequestAuthorizedPerson.set(selectedPerson);

    try {
      const code = Math.floor(1000 + Math.random() * 9000).toString();
      this.pickupCode.set(code);
      
      const prompt = `
        تم استلام إشعار استلام للطالب/ة: ${this.studentName()} من فصل ${this.studentClass()}.
        معلومات الوصول:
        - الوقت التقديري للوصول: ${this.eta()} دقائق.
        - المستلم: ${selectedPerson.name} (صلة القرابة: ${selectedPerson.relation}, رقم الهوية: ${selectedPerson.idNumber}).
        - لون السيارة: ${this.carColor() || 'لم يحدد'}.
        - رقم اللوحة: ${this.carPlate() || 'لم يحدد'}.
        - رمز الاستلام السري: ${code}.
        - ملاحظات إضافية: ${this.notes() || 'لا يوجد'}.
        بصفتك مساعدًا إداريًا في المدرسة، قم بإنشاء رسالة قصيرة ومطمئنة لولي الأمر. أكد استلام جميع التفاصيل المذكورة أعلاه. أبلغه بأنه تم إخطار المعلم وأن الطالب/ة ${this.studentName()} سيكون/ستكون جاهزًا/ة عند البوابة الرئيسية في الوقت المحدد. ذكره برمز الاستلام ${code} الذي يجب إظهاره للحارس. اجعل الرسالة احترافية وواضحة.
      `;

      const response = await this.ai.models.generateContent({ model: 'gemini-2.5-flash', contents: prompt });
      this.geminiMessage.set(response.text);
      this.status.set('notified');
    } catch (e) {
      console.error(e);
      this.error.set('حدث خطأ أثناء إبلاغ المدرسة. يرجى المحاولة مرة أخرى.');
      this.status.set('idle');
    }
  }

  alertTeacher(): void {
    if (this.status() === 'notified') this.status.set('teacher_alerted');
  }

  markAsReady(): void {
    if (this.status() === 'teacher_alerted') this.status.set('ready');
  }

  verifyCode(inputCode: string): boolean {
    if (inputCode === this.pickupCode() && this.pickupRequestAuthorizedPerson()) {
      this.verifiedPickup.set({
        studentName: this.studentName(),
        studentClass: this.studentClass(),
        authorizedPerson: this.pickupRequestAuthorizedPerson()!,
      });
      return true;
    } else {
      this.verifiedPickup.set(null);
      return false;
    }
  }

  confirmPickup(): void {
    this.status.set('picked_up');
  }

  resetPickupState(): void {
    this.studentName.set('');
    this.studentClass.set('');
    this.eta.set(5);
    this.pickupCode.set(null);
    this.status.set('idle');
    this.geminiMessage.set(null);
    this.error.set(null);
    this.pickupRequestAuthorizedPerson.set(null);
    this.carColor.set('');
    this.carPlate.set('');
    this.notes.set('');
    this.verifiedPickup.set(null);
    localStorage.removeItem(this.storageKey);
  }
}