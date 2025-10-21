import { Injectable } from '@nestjs/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
// user.service.ts
import { User } from './entities/user.entity';

@Injectable()
export class UserService {
  private users: User[] = []; // ✅ explicitly typed array

  create(dto: CreateUserDto) {
    const user: User = {
      id: (this.users.length + 1).toString(),
      name: dto.name,
      email: dto.email,
      password: dto.password,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.push(user); // ✅ works now
    return user;
  }

  findAll() {
    return this.users;
  }

  findOne(id: string) {
    return this.users.find((u) => u.id === id);
  }

  update(id: string, dto: UpdateUserDto) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;

    this.users[index] = {
      ...this.users[index],
      ...dto,
      updatedAt: new Date(),
    };
    return this.users[index];
  }

  remove(id: string) {
    const index = this.users.findIndex((u) => u.id === id);
    if (index === -1) return null;
    const deleted = this.users[index];
    this.users.splice(index, 1);
    return deleted;
  }
}
