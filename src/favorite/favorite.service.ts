import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Favorite } from './entity/favorite.entity';
import { Repository } from 'typeorm';

@Injectable()
export class FavoritesService {
  getAll() {
    throw new Error('Method not implemented.');
  }
  constructor(
    @InjectRepository(Favorite)
    private readonly favoriteRepo: Repository<Favorite>,
  ) {}

  async addFavorite(userId: string, productId: string): Promise<Favorite> {
    const exists = await this.favoriteRepo.findOne({
      where: { userId, productId },
    });
    if (exists) return exists;

    const fav = this.favoriteRepo.create({ userId, productId });
    return this.favoriteRepo.save(fav);
  }

  async removeFavorite(userId: string, productId: string): Promise<void> {
    await this.favoriteRepo.delete({ userId, productId });
  }

  async getFavorites(userId: string): Promise<Favorite[]> {
    return this.favoriteRepo.find({
      where: { userId },
      relations: ['product'],
    });
  }
}
