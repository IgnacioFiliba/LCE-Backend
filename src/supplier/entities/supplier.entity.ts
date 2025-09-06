import { StockEntry } from '../../stock-entry/entities/stock-entry.entity';
import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ name: 'SUPPLIERS' })
export class Supplier {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  name: string;

  @Column()
  cuit: string;

  @Column()
  phone: string;

  @Column()
  mail: string;

  @OneToMany(() => StockEntry, (entry) => entry.supplier)
  stockEntries: StockEntry[];
}
