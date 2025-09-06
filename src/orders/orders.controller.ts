/* eslint-disable @typescript-eslint/no-unsafe-argument */
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Req,
  Patch,
  Query,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import {
  ApiBearerAuth,
  ApiParam,
  ApiOperation,
  ApiResponse,
} from '@nestjs/swagger';
import { Request } from 'express';
import { RolesGuard } from 'src/auth/roles.guard';
import { Roles } from 'src/interceptors/roles.decorator';
import { Role } from 'src/auth/roles.enum';
import { DashboardResponseDto } from './dto/dashboard-response.dto';

@Controller('orders')
export class OrdersController {
  constructor(private readonly orderService: OrdersService) {}

  @ApiBearerAuth()
  @Post()
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Crear una nueva orden de compra' })
  create(@Body() createOrderDto: CreateOrderDto) {
    return this.orderService.create(createOrderDto);
  }

  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @Get('dashboard')
  @ApiOperation({ summary: 'Obtener estadísticas de ventas' })
  @ApiResponse({ status: 200, type: DashboardResponseDto })
  getDashboard() {
    return this.orderService.getDashboard();
  }

  @ApiBearerAuth()
  @Get(':id')
  @UseGuards(AuthGuard)
  @ApiOperation({ summary: 'Obtener una orden de compra por su ID' })
  @ApiParam({
    name: 'id',
    description: 'ID de la orden a consultar',
    example: '77bd2cdb-9955-4849-abbd-33f064905946',
  })
  findOne(@Param('id') id: string, @Req() req: Request) {
    const userId = req.user.id;
    return this.orderService.findOne(id, userId);
  }

  @Get()
  @ApiBearerAuth()
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({
    summary: 'Obtener todas las órdenes con paginación (solo admin)',
  })
  findAll(
    @Req() req: Request,
    @Query('orderId') orderId?: string,
    @Query('page') page = '1',
    @Query('limit') limit = '10',
  ) {
    return this.orderService.findAll(
      req.user,
      Number(page),
      Number(limit),
      orderId,
    );
  }

  @ApiBearerAuth()
  @Patch(':id/status')
  @Roles(Role.ADMIN)
  @UseGuards(AuthGuard, RolesGuard)
  @ApiOperation({
    summary:
      'Cambiar el status de una orden de "En Preparacion" a "Aprobada" (solo admin)',
  })
  updateStatus(@Param('id') id: string, @Req() req: Request) {
    return this.orderService.updateStatus(id, req.user);
  }

  @ApiBearerAuth()
  @Post('seed')
  @ApiOperation({
    summary: 'Cargar órdenes de prueba desde orders.json',
  })
  async seedOrders() {
    return this.orderService.seeder();
  }
}
