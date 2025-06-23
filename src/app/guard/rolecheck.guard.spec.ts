import { TestBed } from '@angular/core/testing';
import { CanActivateFn } from '@angular/router';

import { rolecheckGuard } from './rolecheck.guard';

describe('rolecheckGuard', () => {
  const executeGuard: CanActivateFn = (...guardParameters) => 
      TestBed.runInInjectionContext(() => rolecheckGuard(...guardParameters));

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  it('should be created', () => {
    expect(executeGuard).toBeTruthy();
  });
});
