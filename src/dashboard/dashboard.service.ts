import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orders } from 'src/orders/entities/order.entity';
import { OrderDetails } from 'src/orders/entities/order-detail.entity';
import { Products } from 'src/products/entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';

@Injectable()
export class DashboardService {
  constructor(
    @InjectRepository(Orders)
    private ordersRepo: Repository<Orders>,

    @InjectRepository(OrderDetails)
    private detailsRepo: Repository<OrderDetails>,

    @InjectRepository(Products)
    private productsRepo: Repository<Products>,

    @InjectRepository(Category)
    private categoryRepo: Repository<Category>,
  ) {}

  async getSummary() {
    const totalSales = await this.detailsRepo
      .createQueryBuilder('details')
      .select('SUM(details.price)', 'total')
      .getRawOne();

    const totalOrders = await this.ordersRepo.count();

    const totalUnits = await this.detailsRepo
      .createQueryBuilder('details')
      .leftJoin('details.products', 'product')
      .select('COUNT(*)', 'total')
      .getRawOne();

    const bestProduct = await this.detailsRepo
      .createQueryBuilder('details')
      .leftJoin('details.products', 'product')
      .select('product.name', 'name')
      .addSelect('COUNT(*)', 'unitsSold')
      .groupBy('product.name')
      .orderBy('unitsSold', 'DESC')
      .limit(1)
      .getRawOne();

    return {
      totalSales: parseFloat(totalSales.total) || 0,
      totalOrders,
      totalUnits: parseInt(totalUnits.total) || 0,
      bestSellingProduct: bestProduct || null,
    };
  }

  async getSalesByCategory() {
    const result = await this.detailsRepo
      .createQueryBuilder('details')
      .leftJoin('details.products', 'product')
      .leftJoin('product.category', 'category')
      .select('category.name', 'category')
      .addSelect('SUM(details.price)', 'totalSales')
      .groupBy('category.name')
      .getRawMany();

    return result.map((r) => ({
      category: r.category,
      totalSales: parseFloat(r.totalSales),
    }));
  }
}
