/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unnecessary-type-assertion */
import { Controller, Post, Query, Res } from '@nestjs/common';
import { Response } from 'express';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class WebhookController {
  constructor(private readonly payments: PaymentsService) {}

  @Post('webhook')
  async handleWebhook(@Query() query: any, @Res() res: Response) {
    try {
      const topic = (query['type'] || query['topic'] || '').toString(); // "payment" o "merchant_order"
      const dataId = (query['data.id'] || query['id'] || '').toString(); // id del payment o del merchant_order

      if (!dataId) return res.sendStatus(400);

      // Helper para pedir un pago por id
      const getPayment = async (paymentId: string) => {
        const r = await fetch(
          `https://api.mercadopago.com/v1/payments/${paymentId}`,
          {
            headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
          },
        );
        if (!r.ok)
          throw new Error(`MP payments get ${paymentId} -> ${r.status}`);
        return r.json() as Promise<any>;
      };

      // Helper para pedir una merchant order por id
      const getMerchantOrder = async (merchantOrderId: string) => {
        const r = await fetch(
          `https://api.mercadopago.com/merchant_orders/${merchantOrderId}`,
          {
            headers: { Authorization: `Bearer ${process.env.MP_ACCESS_TOKEN}` },
          },
        );
        if (!r.ok)
          throw new Error(
            `MP merchant_orders get ${merchantOrderId} -> ${r.status}`,
          );
        return r.json() as Promise<any>;
      };

      // Caso 1: viene como payment directo
      if (topic === 'payment' || query['data.id']) {
        const payment = await getPayment(dataId);
        const status = payment?.status;
        const externalReference = payment?.external_reference; // acá guardaste el cartId

        if (!externalReference) {
          // Si no viene, igual confirmamos 200 para que MP no reintente infinito
          console.error('Payment sin external_reference', {
            id: dataId,
            payment,
          });
          return res.sendStatus(200);
        }

        await this.payments.updateCartFromPayment(
          dataId,
          status,
          externalReference,
        );

        return res.sendStatus(200);
      }

      // Caso 2: viene como merchant_order
      if (topic === 'merchant_order' || query['topic'] === 'merchant_order') {
        const mo = await getMerchantOrder(dataId);
        const payments: Array<{ id: string | number; status: string }> =
          mo?.payments || mo?.body?.payments || [];

        if (!payments.length) {
          // A veces llega la MO antes de que el pago exista; respondé 200 y MP reintentará
          return res.sendStatus(200);
        }

        // Elegimos el último pago (o el primero aprobado)
        const approved = payments.find((p) => p.status === 'approved');
        const chosen = approved ?? payments[payments.length - 1];
        const paymentId = String(chosen.id);

        const payment = await getPayment(paymentId);
        const status = payment?.status;
        const externalReference = payment?.external_reference;

        if (externalReference) {
          await this.payments.updateCartFromPayment(
            paymentId,
            status === 'approved' ? 'success' : 'failure',
            externalReference,
          );
        } else {
          console.error('MO->Payment sin external_reference', {
            dataId,
            paymentId,
            payment,
          });
        }

        return res.sendStatus(200);
      }

      // Si vino algo raro pero con id, devolvemos 200 para evitar reintentos infinitos
      return res.sendStatus(200);
    } catch (e) {
      console.error('Error en webhook:', e);
      // Igual responder 200 limita reintentos si el error es de nuestro lado; durante dev podés dejar 500
      return res.sendStatus(200);
    }
  }
}
