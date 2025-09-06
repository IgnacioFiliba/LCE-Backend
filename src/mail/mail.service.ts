/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/prefer-promise-reject-errors */
import { Injectable } from '@nestjs/common';
import { MailerService } from '@nestjs-modules/mailer';
import { ConfigService } from '@nestjs/config';
import PDFDocument from 'pdfkit';
import { Buffer } from 'buffer';
import { Orders } from 'src/orders/entities/order.entity';
import { Users } from 'src/users/entities/user.entity';

@Injectable()
export class MailService {
  private backendUrl: string;
  private frontendUrl: string;
  private storeMail: string;

  constructor(
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
  ) {
    this.backendUrl =
      this.configService.get<string>('BACKEND_URL') || 'http://localhost:3001';
    this.frontendUrl =
      this.configService.get<string>('FRONTEND_URL') || 'http://localhost:3000';
    this.storeMail =
      this.configService.get<string>('MAIL_USER') || 'repustore2@gmail.com';
  }

  // Helper de moneda (ajustá moneda si corresponde)
  private money(n: number) {
    return new Intl.NumberFormat('es-AR', {
      style: 'currency',
      currency: 'ARS',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(n);
  }

  private async generateInvoicePdf(order: Orders): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 });
      const chunks: Uint8Array[] = [];

      doc.on('data', (chunk) => chunks.push(chunk));
      doc.on('end', () => resolve(Buffer.concat(chunks)));
      doc.on('error', (err) => reject(err));

      const red = '#D32F2F';
      const black = '#000000';
      const gray = '#F2F2F2';

      // ✅ Encabezado con fondo rojo
      doc.rect(0, 0, doc.page.width, 60).fill(red);
      doc
        .fillColor('white')
        .fontSize(22)
        .font('Helvetica-Bold')
        .text('Factura - RepuStore', 50, 20, { align: 'left' });
      doc.moveDown(2);

      // ✅ Datos del cliente (recuadro gris)
      const customerName = order.user?.name || 'Cliente';
      const customerEmail = order.user?.email || '';
      const orderDate = (order.date && new Date(order.date)) || new Date();

      doc
        .fillColor(black)
        .fontSize(11)
        .rect(50, 80, 500, 70)
        .fillAndStroke(gray, black);

      doc
        .fillColor(black)
        .font('Helvetica')
        .text(`Orden ID: ${order.id}`, 60, 90)
        .text(`Cliente: ${customerName}`, 60, 105)
        .text(`Email: ${customerEmail}`, 60, 120)
        .text(`Fecha: ${orderDate.toLocaleString('es-AR')}`, 60, 135);

      doc.moveDown(6);

      // ✅ Cabecera tabla (fondo negro)
      const xDesc = 50,
        xQty = 330,
        xUnit = 400,
        xSub = 500;

      const yTable = doc.y;
      doc.rect(50, yTable, 510, 20).fill(black);
      doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(12)
        .text('Producto', xDesc, yTable + 5)
        .text('Cant.', xQty, yTable + 5)
        .text('Precio', xUnit, yTable + 5)
        .text('Subtotal', xSub, yTable + 5);

      doc.moveDown(2);

      // ✅ Items con filas alternadas
      const items = order.orderDetails?.items || [];
      let total = 0;

      items.forEach((it, i) => {
        const name = it.product?.name || 'Producto';
        const qty = it.quantity || 0;
        const unit = Number(it.unitPrice) || 0;
        const sub = unit * qty;
        total += sub;

        const y = doc.y;

        // fondo gris alternado
        if (i % 2 === 0) {
          doc.rect(50, y - 2, 510, 20).fill(gray);
          doc.fillColor(black);
        } else {
          doc.fillColor(black);
        }

        doc
          .font('Helvetica')
          .fontSize(11)
          .text(name, xDesc, y)
          .text(`${qty}`, xQty, y)
          .text(this.money(unit), xUnit, y)
          .text(this.money(sub), xSub, y);

        doc.moveDown(1.5);
      });

      // ✅ Total resaltado (fondo rojo)
      doc.moveDown(1);
      const boxX = 350;
      const boxY = doc.y + 10;
      const boxWidth = 210;
      const boxHeight = 25;

      doc.rect(boxX, boxY, boxWidth, boxHeight).fill(red);

      // Texto TOTAL centrado
      doc
        .fillColor('white')
        .font('Helvetica-Bold')
        .fontSize(13)
        .text(`TOTAL: ${this.money(total)}`, boxX, boxY + 7, {
          width: boxWidth,
          align: 'center',
        });

      // ✅ Footer
      doc.moveDown(5);
      doc
        .fillColor('gray')
        .font('Helvetica-Oblique')
        .fontSize(11)
        .text('¡Gracias por tu compra! - RepuStore', { align: 'center' });

      doc.end();
    });
  }

  /** ✅ Enviar correo de orden aprobada (cliente + MAIL_USER) con PDF */
  async sendOrderApproved(order: Orders) {
    const pdfBuffer = await this.generateInvoicePdf(order);
    const userEmail = order.user?.email;
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
    const recipients = [userEmail, this.storeMail].filter(Boolean) as string[];

    await this.mailerService.sendMail({
      to: recipients,
      subject: `✅ Pedido aprobado - #${order.id}`,
      html: `
<div style="font-family: Arial, sans-serif; background-color: #ffffff; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto; border: 1px solid #ddd; color: #000000;">

  <!-- Encabezado -->
  <div style="background-color: #D32F2F; padding: 15px; text-align: center; color: #ffffff; border-radius: 6px 6px 0 0;">
    <h1 style="margin: 0; font-size: 22px;">RepuStore 🚗🔧</h1>
  </div>

  <!-- Cuerpo -->
  <div style="padding: 20px; text-align: center;">
    <h2 style="margin-bottom: 10px; color: #D32F2F;">¡Tu pedido está aprobado!</h2>
    <p style="font-size: 16px; margin: 10px 0; color: #000;">
      El pedido con ID <b>${order.id}</b> ya está 
      <span style="color: #D32F2F; font-weight: bold;">listo para retirar</span>.
    </p>
    <p style="font-size: 15px; margin-top: 20px; color: #000;">
      Gracias por confiar en <b style="color: #D32F2F;">RepuStore</b>. 
      Puedes ver los detalles desde tu perfil:
    </p>
    <a href="${this.frontendUrl}/profile" 
       style="display:inline-block; margin-top:15px; padding:12px 25px; background:#000000; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:5px;">
       🔎 Ver mis órdenes
    </a>
  </div>

  <!-- Footer -->
  <div style="background-color: #D32F2F; color: #fff; padding: 10px; text-align: center; border-radius: 0 0 6px 6px; font-size: 13px;">
    © 2025 RepuStore - Todos los derechos reservados
  </div>

</div>
`,

      attachments: [
        {
          filename: `Factura-${order.id}.pdf`,
          content: pdfBuffer,
          contentType: 'application/pdf',
        },
      ],
    });
  }

  async sendVerificationEmail(user: Users) {
    const verifyUrl = `${this.frontendUrl}/validation/${user.verificationToken}`;

    await this.mailerService.sendMail({
      to: user.email,
      subject: '🔐 Verifica tu cuenta - RepuStore',
      html: `
    <div style="font-family: Arial, sans-serif; background-color: #ffffff; padding: 20px; border-radius: 8px; max-width: 600px; margin: auto; border: 1px solid #ddd; color: #000000;">

      <!-- Encabezado -->
      <div style="background-color: #D32F2F; padding: 15px; text-align: center; color: #ffffff; border-radius: 6px 6px 0 0;">
        <h1 style="margin: 0; font-size: 22px;">RepuStore 🚗🔧</h1>
      </div>

      <!-- Cuerpo -->
      <div style="padding: 20px; text-align: center;">
        <h2 style="margin-bottom: 10px; color: #D32F2F;">¡Verifica tu cuenta!</h2>
        <p style="font-size: 16px; margin: 10px 0; color: #000;">
          Hola <b>${user.name}</b>, gracias por registrarte en <b style="color: #D32F2F;">RepuStore</b>.
        </p>
        <p style="font-size: 15px; margin: 10px 0; color: #000;">
          Para activar tu cuenta y comenzar a comprar, por favor haz clic en el siguiente botón:
        </p>
        <a href="${verifyUrl}" 
          style="display:inline-block; margin-top:15px; padding:12px 25px; background:#000000; color:#ffffff; text-decoration:none; font-weight:bold; border-radius:5px;">
          Verificar mi cuenta
        </a>
        <p style="font-size: 13px; margin-top: 20px; color: #555;">
          Si no creaste esta cuenta, ignora este correo.
        </p>
      </div>

      <!-- Footer -->
      <div style="background-color: #D32F2F; color: #fff; padding: 10px; text-align: center; border-radius: 0 0 6px 6px; font-size: 13px;">
        © 2025 RepuStore - Todos los derechos reservados
      </div>

    </div>
    `,
    });
  }
}
