import { ComponentFixture, TestBed } from '@angular/core/testing';

import { Viewfootfalldetail } from './viewfootfalldetail.component';

describe('Viewfootfalldetail', () => {
  let component: Viewfootfalldetail.component;
  let fixture: ComponentFixture<Viewfootfalldetail>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [Viewfootfalldetail],
    }).compileComponents();

    fixture = TestBed.createComponent(Viewfootfalldetail);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
