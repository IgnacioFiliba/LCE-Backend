import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Products } from 'src/products/entities/product.entity';
import { Repository } from 'typeorm';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';

@Injectable()
export class StockEntryService {
  constructor(
    @InjectRepository(Products)
    private readonly productRepo: Repository<Products>,
  ) {}

  async addStock(dto: CreateStockEntryDto) {
    const product = await this.productRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    product.stock += dto.quantity;
    return this.productRepo.save(product);
  }

  async updateStock(productId: string, dto: CreateStockEntryDto) {
    const product = await this.productRepo.findOne({
      where: { id: productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    product.stock = dto.quantity;
    return this.productRepo.save(product);
  }
}
