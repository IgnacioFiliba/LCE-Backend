import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { FilesUploadController } from './files-upload.controller';
import { FilesUploadService } from './files-upload.service';
import { FilesUploadRepository } from './files-upload.repository';
import { Products } from 'src/products/entities/product.entity';
import { cloudinaryConfig } from 'config/cloudinary';

@Module({
  imports: [TypeOrmModule.forFeature([Products])],
  controllers: [FilesUploadController],
  providers: [FilesUploadService, FilesUploadRepository, cloudinaryConfig],
  exports: [FilesUploadService, FilesUploadRepository],
})
export class FilesUploadModule {}
