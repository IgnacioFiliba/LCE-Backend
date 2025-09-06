import { Controller, Get, Post, Put, Body, Param } from '@nestjs/common';
import { SupplierService } from './supplier.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';

@Controller('suppliers')
export class SupplierController {
  constructor(private readonly supplierService: SupplierService) {}

  @Get()
  getAllSuppliers() {
    return this.supplierService.getAll();
  }

  @Post()
  createSupplier(@Body() dto: CreateSupplierDto) {
    return this.supplierService.create(dto);
  }

  @Put(':id')
  updateSupplier(@Param('id') id: string, @Body() dto: CreateSupplierDto) {
    return this.supplierService.update(id, dto);
  }
}
