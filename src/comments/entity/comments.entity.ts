import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Users } from 'src/users/entities/user.entity';
import { Products } from 'src/products/entities/product.entity';

@Entity('COMMENTS')
export class Comment {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'text' })
  content: string;

  @Column({ type: 'int', width: 1 })
  rating: number;

  @ManyToOne(() => Users, (user) => user.comments, { onDelete: 'CASCADE' })
  user: Users;

  @ManyToOne(() => Products, (product) => product.comments, {
    onDelete: 'CASCADE',
  })
  product: Products;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
