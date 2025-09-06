import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';

export interface User {
  id: number;
  email: string;
  name: string;
  password: string;
  address: string;
  phone: string;
  country?: string;
  city?: string;
}

@Injectable()
export class UsersRepository {
  users: User[] = [
    {
      id: 1,
      email: 'juan@mail.com',
      name: 'Juan Pérez',
      password: '1234',
      address: 'Calle Falsa 123',
      phone: '123456789',
      country: 'Argentina',
      city: 'Córdoba',
    },
    {
      id: 2,
      email: 'ana@mail.com',
      name: 'Ana García',
      password: '5678',
      address: 'Av. Siempreviva 742',
      phone: '987654321',
    },
  ];

  findAll() {
    return this.users;
  }

  findById(id: number) {
    return this.users.find((element) => element.id === id);
  }

  save(user: CreateUserDto) {
    const newUser = {
      id: this.users[this.users.length - 1]?.id + 1 || 1,
      ...user,
    };
    this.users.push(newUser);
    return newUser;
  }

  delete(id: number) {
    this.users = this.users.filter((element) => element.id !== id);
    return this.users;
  }

  update(id: number, user: Partial<User>) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return 'No hay tal';
    this.users[index] = { ...this.users[index], ...user };
    return this.users[index];
  }
}
