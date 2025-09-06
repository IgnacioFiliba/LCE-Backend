import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Supplier } from './entities/supplier.entity';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';

@Injectable()
export class SupplierService {
  constructor(
    @InjectRepository(Supplier)
    private supplierRepository: Repository<Supplier>
  ) {}

  create(dto: CreateSupplierDto) {
    const supplier = this.supplierRepository.create(dto);
    return this.supplierRepository.save(supplier);
  }

  findAll() {
    return this.supplierRepository.find();
  }

  findOne(id: string) {
    return this.supplierRepository.findOneByOrFail({ id });
  }

  async update(id: string, dto: UpdateSupplierDto) {
    await this.findOne(id);
    await this.supplierRepository.update(id, dto);
    return this.findOne(id);
  }

  async remove(id: string) {
    const supplier = await this.findOne(id);
    return this.supplierRepository.remove(supplier);
  }
}
