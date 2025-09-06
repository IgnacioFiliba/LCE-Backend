import { Injectable } from '@nestjs/common';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  imgUrl: string;
}

@Injectable()
export class ProductsRepository {
  private products: Product[] = [
    {
      id: 1,
      name: 'Notebook Lenovo',
      description: 'Intel i5, 8GB RAM, 256GB SSD',
      price: 1200,
      stock: 1,
      imgUrl: 'https://example.com/img1.jpg',
    },
    {
      id: 2,
      name: 'Mouse Logitech',
      description: 'Inalámbrico, ergonómico',
      price: 35,
      stock: 1,
      imgUrl: 'https://example.com/img2.jpg',
    },
  ];

  findAll() {
    return this.products;
  }

  findById(id: number) {
    return this.products.find((p) => p.id === id);
  }

  /*save(product: CreateProductDto) {
    const newProduct: Product = {
      id:
        this.products.length > 0
          ? this.products[this.products.length - 1].id + 1
          : 1,
      ...product,
    };
    this.products.push(newProduct);
    return newProduct;
  }*/

  delete(id: number) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index !== -1) {
      const removed = this.products.splice(index, 1);
      return removed[0];
    }
    return null;
  }

  update(id: number, product: Partial<Product>) {
    const index = this.products.findIndex((p) => p.id === id);
    if (index === -1) return null;

    this.products[index] = { ...this.products[index], ...product };
    return this.products[index];
  }

  paginate(page: number, limit: number) {
    const start = (page - 1) * limit;
    return this.products.slice(start, start + limit);
  }
}
