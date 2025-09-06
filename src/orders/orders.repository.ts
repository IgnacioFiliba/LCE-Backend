import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orders } from './entities/order.entity';
import { OrderDetails } from './entities/order-detail.entity';
import { Users } from 'src/users/entities/user.entity';
import { Products } from 'src/products/entities/product.entity';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrderItem } from './entities/order-item.entity';

@Injectable()
export class OrdersRepository {
  constructor(
    @InjectRepository(Orders) private readonly orderRepo: Repository<Orders>,
    @InjectRepository(OrderDetails)
    private readonly detailRepo: Repository<OrderDetails>,
    @InjectRepository(Users) private readonly userRepo: Repository<Users>,
    @InjectRepository(Products)
    private readonly productRepo: Repository<Products>,
    @InjectRepository(OrderItem)
    private readonly orderItemRepo: Repository<OrderItem>,
  ) {}

  async addOrder(dto: CreateOrderDto) {
    const user = await this.userRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new Error('User not found');

    const products = await this.productRepo.findByIds(
      dto.products.map((p) => p.id),
    );

    const totalPrice = products.reduce((acc, p) => acc + Number(p.price), 0);

    products.forEach((p) => {
      if (p.stock <= 0) throw new Error(`No stock for ${p.name}`);
      p.stock--;
    });
    await this.productRepo.save(products);
    const items = products.map((p) => {
      const orderItem = this.orderItemRepo.create({
        product: p,
        quantity: 1,
        unitPrice: Number(p.price),
      });
      return orderItem;
    });
    const detail = this.detailRepo.create({ price: totalPrice, items });
    await this.detailRepo.save(detail);

    const order = this.orderRepo.create({
      user,
      date: new Date(),
      orderDetails: detail,
    });

    return this.orderRepo.save(order);
  }

  async getOrder(id: string) {
    return this.orderRepo.findOne({
      where: { id },
      relations: ['user', 'detail', 'detail.products'],
    });
  }
}
