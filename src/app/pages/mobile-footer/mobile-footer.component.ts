import { Component, inject } from '@angular/core';
import { Toolbar } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-mobile-footer',
  imports: [Toolbar, ButtonModule, RouterLink, RouterLinkActive],
  templateUrl: './mobile-footer.component.html',
  styleUrl: './mobile-footer.component.css',
})
export class MobileFooterComponent {
  private router = inject(Router);
  private authService = inject(AuthService);

  logOut() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
