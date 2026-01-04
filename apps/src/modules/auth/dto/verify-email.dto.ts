import { IsEmail, IsString } from 'class-validator';

export class verifyEmailQuery {
  @IsString()
  token: string;

  @IsEmail()
  @IsString()
  email: string;
}
