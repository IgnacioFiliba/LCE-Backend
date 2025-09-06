import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm';
import { StockEntry } from 'src/stock-entry/entities/stock-entry.entity';

@Entity({ name: 'SUPPLIERS' })
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ length: 100 })
  name: string;

  @Column({ length: 20 })
  cuit: string;

  @Column({ length: 20 })
  phone: string;

  @Column({ length: 100 })
  email: string;

  @OneToMany(() => StockEntry, (entry) => entry.supplier)
  stockEntries: StockEntry[];
}