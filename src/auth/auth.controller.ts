import {
  Body,
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Redirect,
  Render,
  Res,
  UseGuards,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { type Response } from 'express';
import { I18n, I18nContext } from 'nestjs-i18n';
import { AuthGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { EmailDto } from './dto/email.dto';
import { LoginDto } from './dto/login.dto';
import { Payload } from './dto/payload.dto';
import { RegisterDto } from './dto/register.dto';
import { ResetPasswordDto } from './dto/resetPassword.dto';
import { User } from './user.decorator';
import { UpdateEmailDto } from './dto/updateEmail.dto';
import { minutes, seconds, Throttle } from '@nestjs/throttler';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private authService: AuthService) {}

  @Post('register')
  async postRegister(
    @I18n() i18n: I18nContext,
    @Body() body: RegisterDto,
    @Res() response: Response,
  ): Promise<any> {
    const instance = plainToInstance(RegisterDto, body);
    const validationErrors = await i18n.validate(instance);
    if (validationErrors.length) {
      return response.render('auth/register', {
        layout: 'layout',
        input: body,
        validationErrors,
      });
    }

    const jwt = await this.authService.register(body.email, body.password);
    response.cookie('access_token', jwt);
    return response.redirect('/auth/profile');
  }

  @Render('auth/register')
  @Post('validate/register')
  async postRegisterValidate(
    @I18n() i18n: I18nContext,
    @Body() body: RegisterDto,
  ) {
    const instance = plainToInstance(RegisterDto, body);
    const validationErrors = await i18n.validate(instance);
    if (validationErrors.length) {
      return {
        input: body,
        validationErrors,
      };
    }

    return { input: body };
  }

  @Throttle({ default: { limit: 5, ttl: seconds(60) } })
  @Post('login')
  async postLogin(@Body() loginDto: LoginDto, @Res() response: Response) {
    try {
      const jwt = await this.authService.signIn(
        loginDto.email,
        loginDto.password,
      );
      response.cookie('access_token', jwt);
      return response.redirect('/auth/profile');
    } catch (error) {
      this.logger.warn(error);
      return response.render('auth/login', {
        layout: 'layout',
        error,
      });
    }
  }

  @Redirect('/')
  @Get('logout')
  getLogout(
    // https://docs.nestjs.com/techniques/cookies#use-with-express-default
    @Res({ passthrough: true }) response: Response,
  ) {
    response.clearCookie('access_token');
  }

  @Get('login')
  @Render('auth/login')
  getLogin(): any {}

  @Get('reset')
  @Render('auth/reset')
  getReset(@Query('email') emailQueryParam: string): any {
    return {
      input: {
        email: emailQueryParam,
      },
    };
  }

  @Post('reset')
  async postReset(@Body() emailDto: EmailDto, @Res() response: Response) {
    try {
      await this.authService.sendPasswordResetEmail(emailDto.email);
      return response.redirect(`/auth/reset-code?email=${emailDto.email}`);
    } catch (error) {
      this.logger.warn(error);
      return response.render('auth/reset', {
        layout: 'layout',
        error,
      });
    }
  }

  @Get('reset-code')
  @Render('auth/reset-code')
  getResetCode(@Query('email') emailQueryParam: string): any {
    return {
      input: {
        email: emailQueryParam,
      },
    };
  }

  @Throttle({ default: { limit: 5, ttl: minutes(10) } })
  @Render('auth/reset-code')
  @Post('validate/reset-code')
  async postResetCodeValidate(
    @I18n() i18n: I18nContext,
    @Body() body: ResetPasswordDto,
  ) {
    console.log(body);
    const instance = plainToInstance(ResetPasswordDto, body);
    const validationErrors = await i18n.validate(instance);
    if (validationErrors.length) {
      return {
        input: body,
        validationErrors,
      };
    }

    return { input: body };
  }

  @Post('reset-code')
  async postResetCode(
    @I18n() i18n: I18nContext,
    @Body() body: ResetPasswordDto,
    @Res() response: Response,
  ) {
    const instance = plainToInstance(ResetPasswordDto, body);
    const validationErrors = await i18n.validate(instance);
    if (validationErrors.length) {
      return response.render('auth/reset-code', {
        layout: 'layout',
        input: body,
        validationErrors,
      });
    }

    await this.authService.resetPassword(body);
    return response.redirect('/auth/login');
  }

  @Get('register')
  @Render('auth/register')
  getRegister(): any {}

  @UseGuards(AuthGuard)
  @Get('profile')
  @Render('auth/profile')
  getProfile(): any {}

  @UseGuards(AuthGuard)
  @Get('delete-account')
  @Render('auth/delete-account')
  getDeleteAccount(): any {}

  @UseGuards(AuthGuard)
  @Post('delete-account')
  async postDeleteAccount(
    @User() payload: Payload,
    @Body() loginDto: LoginDto,
    @Res() response: Response,
  ) {
    try {
      await this.authService.signIn(loginDto.email, loginDto.password);
      await this.authService.deleteUser(payload.userId);
      response.clearCookie('access_token');
      return response.redirect('/');
    } catch (error) {
      this.logger.warn(error);
      return response.render('auth/delete-account', {
        layout: 'layout',
        error,
      });
    }
  }

  @UseGuards(AuthGuard)
  @Get('update-email')
  @Render('auth/update-email')
  getUpdateEmail() {}

  @Render('auth/update-email')
  @Post('validate/update-email')
  async postValidateUpdateEmail(
    @I18n() i18n: I18nContext,
    @Body() body: UpdateEmailDto,
  ) {
    const instance = plainToInstance(UpdateEmailDto, body);
    const validationErrors = await i18n.validate(instance);
    if (validationErrors.length) {
      return {
        input: body,
        validationErrors,
      };
    }

    return { input: body };
  }

  @UseGuards(AuthGuard)
  @Post('update-email')
  async postUpdateEmail(
    @User() payload: Payload,
    @I18n() i18n: I18nContext,
    @Body() body: UpdateEmailDto,
    @Res() response: Response,
  ) {
    const instance = plainToInstance(UpdateEmailDto, body);
    const validationErrors = await i18n.validate(instance);
    if (validationErrors.length) {
      return response.render('auth/update-email', {
        layout: 'layout',
        input: body,
        validationErrors,
      });
    }

    await this.authService.changeEmail(payload.userId, body.confirmEmail);
    return response.redirect('/auth/profile');
  }
}
