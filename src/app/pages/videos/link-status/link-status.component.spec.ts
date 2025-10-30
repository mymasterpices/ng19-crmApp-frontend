import { ComponentFixture, TestBed } from '@angular/core/testing';

import { LinkStatusComponent } from './link-status.component';

describe('LinkStatusComponent', () => {
  let component: LinkStatusComponent;
  let fixture: ComponentFixture<LinkStatusComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LinkStatusComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(LinkStatusComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
