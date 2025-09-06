import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Users } from 'src/users/entities/user.entity';
import { Products } from 'src/products/entities/product.entity';

@Entity({ name: 'FAVORITES' })
@Index(['userId'])
@Index(['productId'])
export class Favorite {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @ManyToOne(() => Users, (user) => user.favorites, {
    onDelete: 'CASCADE',
    nullable: false,
  })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => Products, { eager: true, nullable: false })
  @JoinColumn({ name: 'product_id' })
  product: Products;

  @Column('uuid', { name: 'product_id' })
  productId: string;

  @Column({ type: 'timestamptz', default: () => 'now()', name: 'created_at' })
  createdAt: Date;
}
