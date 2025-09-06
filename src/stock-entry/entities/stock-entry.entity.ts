import { Products } from 'src/products/entities/product.entity';
import { Supplier } from 'src/supplier/entities/supplier.entity';
import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'STOCK_ENTRIES' })
export class StockEntry {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'int' })
  quantity: number;

  @Column()
  date: Date;

  @ManyToOne(() => Products, (product) => product.stock)
  product: Products;

  @ManyToOne(() => Supplier, (supplier) => supplier.stockEntries)
  supplier: Supplier;
}
