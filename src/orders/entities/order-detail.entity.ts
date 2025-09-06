// src/orders/entities/order-detail.entity.ts
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  OneToMany,
} from 'typeorm';
import { Orders } from './order.entity';
import { OrderItem } from './order-item.entity';

@Entity({ name: 'ORDER_DETAILS' })
export class OrderDetails {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'decimal', precision: 10, scale: 2 })
  price: number;

  @ManyToOne(() => Orders, (order) => order.orderDetails, {
    onDelete: 'CASCADE',
  })
  order: Orders;

  @OneToMany(() => OrderItem, (item) => item.orderDetails, { cascade: true })
  items: OrderItem[];
}
