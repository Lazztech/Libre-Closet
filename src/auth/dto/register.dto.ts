import { IsEmail, IsString, Matches, MinLength } from 'class-validator';
import { Match } from '../match.decorator';
import { i18nValidationMessage } from 'nestjs-i18n';
import { I18nTranslations } from '../../i18n/generated/i18n.generated';

export class RegisterDto {
  @IsString()
  @IsEmail(
    {},
    {
      message: i18nValidationMessage<I18nTranslations>(
        'lang.validation.IS_EMAIL',
      ),
    },
  )
  email: string;

  @IsString()
  @MinLength(8, {
    message: i18nValidationMessage<I18nTranslations>(
      'lang.validation.MIN_PASSWORD_LENGTH',
    ),
  })
  @Matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, {
    message: i18nValidationMessage<I18nTranslations>(
      'lang.validation.PASSWORD_MUST_CONTAIN',
    ),
  })
  password: string;

  @Match('password', {
    message: i18nValidationMessage<I18nTranslations>(
      'lang.validation.PASSWORDS_MUST_MATCH',
    ),
  })
  confirmPassword: string;
}
