import { IsString, IsNotEmpty, MinLength, MaxLength } from 'class-validator';

export class UpdateCommentDto {
  @IsString()
  @IsNotEmpty({ message: 'Comment content is required' })
  @MinLength(1, { message: 'Comment cannot be empty' })
  @MaxLength(5000, { message: 'Comment cannot exceed 5000 characters' })
  content: string;
}
