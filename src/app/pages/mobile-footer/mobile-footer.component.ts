import { Component, inject } from '@angular/core';
import { Toolbar } from 'primeng/toolbar';
import { ButtonModule } from 'primeng/button';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';



@Component({
  selector: 'app-mobile-footer',
  imports: [
    Toolbar,
    ButtonModule, RouterLink, RouterLinkActive
  ],
  templateUrl: './mobile-footer.component.html',
  styleUrl: './mobile-footer.component.css'
})
export class MobileFooterComponent {


  private router = inject(Router);

  ngOnInit() {

  }

  logOut() {
    const token = sessionStorage.getItem('RkJewellersUser');
    if (token) {
      sessionStorage.removeItem('RkJewellersUser');
      this.router.navigate(['/login']);
      return;
    }
    // Implement logout logic here
    console.log('User logged out');
  }

}
