import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UploadNewVideoComponent } from './upload-new-video.component';

describe('UploadNewVideoComponent', () => {
  let component: UploadNewVideoComponent;
  let fixture: ComponentFixture<UploadNewVideoComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UploadNewVideoComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UploadNewVideoComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
