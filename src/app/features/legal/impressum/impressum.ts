import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

// Content here is deliberately hardcoded German, not run through
// TranslatePipe like the rest of the app - this page exists to satisfy a
// German legal requirement (§ 5 TMG) tied to German law regardless of the
// UI language the visitor has selected, the same way a real-world
// Impressum stays in German on bilingual German sites.
@Component({
  selector: 'app-impressum',
  imports: [RouterLink],
  templateUrl: './impressum.html',
  styleUrl: './impressum.scss',
})
export class Impressum {}
