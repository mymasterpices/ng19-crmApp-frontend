import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SoldEntryComponent } from './sold-entry.component';

describe('SoldEntryComponent', () => {
  let component: SoldEntryComponent;
  let fixture: ComponentFixture<SoldEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SoldEntryComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(SoldEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
