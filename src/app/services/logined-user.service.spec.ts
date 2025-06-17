import { TestBed } from '@angular/core/testing';

import { LoginedUserService } from './logined-user.service';

describe('LoginedUserService', () => {
  let service: LoginedUserService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(LoginedUserService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
