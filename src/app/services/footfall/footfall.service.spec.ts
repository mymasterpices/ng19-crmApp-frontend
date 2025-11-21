import { TestBed } from '@angular/core/testing';

import { FootfallService } from './footfall.service';

describe('FootfallService', () => {
  let service: FootfallService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(FootfallService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
