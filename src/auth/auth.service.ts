import { EntityManager, EntityRepository } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import {
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { User } from '../dal/entity/user.entity';
import * as bcrypt from 'bcryptjs';
import { ChangePasswordDto } from './dto/changePassword.dto';
import { Payload } from './dto/payload.dto';
import { EmailService } from '../email/email.service';
import { PasswordReset } from '../dal/entity/passwordReset.entity';
import { randomInt } from 'crypto';
import { ResetPasswordDto } from './dto/resetPassword.dto';

@Injectable()
export class AuthService {
  private logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: EntityRepository<User>,
    private jwtService: JwtService,
    private readonly em: EntityManager,
    private emailService: EmailService,
    @InjectRepository(PasswordReset)
    private passwordResetRepository: EntityRepository<PasswordReset>,
  ) {}

  async register(email: string, password: string): Promise<string> {
    this.logger.debug(this.register.name);
    const existingUser = await this.userRepository.findOne({ email });
    if (existingUser) {
      this.logger.debug(`User already exists with email address: ${email}`);
      throw new HttpException('Forbidden', HttpStatus.FORBIDDEN);
    }

    const hashedPassword = await bcrypt.hash(password, 12);
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
    } as User);
    await this.em.persistAndFlush(user);

    return this.jwtService.signAsync({
      userId: user.id,
      email: user.email,
    } as Payload);
  }

  async signIn(email: string, password: string): Promise<string> {
    const user = await this.userRepository.findOneOrFail({ email });
    const valid = await bcrypt.compare(password, user?.password);
    if (!valid) {
      throw new UnauthorizedException();
    }
    return this.jwtService.signAsync({
      userId: user.id,
      email: user.email,
    } as Payload);
  }

  public async changePassword(userId: any, details: ChangePasswordDto) {
    this.logger.debug(this.changePassword.name);
    const user = await this.userRepository.findOneOrFail({ id: userId });

    if (await bcrypt.compare(details.oldPassword, user.password)) {
      const newHashedPassword = await bcrypt.hash(details.newPassword, 12);
      user.password = newHashedPassword;
      return await this.em.persistAndFlush(user);
    }
  }

  public async changeEmail(userId: any, newEmail: string) {
    const user = await this.userRepository.findOneOrFail({ id: userId });
    user.email = newEmail;
    await this.em.persistAndFlush(user);
  }

  async deleteUser(userId: any) {
    const user = await this.userRepository.findOneOrFail({ id: userId });
    await this.em.removeAndFlush(user);
  }

  public async resetPassword(details: ResetPasswordDto) {
    this.logger.debug(this.resetPassword.name);
    const user = await this.userRepository.findOneOrFail({
      email: details.email,
    });

    const passwordReset = await user.passwordReset.load();

    if (passwordReset?.pin === details.resetCode) {
      const hashedPassword = await bcrypt.hash(details.password, 12);
      user.password = hashedPassword;
      await this.em.persistAndFlush(user);
    }
  }

  async sendPasswordResetEmail(email: string) {
    this.logger.debug(this.sendPasswordResetEmail.name);
    const user = await this.userRepository.findOneOrFail({ email });
    const pin = randomInt(100000, 999999).toString();
    await this.emailService.sendEmailFromPrimaryAddress({
      to: user.email!,
      subject: `Password reset for ${user.email}`,
      text: `Hello, ${user.email}, please paste in the follow to reset your password: ${pin}`,
      html: `<b>Hello, <strong>${user.email}</strong>, Please paste in the follow to reset your password: ${pin}</p>`,
    });

    const passwordReset = this.passwordResetRepository.create({ pin, user });
    await this.em.persistAndFlush(passwordReset);
  }
}
