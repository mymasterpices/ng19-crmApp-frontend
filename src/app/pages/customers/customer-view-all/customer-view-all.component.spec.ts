import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomerViewAllComponent } from './customer-view-all.component';

describe('CustomerViewAllComponent', () => {
  let component: CustomerViewAllComponent;
  let fixture: ComponentFixture<CustomerViewAllComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomerViewAllComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(CustomerViewAllComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
