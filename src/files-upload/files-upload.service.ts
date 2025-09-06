import {
  Injectable,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';

import { Products } from 'src/products/entities/product.entity';
import { FilesUploadRepository } from './files-upload.repository';

@Injectable()
export class FilesUploadService {
  constructor(
    private readonly filesUploadRepository: FilesUploadRepository,
    @InjectRepository(Products)
    private readonly productsRepository: Repository<Products>,
  ) {}

  /**
   * Mantiene compatibilidad con el controlador que llama uploadProductImage(productId, image)
   */
  async uploadProductImage(
    productId: string,
    image: Express.Multer.File,
  ): Promise<Products> {
    return this.uploadImage(image, productId);
  }

  /**
   * Método interno genérico: sube imagen y actualiza imgUrl del producto
   */
  async uploadImage(
    file: Express.Multer.File,
    productId: string,
  ): Promise<Products> {
    if (!productId) {
      throw new BadRequestException('Product ID is required');
    }
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const product = await this.productsRepository.findOne({
      where: { id: productId },
    });
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let uploadResponse: UploadApiResponse;
    try {
      uploadResponse = await this.filesUploadRepository.uploadImage(file);
    } catch (error) {
      console.error('Upload service error:', error); // 👈
      throw new InternalServerErrorException('Error uploading image');
    }

    product.imgUrl = uploadResponse.secure_url;
    await this.productsRepository.save(product);
    return product;
  }
}
