import { Users } from 'src/users/entities/user.entity';
import { CartItem } from './cart-item.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  Index,
  ManyToOne,
  JoinColumn,
} from 'typeorm';

@Entity({ name: 'CARTS' })
@Index(['userId'])
export class Cart {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid', { name: 'user_id' })
  userId: string;

  @ManyToOne(() => Users, (user) => user.carts, { eager: false })
  @JoinColumn({ name: 'user_id' })
  user: Users;

  @OneToMany(() => CartItem, (i) => i.cart, { cascade: true })
  items: CartItem[];

  @Column({ type: 'timestamptz', default: () => 'now()' })
  updatedAt: Date;

  @Column({ default: 'on cart' })
  status: string;

  @Column({ name: 'mp_preference_id', nullable: true })
  mpPreferenceId?: string;

  @Column({ name: 'mp_payment_id', nullable: true })
  mpPaymentId?: string;
}
