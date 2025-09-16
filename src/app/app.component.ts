import { Component, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MessageService } from 'primeng/api';
import { Toast } from 'primeng/toast';
import { LoaderService } from './services/loader.service';
import { ProgressBar } from 'primeng/progressbar';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Toast, ProgressBar],
  providers: [MessageService],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  loader = inject(LoaderService);
  title = 'app';
}
