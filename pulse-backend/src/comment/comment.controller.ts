import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus
} from '@nestjs/common';
import { CommentService } from './comment.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentResponseDto } from './dto/comment-response.dto';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class CommentController {
  constructor(private readonly commentService: CommentService) {}

  @Get('tasks/:taskId/comments')
  async getComments(
    @Param('taskId') taskId: string,
    @Request() req: any
  ): Promise<CommentResponseDto> {
    const userId = req.user.id;
    
    const comments = await this.commentService.getCommentsByTask(taskId, userId);
    
    return {
      success: true,
      data: comments,
      count: comments.length
    };
  }

  @Post('tasks/:taskId/comments')
  @HttpCode(HttpStatus.CREATED)
  async createComment(
    @Param('taskId') taskId: string,
    @Body() createCommentDto: CreateCommentDto,
    @Request() req: any
  ): Promise<CommentResponseDto> {
    const userId = req.user.id;
    
    const comment = await this.commentService.createComment(
      taskId,
      userId,
      createCommentDto
    );
    
    return {
      success: true,
      message: 'Comment created successfully',
      data: comment
    };
  }

  @Patch('tasks/:taskId/comments/:commentId')
  async updateComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Body() updateCommentDto: UpdateCommentDto,
    @Request() req: any
  ): Promise<CommentResponseDto> {
    const userId = req.user.id;
    
    const comment = await this.commentService.updateComment(
      taskId,
      commentId,
      userId,
      updateCommentDto
    );
    
    return {
      success: true,
      message: 'Comment updated successfully',
      data: comment
    };
  }

  @Delete('tasks/:taskId/comments/:commentId')
  @HttpCode(HttpStatus.OK)
  async deleteComment(
    @Param('taskId') taskId: string,
    @Param('commentId') commentId: string,
    @Request() req: any
  ): Promise<CommentResponseDto> {
    const userId = req.user.id;
    
    await this.commentService.deleteComment(taskId, commentId, userId);
    
    return {
      success: true,
      message: 'Comment deleted successfully'
    };
  }
}
