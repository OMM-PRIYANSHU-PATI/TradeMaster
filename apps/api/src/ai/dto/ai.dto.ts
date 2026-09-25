import { IsString, IsNotEmpty, MaxLength } from 'class-validator';

export class AiCoachDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(2000)
  message: string;
}
