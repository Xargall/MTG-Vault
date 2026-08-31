import { Component } from '@angular/core';

@Component({
  selector: 'app-dashboard',
  template: `
    <div class="dashboard">
      <h1>Willkommen bei MTG Vault</h1>
      <p>Deine Sammlung, Decks und Wishlist entstehen hier in den nächsten Schritten.</p>
    </div>
  `,
  styles: [
    `
      .dashboard {
        padding: var(--spacing-lg);
      }
    `,
  ],
})
export class Dashboard {}
