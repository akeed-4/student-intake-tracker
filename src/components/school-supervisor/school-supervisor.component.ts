/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, computed, inject, signal, effect } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { PickupStateService } from '../../services/pickup-state.service';
import { AuthService } from '../../services/auth.service';
import { TranslatePipe } from '../../pipes/translate.pipe';
import { PickupRequestStatus } from '../../models/app-types';
import { GoogleGenAI, Type } from '@google/genai';

const statusPriority: Record<PickupRequestStatus, number> = {
  arrived: 1,
  ready: 2,
  acknowledged: 3,
  pending: 4,
  completed: 5,
};

@Component({
  selector: 'app-school-supervisor',
  standalone: true,
  templateUrl: './school-supervisor.component.html',
  styleUrls: ['./school-supervisor.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe]
})
export class SchoolSupervisorComponent {
  readonly translationService: TranslationService = inject(TranslationService);
  private readonly pickupStateService: PickupStateService = inject(PickupStateService);
  private readonly authService: AuthService = inject(AuthService);

  private readonly ai: GoogleGenAI | null = typeof process !== 'undefined' && process.env.API_KEY ? new GoogleGenAI({ apiKey: process.env.API_KEY }) : null;
  insights = signal<string[]>([]);
  private insightGenerationInProgress = signal(false);

  readonly activeRequests = computed(() => {
    return this.pickupStateService.activeRequests()
      .slice()
      .sort((a, b) => statusPriority[a.status] - statusPriority[b.status]);
  });

  constructor() {
    effect(() => {
        // Rerun when active requests change to keep insights fresh
        this.activeRequests();
        this.generateInsights();
    }, { allowSignalWrites: true });
  }

  async acknowledgeRequest(code: string): Promise<void> {
    await this.pickupStateService.updateRequestStatus(code, 'acknowledged');
  }

  async markAsReady(code: string): Promise<void> {
      await this.pickupStateService.updateRequestStatus(code, 'ready');
  }

  private async generateInsights() {
    if (!this.ai || this.insightGenerationInProgress()) return;

    this.insightGenerationInProgress.set(true);
    this.insights.set([]); // Clear previous insights

    try {
      const school = this.authService.currentUserSchool();
      const occupiedCount = this.activeRequests().filter(r => r.assignedZone).length;
      const totalSpots = school?.pickupZones?.reduce((acc, z) => acc + z.spots, 0) ?? 0;
      const capacityPercent = totalSpots > 0 ? (occupiedCount / totalSpots) * 100 : 0;
      const waitingCount = this.activeRequests().filter(r => r.status === 'arrived' && !r.assignedZone).length;

      const prompt = `You are a school operations analyst. Here is a summary of the student pickup situation. Provide 2-3 brief, actionable insights. Insights should be in ${this.translationService.language() === 'ar' ? 'Arabic' : 'English'}.

      Data:
      - Pickup Zone Capacity: ${capacityPercent.toFixed(0)}% full (${occupiedCount} of ${totalSpots} spots occupied).
      - Active waiting cars (arrived, no spot): ${waitingCount}.
      - Yesterday's average pickup time: 12 minutes.
      - Today's average pickup time so far: 9 minutes.
      
      Example insights:
      - "Average pickup time is 3 minutes faster than yesterday. Great work!"
      - "Alert: Pickup Zones are at 90% capacity. Prepare for overflow."
      - "There are 5 parents waiting for a spot. Expedite current pickups."
      
      Analyze the current data and provide insights based *only* on the provided data.`;

      const response = await this.ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              insights: {
                type: Type.ARRAY,
                items: { type: Type.STRING }
              }
            }
          }
        }
      });
      
      const jsonText = response.text.trim();
      if (jsonText) {
        const result = JSON.parse(jsonText);
        this.insights.set(result.insights || []);
      }

    } catch (error) {
      console.error('Error generating insights:', error);
      // Don't show an error to the user, just fail gracefully.
    } finally {
      this.insightGenerationInProgress.set(false);
    }
  }
}