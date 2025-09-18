/* eslint-disable @typescript-eslint/no-unsafe-call */
import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { Products } from './entities/product.entity';
import { Category } from 'src/categories/entities/category.entity';
import { CreateProductDto } from './dto/create-product.dto';
import { FilesUploadRepository } from 'src/files-upload/files-upload.repository';
import { SearchProductDto } from './dto/search-product.dto';
import { FindProductsQuery } from './dto/find-products.query';
import data from '../seeds/products.json';

type CommentDTO = {
  id: string;
  userId?: string;
  userName?: string;
  rating?: number;
  comment?: string;
  createdAt?: Date | string;
};

type ProductResponse = {
  id: string;
  name: string;
  description?: string;
  price: number;
  imgUrl?: string;
  stock: number;
  year?: number;
  brand?: string;
  model?: string;
  engine?: string;
  averageRating?: number;
  totalReviews?: number;
  category?: { id: string; name: string } | null;
  comments?: CommentDTO[];
};

@Injectable()
export class ProductsService {
  constructor(
    @InjectRepository(Products)
    private readonly productRepository: Repository<Products>,
    @InjectRepository(Category)
    private readonly categoryRepository: Repository<Category>,
    private readonly fileUploadRepository: FilesUploadRepository,
  ) {}

  /* ----------------------------- HELPERS ----------------------------- */

  private mapToResponse(p: Products): ProductResponse {
    if (!p) return null as unknown as ProductResponse;

    const comments = Array.isArray((p as any).comments)
      ? (p as any).comments.map((c: any) => ({
          id: c?.id,
          userId: c?.user?.id ?? c?.userId,
          userName: c?.user?.name ?? c?.userName ?? 'Usuario',
          rating: Number(c?.rating ?? 0),
          comment: c?.content ?? c?.comment ?? '',
          createdAt: c?.createdAt,
        }))
      : [];

    const derivedTotal = comments.length;
    const derivedAvg =
      derivedTotal > 0
        ? Math.round(
            (comments.reduce(
              (acc: number, c: any) => acc + Number(c.rating || 0),
              0,
            ) /
              derivedTotal) *
              10,
          ) / 10
        : 0;

    const averageRating =
      typeof (p as any).averageRating === 'number'
        ? (p as any).averageRating
        : derivedAvg;

    const totalReviews =
      typeof (p as any).totalReviews === 'number'
        ? (p as any).totalReviews
        : derivedTotal;

    return {
      id: p.id,
      name: p.name,
      description: p.description,
      price: p.price,
      imgUrl: p.imgUrl,
      stock: p.stock,
      year: typeof p.year === 'number' ? p.year : Number(p.year) || undefined,
      brand: p.brand,
      model: p.model,
      engine: p.engine,
      averageRating,
      totalReviews,
      category: p.category
        ? { id: p.category.id, name: p.category.name }
        : null,
      comments,
    };
  }

  // helper para arrays desde CSV/arrays
  private ensureArray(v?: string[] | string): string[] {
    if (!v) return [];
    if (Array.isArray(v)) return v.filter(Boolean).map((s) => s.trim());
    return String(v)
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);
  }

  /* ------------------------------ CRUD ------------------------------- */

  async create(
    dto: CreateProductDto,
    file?: Express.Multer.File,
  ): Promise<Products> {
    const category = await this.categoryRepository.findOne({
      where: { id: dto.categoryId },
    });
    if (!category) throw new NotFoundException('Category not found');

    let imgUrl = '';
    if (file) {
      const uploadResponse = await this.fileUploadRepository.uploadImage(file);
      imgUrl = uploadResponse.secure_url;
    }

    const product = this.productRepository.create({
      ...dto,
      imgUrl,
      category,
    });

    return this.productRepository.save(product);
  }

  async findAll(): Promise<Products[]> {
    return this.productRepository.find({
      relations: ['category', 'comments', 'comments.user'],
    });
  }

  async findAllMapped(): Promise<ProductResponse[]> {
    const items = await this.findAll();
    return items.map((p) => this.mapToResponse(p));
  }

  async findOne(id: string): Promise<Products> {
    const product = await this.productRepository.findOne({
      where: { id },
      relations: ['category', 'comments', 'comments.user'],
    });
    if (!product) throw new NotFoundException(`Product ${id} not found`);
    return product;
  }

  async findOneMapped(id: string): Promise<ProductResponse> {
    const product = await this.findOne(id);
    return this.mapToResponse(product);
  }

  async update(id: string, dto: SearchProductDto): Promise<Products> {
    const product = await this.findOne(id);
    if (dto.categoryId) {
      const category = await this.categoryRepository.findOne({
        where: { id: dto.categoryId },
      });
      if (!category) throw new NotFoundException('Category not found');
      (product as any).category = category;
    }
    Object.assign(product, dto);
    return this.productRepository.save(product);
  }

  async remove(id: string): Promise<void> {
    const product = await this.findOne(id);
    await this.productRepository.remove(product);
  }

  async seeder() {
    const categories = await this.categoryRepository.find();

    const newProducts = data.map((element) => {
      const category = categories.find((cat) => element.category === cat.name);

      const newProduct = new Products();
      newProduct.name = element.name;
      newProduct.description = element.description;
      newProduct.price = element.price;
      newProduct.imgUrl = element.imgUrl ?? '';
      newProduct.stock = element.stock;
      newProduct.category = category!;
      newProduct.year = element.year;
      newProduct.brand = element.brand;
      newProduct.model = element.model;
      newProduct.engine = element.engine;
      return newProduct;
    });

    await this.productRepository.upsert(newProducts, ['name']);
  }

  /* ----------------------- LISTADOS / FILTROS ------------------------ */

  async findAllWithFilters(q: FindProductsQuery): Promise<{
    items: Products[];
    total: number;
    page: number;
    limit: number;
  }> {
    const {
      search,
      brands,
      models,
      engines,
      categoryId,
      inStock,
      yearMin,
      yearMax,
      priceMin,
      priceMax,
      page = 1,
      limit = 12,
    } = q;

    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoinAndSelect('p.category', 'c')
      .leftJoinAndSelect('p.comments', 'cm')
      .leftJoinAndSelect('cm.user', 'u')
      .orderBy('p.name', 'ASC');

    const term = (search ?? '').trim();
    if (term.length > 0) {
      qb.andWhere(
        `(
          p.name ILIKE :s OR
          p.brand ILIKE :s OR
          p.model ILIKE :s OR
          p.description ILIKE :s OR
          p.engine ILIKE :s OR
          c.name ILIKE :s OR
          CAST(p.year AS TEXT) ILIKE :s
        )`,
        { s: `%${term}%` },
      );
    }

    const bArr = this.ensureArray(brands);
    if (bArr.length) qb.andWhere('p.brand IN (:...brands)', { brands: bArr });

    const mArr = this.ensureArray(models);
    if (mArr.length) qb.andWhere('p.model IN (:...models)', { models: mArr });

    const eArr = this.ensureArray(engines);
    if (eArr.length)
      qb.andWhere('p.engine IN (:...engines)', { engines: eArr });

    if (categoryId) qb.andWhere('c.id = :cid', { cid: categoryId });

    if (inStock === 'true') qb.andWhere('p.stock > 0');
    if (inStock === 'false') qb.andWhere('p.stock <= 0');

    if (yearMin !== undefined)
      qb.andWhere('p.year >= :ymin', { ymin: yearMin });
    if (yearMax !== undefined)
      qb.andWhere('p.year <= :ymax', { ymax: yearMax });

    if (priceMin !== undefined)
      qb.andWhere('p.price >= :pmin', { pmin: priceMin });
    if (priceMax !== undefined)
      qb.andWhere('p.price <= :pmax', { pmax: priceMax });

    qb.skip((page - 1) * limit).take(limit);

    const [items, total] = await qb.getManyAndCount();
    return { items, total, page, limit };
  }

  /* ----------------------- OTRAS UTILIDADES -------------------------- */

  async updateProduct(
    id: string,
    productData: Partial<{
      name: string;
      description: string;
      price: number;
      stock: number;
      imgUrl: string;
    }>,
  ): Promise<Products> {
    const product = await this.productRepository.findOneBy({ id });
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    Object.assign(product, productData);
    return this.productRepository.save(product);
  }

  async findOneByName(name: string): Promise<Products> {
    const product = await this.productRepository.findOne({
      where: { name },
      relations: ['category', 'comments', 'comments.user'],
    });

    if (!product) throw new NotFoundException(`Product "${name}" not found`);
    return product;
  }

  /* ---------------- FACETS (FILTRADAS) ---------------- */

  /**
   * Devuelve facets (brands, models, engines, categories) consistentes con los filtros actuales.
   * Acepta los mismos parámetros que findAllWithFilters, pero solo selecciona columnas de facets.
   */
  async getFacets(q: Partial<FindProductsQuery> = {}) {
    const {
      search,
      brands,
      models,
      engines,
      categoryId,
      inStock,
      yearMin,
      yearMax,
      priceMin,
      priceMax,
    } = q;

    const qb = this.productRepository
      .createQueryBuilder('p')
      .leftJoin('p.category', 'c')
      .select([
        'DISTINCT p.brand AS brand',
        'p.model AS model',
        'p.engine AS engine',
        'c.id AS category_id',
        'c.name AS category_name',
      ]);

    // mismos filtros para mantener consistencia
    const term = (search ?? '').trim();
    if (term.length > 0) {
      qb.andWhere(
        `(
          p.name ILIKE :s OR
          p.brand ILIKE :s OR
          p.model ILIKE :s OR
          p.description ILIKE :s OR
          p.engine ILIKE :s OR
          c.name ILIKE :s OR
          CAST(p.year AS TEXT) ILIKE :s
        )`,
        { s: `%${term}%` },
      );
    }

    const bArr = this.ensureArray(brands);
    if (bArr.length) qb.andWhere('p.brand IN (:...brands)', { brands: bArr });

    const mArr = this.ensureArray(models);
    if (mArr.length) qb.andWhere('p.model IN (:...models)', { models: mArr });

    const eArr = this.ensureArray(engines);
    if (eArr.length)
      qb.andWhere('p.engine IN (:...engines)', { engines: eArr });

    if (categoryId) qb.andWhere('c.id = :cid', { cid: categoryId });

    if (inStock === 'true') qb.andWhere('p.stock > 0');
    if (inStock === 'false') qb.andWhere('p.stock <= 0');

    if (yearMin !== undefined)
      qb.andWhere('p.year >= :ymin', { ymin: yearMin });
    if (yearMax !== undefined)
      qb.andWhere('p.year <= :ymax', { ymax: yearMax });

    if (priceMin !== undefined)
      qb.andWhere('p.price >= :pmin', { pmin: priceMin });
    if (priceMax !== undefined)
      qb.andWhere('p.price <= :pmax', { pmax: priceMax });

    const raw = await qb.getRawMany();

    const brandsSet = new Set<string>();
    const modelsSet = new Set<string>();
    const enginesSet = new Set<string>();
    const categoriesMap = new Map<string, string>();

    raw.forEach((row) => {
      if (row.brand) brandsSet.add(row.brand);
      if (row.model) modelsSet.add(row.model);
      if (row.engine) enginesSet.add(row.engine);
      if (row.category_id && row.category_name) {
        categoriesMap.set(row.category_id, row.category_name);
      }
    });

    return {
      brands: Array.from(brandsSet).sort(),
      models: Array.from(modelsSet).sort(),
      engines: Array.from(enginesSet).sort(),
      categories: Array.from(categoriesMap, ([id, name]) => ({ id, name })),
    };
  }
}
