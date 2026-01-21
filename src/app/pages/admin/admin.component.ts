import {
  Component,
  effect,
  inject,
  OnInit,
  signal,
  ViewChild,
} from '@angular/core';
import { Drawer, DrawerModule } from 'primeng/drawer';
import { ButtonModule } from 'primeng/button';
import { AvatarModule } from 'primeng/avatar';
import { InputTextModule } from 'primeng/inputtext';
import {
  Router,
  RouterLink,
  RouterLinkActive,
  RouterOutlet,
} from '@angular/router';
import { MenuItem } from 'primeng/api';
import { MenubarModule } from 'primeng/menubar';
import { MenuModule } from 'primeng/menu';
import { BadgeModule } from 'primeng/badge';
import { CommonModule, NgClass, TitleCasePipe } from '@angular/common';

import {
  FormControl,
  FormGroup,
  FormsModule,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { LoginedUserService } from '../../services/logined-user.service';
import { AuthService } from '../../services/auth.service';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { Popover, PopoverModule } from 'primeng/popover';
import { CardModule } from 'primeng/card';
import { MobileFooterComponent } from '../mobile-footer/mobile-footer.component';

@Component({
  selector: 'app-admin',
  imports: [
    DrawerModule,
    ButtonModule,
    AvatarModule,
    MenubarModule,
    AvatarModule,
    InputTextModule,
    MenuModule,
    BadgeModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    DrawerModule,
    TitleCasePipe,
    CardModule,
    ReactiveFormsModule,
    ToggleSwitchModule,
    PopoverModule,
    CommonModule,
    NgClass,
    FormsModule,
    MobileFooterComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  @ViewChild('drawerRef') drawerRef!: Drawer;

  isDark = signal<boolean>(false);
  userRole: string = '';
  userName: string = '';

  menuStates: Record<string, boolean> = {};

  toggleMenu(menu: string) {
    this.menuStates[menu] = !this.menuStates[menu];
  }

  isOpen(menu: string): boolean {
    return !!this.menuStates[menu];
  }

  private loginedUserService = inject(LoginedUserService);
  private router = inject(Router);

  private authService = inject(AuthService);

  items: MenuItem[] | undefined;
  visible: boolean = false;
  drawerNavigation: boolean = false;

  constructor() {
    // Initialize from localStorage
    console.log('darkMode value', this.isDark());
    const savedTheme = localStorage.getItem('theme') === 'dark';
    this.isDark.set(savedTheme);
    console.log('Initial theme:', savedTheme ? 'dark' : 'light');
    // Effect: whenever isDark changes, apply theme + save
    effect(() => {
      const dark = this.isDark();
      document.documentElement.classList.toggle('my-app-dark', dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  ngOnInit() {
    this.userRole = this.loginedUserService.getUserRole();
    this.userName = this.loginedUserService.getUserName();
  }

  toggleDarkMode() {
    this.isDark.update((v) => !v);
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
    searchTerm: new FormControl('', [
      Validators.required,
      Validators.minLength(3),
    ]),
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
