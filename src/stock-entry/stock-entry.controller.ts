import { Controller, Post, Put, Body, Param } from '@nestjs/common';
import { StockEntryService } from './stock-entry.service';
import { CreateStockEntryDto } from './dto/create-stock-entry.dto';

@Controller('stock')
export class StockEntryController {
  constructor(private readonly stockEntryService: StockEntryService) {}

  @Post()
  addStock(@Body() dto: CreateStockEntryDto) {
    return this.stockEntryService.addStock(dto);
  }

  @Put(':productId')
  updateStock(
    @Param('productId') productId: string,
    @Body() dto: CreateStockEntryDto,
  ) {
    return this.stockEntryService.updateStock(productId, dto);
  }
}
