import { Component, inject, OnInit, signal, } from '@angular/core';
import { DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import { Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
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
import { AuthService } from '../../services/auth.service';

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
  isDark = signal<boolean>(false);
  userName: string = '';

  private loginedUserService = inject(LoginedUserService);
  private router = inject(Router);

  private authService = inject(AuthService);

  items: MenuItem[] | undefined;
  visible: boolean = false;

  ngOnInit() {
    const savedTheme = localStorage.getItem('theme') === 'dark';
    this.isDark.set(savedTheme);
    this.applyTheme(savedTheme);
    this.setMenuItems();

    // Load username on component initialization
    this.userName = this.loginedUserService.getLoginedUser();
  }

  toggleDarkMode() {
    const newValue = !this.isDark();
    this.isDark.set(newValue);
    localStorage.setItem('theme', newValue ? 'dark' : 'light');
    this.applyTheme(newValue);
    this.setMenuItems(); // Update menu label/icon
  }
  applyTheme(isDark: boolean) {
    document.documentElement.classList.toggle('my-app-dark', isDark);
  }

  setMenuItems() {
    this.items = [
      {
        label: this.isDark() ? 'Light' : 'Dark',
        icon: this.isDark() ? 'pi pi-sun' : 'pi pi-moon',
        command: () => this.toggleDarkMode()
      },
      {
        label: 'Password',
        icon: 'pi pi-lock-open',
        routerLink: 'change-password',
      },
      {
        label: 'Sign Out',
        icon: 'pi pi-sign-out',
        command: () => this.logOut(),
      }
    ];
  }

  closeDrawer() {
    this.visible = false;
  }

  logOut() {
    this.authService.logout();
  }

  goBack() {
    this.authService.goBack();
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
