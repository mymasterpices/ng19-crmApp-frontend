import { Component } from '@angular/core';
import { ButtonModule } from "primeng/button";
import { CardModule } from "primeng/card";

@Component({
  selector: 'app-not-found',
  imports: [ButtonModule, CardModule],
  templateUrl: './not-found.component.html',
  styleUrl: './not-found.component.css'
})
export class NotFoundComponent {

}
