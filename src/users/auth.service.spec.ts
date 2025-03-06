import { Test } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { UsersService } from './users.service';
import { User } from './user.entity';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import * as crypto from 'crypto';

describe('AuthService', () => {
  let service: AuthService;
  let fakeUsersService: Partial<UsersService>;

  beforeEach(async () => {
    const users: User[] = [];

    fakeUsersService = {
      find: jest.fn((email: string) => {
        const filteredUsers = users.filter((user) => user.email === email);
        return Promise.resolve(filteredUsers);
      }),
      create: jest.fn(async (email: string, password: string) => {
        // Simulating hashed password storage
        const salt = crypto.randomBytes(8).toString('hex');
        const hash = crypto
          .pbkdf2Sync(password, salt, 1000, 32, 'sha256')
          .toString('hex');
        const user = {
          id: Math.floor(Math.random() * 999999),
          email,
          password: `${salt}.${hash}`,
        } as User;
        users.push(user);
        return Promise.resolve(user);
      }),
    };

    const module = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: UsersService,
          useValue: fakeUsersService,
        },
      ],
    }).compile();

    service = module.get(AuthService);
  });

  it('can create an instance of auth service', async () => {
    expect(service).toBeDefined();
  });

  it('creates a new user with a salted and hashed password', async () => {
    const user = await service.signup('test@test.com', 'mypassword');
    expect(user.password).not.toEqual('mypassword');
    const [salt, hash] = user.password.split('.');
    expect(salt).toBeDefined();
    expect(hash).toBeDefined();
  });

  it('throws an error if user signs up with email that is in use', async () => {
    await service.signup('test@test.com', 'mypassword');
    await expect(service.signup('test@test.com', 'mypassword')).rejects.toThrow(
      BadRequestException,
    );
  });

  it('throws if signin is called with an unused email', async () => {
    await expect(
      service.signin('noemail@test.com', 'password'),
    ).rejects.toThrow(NotFoundException);
  });

  it('throws if an invalid password is provided', async () => {
    await service.signup('test@test.com', 'correctpassword');

    // Mock the find function to return a user with a hashed password
    (fakeUsersService.find as jest.Mock).mockResolvedValue([
      {
        email: 'test@test.com',
        password: 'randomsalt.hashthatdoesnotmatch',
      } as User,
    ]);

    await expect(
      service.signin('test@test.com', 'wrongpassword'),
    ).rejects.toThrow(BadRequestException);
  });

  it('returns a user if correct password is provided', async () => {
    // Arrange: Create a user with a known hashed password
    const email = 'test@test.com';
    const password = 'mypassword';

    const storedUser = await service.signup(email, password);

    // Mock `find()` to return the created user
    (fakeUsersService.find as jest.Mock).mockResolvedValue([storedUser]);

    // Act: Attempt to sign in with the correct credentials
    const user = await service.signin(email, password);

    // Assert: Ensure the user is returned correctly
    expect(user).toBeDefined();
    expect(user.email).toEqual(email);
  });

});
