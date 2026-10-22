import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { TranslatePipe, TranslateService } from '@ngx-translate/core';

import { ToastService } from '../../core/services/toast.service';
import { HELP_CATEGORIES, HELP_TERMS, HelpCategory, HelpLang, HelpTerm } from './help-terms';

const TROTTEL_STORAGE_KEY = 'tcgvault.help.trottelMode';

function readStoredTrottelMode(): boolean {
  try {
    return localStorage.getItem(TROTTEL_STORAGE_KEY) === 'true';
  } catch {
    // Storage blocked (private mode etc.) - fall back to normal mode.
    return false;
  }
}

@Component({
  changeDetection: ChangeDetectionStrategy.OnPush,
  selector: 'app-help',
  imports: [TranslatePipe],
  templateUrl: './help.html',
  styleUrl: './help.scss',
})
export class Help {
  private readonly toast = inject(ToastService);
  protected readonly translate = inject(TranslateService);

  protected readonly categories = HELP_CATEGORIES;
  protected readonly searchQuery = signal('');
  protected readonly selectedCategory = signal<HelpCategory | null>(null);
  protected readonly trottelMode = signal(readStoredTrottelMode());

  protected readonly lang = computed<HelpLang>(() => (this.translate.currentLang() === 'en' ? 'en' : 'de'));

  protected readonly filteredTerms = computed(() => {
    const query = this.searchQuery().trim().toLowerCase();
    const category = this.selectedCategory();
    const lang = this.lang();
    return HELP_TERMS.filter((term) => {
      if (category && term.category !== category) return false;
      if (!query) return true;
      return (
        term.term[lang].toLowerCase().includes(query) ||
        term.definitionNormal[lang].toLowerCase().includes(query) ||
        term.definitionTrottel[lang].toLowerCase().includes(query)
      );
    });
  });

  protected readonly termsByCategory = computed(() => {
    const map = new Map<HelpCategory, HelpTerm[]>();
    for (const term of this.filteredTerms()) {
      const list = map.get(term.category) ?? [];
      list.push(term);
      map.set(term.category, list);
    }
    return map;
  });

  protected setMode(trottel: boolean) {
    this.trottelMode.set(trottel);
    try {
      localStorage.setItem(TROTTEL_STORAGE_KEY, String(trottel));
    } catch {
      // Storage blocked - mode just won't persist across reloads.
    }
    if (trottel) {
      this.toast.show(this.translate.instant('help.modeTrottelToast'), 'success');
    }
  }

  protected termText(term: HelpTerm): string {
    return term.term[this.lang()];
  }

  protected definitionFor(term: HelpTerm): string {
    return (this.trottelMode() ? term.definitionTrottel : term.definitionNormal)[this.lang()];
  }

  protected stepsFor(term: HelpTerm): string[] {
    const lang = this.lang();
    return term.steps?.map((step) => step[lang]) ?? [];
  }

  protected relatedTermsFor(term: HelpTerm): HelpTerm[] {
    if (!term.relatedTerms?.length) return [];
    return term.relatedTerms
      .map((id) => HELP_TERMS.find((candidate) => candidate.id === id))
      .filter((candidate): candidate is HelpTerm => !!candidate);
  }

  protected jumpToTerm(id: string) {
    this.selectedCategory.set(null);
    this.searchQuery.set('');
    // The target card may not exist yet this tick if a filter was just
    // cleared - wait for the next one so its DOM node is actually there.
    queueMicrotask(() => {
      document.getElementById(`help-term-${id}`)?.scrollIntoView({ block: 'center' });
    });
  }
}
