import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateCommentDto } from './dto/create-comment.dto';
import { Products } from 'src/products/entities/product.entity';
import { Users } from 'src/users/entities/user.entity';
import { Comment } from './entity/comments.entity';

@Injectable()
export class CommentsService {
  constructor(
    @InjectRepository(Comment) private commentsRepo: Repository<Comment>,
    @InjectRepository(Products) private productsRepo: Repository<Products>,
    @InjectRepository(Users) private usersRepo: Repository<Users>,
  ) {}

  async create(dto: CreateCommentDto): Promise<Comment> {
    const product = await this.productsRepo.findOne({
      where: { id: dto.productId },
    });
    if (!product) throw new NotFoundException('Producto no encontrado');

    const user = await this.usersRepo.findOne({ where: { id: dto.userId } });
    if (!user) throw new NotFoundException('Usuario no encontrado');

    const comment = this.commentsRepo.create({
      content: dto.content,
      rating: dto.rating,
      product,
      user,
    });

    const existingComment = await this.commentsRepo.findOne({
      where: { user: { id: user.id }, product: { id: product.id } },
    });

    if (existingComment) {
      throw new BadRequestException(
        'Ya dejaste un comentario en este producto',
      );
    }

    const savedComment = await this.commentsRepo.save(comment);

    const { avg, count } = await this.commentsRepo
      .createQueryBuilder('comment')
      .select('AVG(comment.rating)', 'avg')
      .addSelect('COUNT(comment.id)', 'count')
      .where('comment.productId = :productId', { productId: product.id })
      .getRawOne();

    product.averageRating = parseFloat(avg).toFixed
      ? (parseFloat(avg).toFixed(2) as unknown as number)
      : 0;
    product.totalReviews = parseInt(count, 10);

    await this.productsRepo.save(product);

    return savedComment;
  }

  async findByProduct(productId: string): Promise<Comment[]> {
    return this.commentsRepo.find({
      where: { product: { id: productId } },
      relations: ['user'],
      order: { createdAt: 'DESC' },
    });
  }
}
