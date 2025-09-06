import { Injectable } from '@nestjs/common';
import { MercadoPagoConfig, Preference, Payment } from 'mercadopago';

@Injectable()
export class MercadoPagoClient {
  private readonly preference: Preference;
  private readonly payment: Payment;

  constructor() {
    const client = new MercadoPagoConfig({
      accessToken: process.env.MP_ACCESS_TOKEN!,
      options: { timeout: 10000 },
    });

    this.preference = new Preference(client);
    this.payment = new Payment(client);
  }

  get preferenceApi() {
    return this.preference;
  }

  get paymentApi() {
    return this.payment;
  }
}
