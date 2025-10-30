import { TestBed } from '@angular/core/testing';

import { SaveitemsService } from './saveitems.service';

describe('SaveitemsService', () => {
  let service: SaveitemsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SaveitemsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
