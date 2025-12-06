import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FootfaloverviewComponent } from './footfaloverview.component';

describe('FootfaloverviewComponent', () => {
  let component: FootfaloverviewComponent;
  let fixture: ComponentFixture<FootfaloverviewComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FootfaloverviewComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FootfaloverviewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
