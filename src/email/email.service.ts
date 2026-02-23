import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as nodemailer from 'nodemailer';
import { Email } from './dto/email.dto';
import { EmailOptions } from './dto/emailOptions.dto';
import mg from 'nodemailer-mailgun-transport';

@Injectable()
export class EmailService {
  private logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;
  public readonly primaryEmailAddress?: string;
  private readonly transport?: string;

  constructor(private readonly configService: ConfigService) {
    this.logger.debug('constructor');

    this.transport = this.configService.get<string>('EMAIL_TRANSPORT');
    this.primaryEmailAddress =
      this.configService.get<string>('EMAIL_FROM_ADDRESS');

    if (this.transport === 'mailgun') {
      this.transporter = nodemailer.createTransport(
        mg({
          auth: {
            api_key: this.configService.get<string>('EMAIL_API_KEY') || '',
            domain: this.configService.get<string>('EMAIL_DOMAIN'),
          },
        }),
      );
    } else if (this.transport === 'gmail') {
      this.transporter = nodemailer.createTransport({
        service: 'Gmail',
        auth: {
          user: this.configService.get<string>('EMAIL_FROM_ADDRESS'),
          pass: this.configService.get<string>('EMAIL_PASSWORD'),
        },
      });
    }
  }

  public async sendEmailFromPrimaryAddress(options: EmailOptions) {
    this.logger.debug(this.sendEmailFromPrimaryAddress.name);

    return await this.sendEmail({
      from: this.configService.getOrThrow<string>('EMAIL_FROM_ADDRESS'),
      to: options.to,
      subject: options.subject,
      text: options.text,
      html: options.html,
    });
  }

  private async sendEmail(email: Email) {
    this.logger.debug(this.sendEmail.name);

    const messageId = await this.transporter
      .sendMail(email as nodemailer.SendMailOptions)
      .then((info) => info.messageId);

    return messageId;
  }
}
