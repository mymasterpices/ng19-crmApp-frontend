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
import { AuthService } from '../../services/auth.service';
import { ToggleSwitchModule } from 'primeng/toggleswitch';
import { PopoverModule } from 'primeng/popover';
import { CardModule } from 'primeng/card';
import { MobileFooterComponent } from '../mobile-footer/mobile-footer.component';
import { Tooltip } from 'primeng/tooltip';
import { ChatWidgetComponent } from '../chat-widget/chat-widget.component';

@Component({
  selector: 'app-admin',
  imports: [
    DrawerModule,
    ButtonModule,
    AvatarModule,
    MenubarModule,
    InputTextModule,
    MenuModule,
    BadgeModule,
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    TitleCasePipe,
    CardModule,
    ReactiveFormsModule,
    ToggleSwitchModule,
    PopoverModule,
    CommonModule,
    NgClass,
    FormsModule,
    MobileFooterComponent,
    Tooltip,
    ChatWidgetComponent,
  ],
  templateUrl: './admin.component.html',
  styleUrl: './admin.component.css',
})
export class AdminComponent implements OnInit {
  @ViewChild('drawerRef') drawerRef!: Drawer;

  isDark = signal<boolean>(false);
  menuStates: Record<string, boolean> = {};
  //showchatwindow
  chatDrawer: boolean = false;

  private router = inject(Router);
  private authService = inject(AuthService); // ✅ single service

  items: MenuItem[] | undefined;
  visible: boolean = false;
  drawerNavigation: boolean = false;

  // ✅ Getters — always decoded fresh from token, never stale
  get userName(): string {
    return this.authService.getUserName();
  }

  get userRole(): string {
    return this.authService.getUserRole();
  }

  get userId(): string {
    return this.authService.getUserId();
  }

  constructor() {
    const savedTheme = localStorage.getItem('theme') === 'dark';
    this.isDark.set(savedTheme);
    effect(() => {
      const dark = this.isDark();
      document.documentElement.classList.toggle('my-app-dark', dark);
      localStorage.setItem('theme', dark ? 'dark' : 'light');
    });
  }

  ngOnInit() {
    // ✅ Nothing user-related here anymore
  }

  toggleMenu(menu: string) {
    this.menuStates[menu] = !this.menuStates[menu];
  }

  isOpen(menu: string): boolean {
    return !!this.menuStates[menu];
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
      console.error('Search form is invalid');
    }
  }
}
