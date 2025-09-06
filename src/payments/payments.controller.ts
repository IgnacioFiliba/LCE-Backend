import {
  Body,
  Controller,
  NotFoundException,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { AuthGuard } from 'src/auth/auth.guard';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiTags,
} from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Orders } from 'src/orders/entities/order.entity';

@ApiTags('payments')
@Controller('payments')
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    @InjectRepository(Orders)
    private readonly ordersRepository: Repository<Orders>,
  ) {}

  @ApiBearerAuth()
  @UseGuards(AuthGuard)
  @Post('checkout/:cartId')
  @ApiOperation({
    summary: 'Crear preferencia de pago de Mercado Pago a partir del Cart',
  })
  @ApiParam({
    name: 'cartId',
    example: '77bd2cdb-9955-4849-abbd-33f064905946',
  })
  async checkout(@Param('cartId') cartId: string) {
    return this.payments.createCheckoutPreference(cartId);
  }

  @Post('success')
  success() {
    return { ok: true, message: 'Pago aprobado' };
  }

  @Post('failure')
  failure() {
    return { ok: false, message: 'Pago rechazado' };
  }

  @Post('pending')
  pending() {
    return { ok: true, message: 'Pago pendiente' };
  }

  @Post('confirm')
  async confirmPayment(
    @Body() body: { status: string; paymentId: string; preferenceId: string },
  ) {
    const { status, paymentId, preferenceId } = body;

    // Buscar la orden por el preferenceId
    const order = await this.ordersRepository.findOne({
      where: { mpPreferenceId: preferenceId },
    });

    if (!order) {
      throw new NotFoundException('Orden no encontrada');
    }

    // Actualizar datos de pago
    order.paymentStatus = status;
    order.mpPaymentId = paymentId;

    await this.ordersRepository.save(order);

    return { ok: true, order };
  }
}
