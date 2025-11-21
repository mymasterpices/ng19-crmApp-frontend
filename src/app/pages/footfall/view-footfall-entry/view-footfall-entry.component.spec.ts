import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewFootfallEntryComponent } from './view-footfall-entry.component';

describe('ViewFootfallEntryComponent', () => {
  let component: ViewFootfallEntryComponent;
  let fixture: ComponentFixture<ViewFootfallEntryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewFootfallEntryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewFootfallEntryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
