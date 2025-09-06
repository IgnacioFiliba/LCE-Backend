import { IsInt, Min } from 'class-validator';

export class UpdateStockEntryDto {
  @IsInt()
  @Min(0)
  quantity: number;
}
