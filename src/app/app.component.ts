import { Component, inject, OnInit } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { LoaderService } from './services/loader.service';
import { ProgressBar } from 'primeng/progressbar';
import { ConfirmDialog } from 'primeng/confirmdialog';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ProgressBar, ConfirmDialog],
  providers: [ConfirmationService, MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
  loader = inject(LoaderService);
  title = 'app';

  ngOnInit(): void {
    //check local storage for user theme
    const savedTheme = localStorage.getItem('theme') === 'dark';
    this.applyTheme(savedTheme);
  }

  applyTheme(isDark: boolean) {
    document.documentElement.classList.toggle('my-app-dark', isDark);
  }
}
