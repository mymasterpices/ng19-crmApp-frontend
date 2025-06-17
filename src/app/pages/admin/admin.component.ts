import { Component, inject, OnInit, } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { ActivatedRoute, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { InputIcon } from 'primeng/inputicon';
import { IconField } from 'primeng/iconfield';
import { TitleCasePipe, Location } from '@angular/common';
import { jwtDecode } from "jwt-decode";
import { MobileFooterComponent } from '../mobile-footer/mobile-footer.component';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { LoginedUserService } from '../../services/logined-user.service';

@Component({
  selector: 'app-admin',
  imports: [
    DrawerModule,
    ButtonModule,
    AvatarModule,
    MenubarModule, AvatarModule,
    InputTextModule, MenuModule,
    BadgeModule,
    RouterOutlet,
    RouterLink,
    InputIcon,
    IconField,
    RouterLinkActive,
    DrawerModule,
    TitleCasePipe,
    MobileFooterComponent, ReactiveFormsModule
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css'
})
export class AdminComponent implements OnInit {

  userName: string = '';

  private activatedRoute = inject(ActivatedRoute);
  private loginedUserService = inject(LoginedUserService);
  private router = inject(Router);
  private location = inject(Location);

  items: MenuItem[] | undefined;
  visible: boolean = false;

  ngOnInit() {
    this.items = [
      {
        label: 'Password',
        icon: 'pi pi-lock-open',
        routerLink: 'change-password',
      },
      {
        label: 'Sign Out',
        icon: 'pi pi-sign-out',
        command: () => {
          this.logOut();
        }
      }
    ];

    const token = sessionStorage.getItem('RkJewellersUser');
    if (token) {
      const decodedToken: any = jwtDecode(token);
      this.userName = decodedToken?.name || decodedToken?.username || 'Guest';
    }

    // Load username on component initialization
    this.userName = this.loginedUserService.getLoginedUser();
  }

  closeDrawer() {
    this.visible = false;
  }


  logOut() {
    const user = sessionStorage.getItem('RkJewellersUser');
    if (user) {
      sessionStorage.removeItem('RkJewellersUser');
      this.router.navigate(['/login']);
    }
  }

  goBack() {
    this.location.back();
  }

  searchForm = new FormGroup({
    searchTerm: new FormControl('', [Validators.required, Validators.minLength(3)])
  });

  searchCustomer() {
    if (this.searchForm.valid) {
      const searchTerm = this.searchForm.value.searchTerm;
      this.router.navigate(['search', searchTerm]);
      this.searchForm.reset();
    } else {
      // Handle invalid form case, e.g., show an error message
      console.error('Search form is invalid');
    }
  }

}
