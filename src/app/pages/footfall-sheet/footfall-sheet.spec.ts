import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FootfallSheet } from './footfall-sheet';

describe('FootfallSheet', () => {
  let component: FootfallSheet;
  let fixture: ComponentFixture<FootfallSheet>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FootfallSheet]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FootfallSheet);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
