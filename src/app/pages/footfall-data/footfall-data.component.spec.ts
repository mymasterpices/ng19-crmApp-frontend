import { ComponentFixture, TestBed } from '@angular/core/testing';

import { FootfallData } from './footfall-data';

describe('FootfallData', () => {
  let component: FootfallData;
  let fixture: ComponentFixture<FootfallData>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FootfallData]
    })
    .compileComponents();

    fixture = TestBed.createComponent(FootfallData);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
