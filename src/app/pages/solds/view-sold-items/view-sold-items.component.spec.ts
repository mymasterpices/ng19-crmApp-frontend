import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewSoldItemsComponent } from './view-sold-items.component';

describe('ViewSoldItemsComponent', () => {
  let component: ViewSoldItemsComponent;
  let fixture: ComponentFixture<ViewSoldItemsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewSoldItemsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewSoldItemsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
