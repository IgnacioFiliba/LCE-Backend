import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Products } from './entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { FilesUploadModule } from 'src/files-upload/files-upload.module';

@Module({
  imports: [TypeOrmModule.forFeature([Products, Category]), FilesUploadModule],
  controllers: [ProductsController],
  providers: [ProductsService],
})
export class ProductsModule {}
