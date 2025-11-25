/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { TranslationService } from '../../services/translation.service';
import { TranslatePipe } from '../../pipes/translate.pipe';

@Component({
  selector: 'app-school-dashboard',
  standalone: true,
  templateUrl: './school-dashboard.component.html',
  styleUrls: ['./school-dashboard.component.css'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [TranslatePipe]
})
export class SchoolDashboardComponent {
  readonly translationService = inject(TranslationService);
}