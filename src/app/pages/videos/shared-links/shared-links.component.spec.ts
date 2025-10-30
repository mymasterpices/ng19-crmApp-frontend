import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SharedLinksComponent } from './shared-links.component';

describe('SharedLinksComponent', () => {
  let component: SharedLinksComponent;
  let fixture: ComponentFixture<SharedLinksComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SharedLinksComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SharedLinksComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
