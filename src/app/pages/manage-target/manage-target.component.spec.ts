import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ManageTargetComponent } from './manage-target.component';

describe('ManageTargetComponent', () => {
  let component: ManageTargetComponent;
  let fixture: ComponentFixture<ManageTargetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ManageTargetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ManageTargetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
