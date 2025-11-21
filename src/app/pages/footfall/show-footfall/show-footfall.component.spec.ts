import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ShowFootfallComponent } from './show-footfall.component';

describe('ShowFootfallComponent', () => {
  let component: ShowFootfallComponent;
  let fixture: ComponentFixture<ShowFootfallComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ShowFootfallComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ShowFootfallComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
