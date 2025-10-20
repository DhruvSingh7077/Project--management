import { IsString, IsOptional, Length } from 'class-validator';

export class CreateProjectDto {
  @IsString()
  @Length(3, 50, {
    message: 'Project name must be between 3 and 50 characters',
  })
  name!: string;

  @IsOptional()
  @IsString()
  description?: string;
}
