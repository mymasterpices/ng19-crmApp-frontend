import { ComponentFixture, TestBed } from '@angular/core/testing';

import { KarigarDashboardComponent } from './karigar-dashboard.component';

describe('KarigarDashboardComponent', () => {
  let component: KarigarDashboardComponent;
  let fixture: ComponentFixture<KarigarDashboardComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [KarigarDashboardComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(KarigarDashboardComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
