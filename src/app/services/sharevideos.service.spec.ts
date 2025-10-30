import { TestBed } from '@angular/core/testing';

import { SharevideosService } from './sharevideos.service';

describe('SharevideosService', () => {
  let service: SharevideosService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SharevideosService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
