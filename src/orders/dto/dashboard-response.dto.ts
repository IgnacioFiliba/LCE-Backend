import { ApiProperty } from '@nestjs/swagger';

export class SalesByDateDto {
  @ApiProperty({ example: '2025-08-01' })
  date: string;

  @ApiProperty({ example: 3 })
  quantity: number;
}

export class ProductSalesDto {
  @ApiProperty({ example: 'a10a1c22-5f64-42c8-9fa0-4a865fbd2322' })
  productId: string;

  @ApiProperty({ example: 'Notebook Lenovo' })
  productName: string;

  @ApiProperty({ example: 5 })
  totalQuantity: number;

  @ApiProperty({ example: 4999.95 })
  totalRevenue: number;

  @ApiProperty({ type: [SalesByDateDto] })
  salesByDate: SalesByDateDto[];
}

export class SalesSummaryDto {
  @ApiProperty({ example: 15 })
  totalOrders: number;

  @ApiProperty({ example: 13499.9 })
  totalRevenue: number;

  @ApiProperty({ example: 27 })
  totalProductsSold: number;
}

export class DashboardResponseDto {
  @ApiProperty({ type: [ProductSalesDto] })
  sales: ProductSalesDto[];

  @ApiProperty({ type: SalesSummaryDto })
  summary: SalesSummaryDto;
}
