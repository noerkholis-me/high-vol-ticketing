import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { PrismaService } from '../../prisma/prisma.service';
import { ConfigService } from '@nestjs/config';
import { Processor, WorkerHost } from '@nestjs/bullmq';
import type { Job } from 'bullmq';

@Processor('email')
@Injectable()
export class EmailProcessor extends WorkerHost {
  private transporter: nodemailer.Transporter;
  private logger = new Logger(EmailProcessor.name);

  constructor(
    private prisma: PrismaService,
    private config: ConfigService,
  ) {
    super();
    this.transporter = nodemailer.createTransport({
      host: this.config.get('SMTP_HOST'),
      port: this.config.get('SMTP_PORT'),
      secure: false,
      auth: {
        user: this.config.get('SMTP_USER'),
        pass: this.config.get('SMTP_PASS'),
      },
    });
  }

  async process(job: Job<{ userId: string; email: string; token: string }>) {
    if (job.name !== 'sendVerification') {
      throw new Error(`Job name ${job.name} not handled in this processor`);
    }
    this.logger.debug(`Mengirim email verifikasi ke ${job.data.email}`);
    const { token, email } = job.data;

    const verificationLink = `http://localhost:3000/api/v1/auth/verify?token=${token}&email=${email}`;

    const mailOptions: nodemailer.SendMailOptions = {
      from: this.config.get('SMTP_USER'),
      to: email,
      subject: 'Verifikasi Email High Volume Ticketing',
      text: `Klik link ini untuk verifikasi: ${verificationLink}. Link expire dalam 1 jam.`,
      html: `<p>Klik <a href="${verificationLink}">di sini</a> untuk verifikasi. Link expire dalam 1 jam.</p>`,
    };

    await this.transporter.sendMail(mailOptions).catch((error) => {
      this.logger.error(`Gagal mengirim email verifikasi ke ${email}: ${error}`);
    });
    this.logger.debug(`Email verifikasi dikirim ke ${email}`);
  }
}
