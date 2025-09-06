// src/orders/entities/order-item.entity.ts
import { Entity, PrimaryGeneratedColumn, ManyToOne, Column } from 'typeorm';
import { Products } from 'src/products/entities/product.entity';
import { OrderDetails } from './order-detail.entity';

@Entity({ name: 'ORDER_ITEMS' })
export class OrderItem {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Products, { eager: true })
  product: Products;

  @Column('int')
  quantity: number;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  unitPrice: number;

  @ManyToOne(() => OrderDetails, (orderDetails) => orderDetails.items, {
    onDelete: 'CASCADE',
  })
  orderDetails: OrderDetails;
}
