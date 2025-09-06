import { Transform } from 'class-transformer';
import {
  IsBooleanString,
  IsInt,
  IsOptional,
  IsString,
  IsUUID,
  Min,
} from 'class-validator';

export class FindProductsQuery {
  @IsOptional()
  @IsString()
  search?: string;

  // ?brands=Bosch,Brembo  |  ?brands[]=Bosch&brands[]=Brembo
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : String(value)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
  )
  brands?: string[];

  // ?models=Onix,Corolla  |  ?models[]=Onix&models[]=Corolla
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : String(value)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
  )
  models?: string[];

  // ?engines=1.6,2.0 Turbo  |  ?engines[]=1.6&engines[]=2.0%20Turbo
  @IsOptional()
  @Transform(({ value }) =>
    Array.isArray(value)
      ? value
      : String(value)
          .split(',')
          .map((v) => v.trim())
          .filter(Boolean),
  )
  engines?: string[];

  // UUID de categoría (opcional). **OJO**: NO usar ParseUUIDPipe en query,
  // acá con IsUUID ya alcanza.
  @IsOptional()
  @IsUUID()
  categoryId?: string;

  @IsOptional()
  @IsBooleanString()
  inStock?: string; // 'true' | 'false'

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  yearMin?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  yearMax?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  priceMin?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value))
  @IsInt()
  priceMax?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 1))
  @IsInt()
  @Min(1)
  page?: number;

  @IsOptional()
  @Transform(({ value }) => Number(value ?? 12))
  @IsInt()
  @Min(1)
  limit?: number;
}
