import { TestBed } from '@angular/core/testing';

import { ShareOrderService } from './share-order.service';

describe('ShareOrderService', () => {
  let service: ShareOrderService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ShareOrderService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
