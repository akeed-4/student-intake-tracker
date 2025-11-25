/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import { inject, Pipe, PipeTransform } from '@angular/core';
import { TranslationService } from '../services/translation.service';

@Pipe({
  name: 'translate',
  standalone: true,
})
export class TranslatePipe implements PipeTransform {
  // Fix: Explicitly type injected service to resolve 'unknown' property errors.
  private readonly translationService: TranslationService = inject(TranslationService);

  transform(key: string, replacements: Record<string, string> = {}): string {
    return this.translationService.translate(key, replacements);
  }
}