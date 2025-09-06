import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { Products } from '../../products/entities/product.entity';

@Entity('CATEGORIES')
export class Category {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100, unique: true, nullable: false })
  name: string;

  @OneToMany(() => Products, (product) => product.category)
  products: Products[];
}
