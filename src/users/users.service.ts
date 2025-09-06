import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Users } from './entities/user.entity';
import { UpdateUserDto } from './dto/update-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(Users)
    private readonly usersRepository: Repository<Users>,
  ) {}

  async findAll(page = 1, limit = 3, search?: string) {
    if (page < 1 || limit < 1) {
      throw new BadRequestException('Page and limit must be positive numbers');
    }

    const query = this.usersRepository.createQueryBuilder('user');

    if (search) {
      if (/^[0-9a-fA-F-]{36}$/.test(search)) {
        query.where('user.id = :id', { id: search });
      } else {
        query.where(
          'LOWER(user.name) LIKE :search OR LOWER(user.email) LIKE :search',
          {
            search: `%${search.toLowerCase()}%`,
          },
        );
      }
    }

    const [users, total] = await query
      .skip((page - 1) * limit)
      .take(limit)
      .getManyAndCount();

    return {
      total,
      page,
      limit,
      data: users,
    };
  }

  async findById(id: string) {
    if (!id) throw new BadRequestException('ID is required');

    const user = await this.usersRepository.findOne({
      where: { id },
      relations: {
        orders: {
          orderDetails: {
            items: {
              product: {
                category: true,
                orderItems: true,
                comments: true,
              },
            },
          },
        },
        favorites: {
          product: {
            category: true,
            orderItems: true,
            comments: true,
          },
        },
      },
    });

    if (!user) throw new NotFoundException('User not found');

    return user;
  }

  async update(id: string, dto: UpdateUserDto) {
    if (!id) throw new BadRequestException('ID is required');

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    Object.assign(user, dto);

    return this.usersRepository.save(user);
  }

  async delete(id: string) {
    if (!id) throw new BadRequestException('ID is required');

    const result = await this.usersRepository.delete(id);
    if (result.affected === 0) {
      throw new NotFoundException('User not found');
    }

    return { message: 'User deleted successfully' };
  }

  async toggleBan(id: string) {
    if (!id) throw new BadRequestException('ID is required');

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    user.isBanned = !user.isBanned;
    await this.usersRepository.save(user);

    return {
      message: `User ${user.isBanned ? 'banned' : 'unbanned'} successfully`,
      user,
    };
  }

  async toggleAdmin(id: string) {
    if (!id) throw new BadRequestException('ID is required');

    const user = await this.usersRepository.findOne({ where: { id } });
    if (!user) throw new NotFoundException('User not found');

    user.isAdmin = !user.isAdmin;
    await this.usersRepository.save(user);

    return {
      message: `User isAdmin set to ${user.isAdmin}`,
      user,
    };
  }

  async toggleAdminByEmail(email: string) {
    if (!email) throw new BadRequestException('Email is required');

    const user = await this.usersRepository.findOne({ where: { email } });
    if (!user) throw new NotFoundException('User not found');

    user.isAdmin = !user.isAdmin;
    user.isSuperAdmin = user.isAdmin;
    user.isVerified = user.isAdmin;
    await this.usersRepository.save(user);

    return {
      message: `User isAdmin set to ${user.isAdmin}`,
      user,
    };
  }
}
