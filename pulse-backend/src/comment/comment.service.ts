import { Injectable, NotFoundException, ForbiddenException, BadRequestException } from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateCommentDto } from './dto/create-comment.dto';
import { UpdateCommentDto } from './dto/update-comment.dto';
import { CommentWithUser } from './entities/comment.entity';

@Injectable()
export class CommentService {
  private supabase: SupabaseClient;

  constructor(private readonly supabaseService: SupabaseService) {
    this.supabase = this.supabaseService.getClient();
  }

  async getCommentsByTask(taskId: string, userId: string): Promise<CommentWithUser[]> {
    // First verify user has access to this task
    const { data: task, error: taskError } = await this.supabase
      .from('Task')
      .select(`
        id,
        project_id,
        Project!inner (
          id,
          ProjectMember!inner (
            user_id
          )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.user_id', userId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    // Get comments with user information
    const { data: comments, error } = await this.supabase
      .from('Comment')
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user:User (
          id,
          name,
          email
        )
      `)
      .eq('task_id', taskId)
      .order('created_at', { ascending: true });

    if (error) {
      throw new BadRequestException(`Failed to fetch comments: ${error.message}`);
    }

    return comments || [];
  }

  async createComment(
    taskId: string,
    userId: string,
    createCommentDto: CreateCommentDto
  ): Promise<CommentWithUser> {
    // Verify user has access to this task
    const { data: task, error: taskError } = await this.supabase
      .from('Task')
      .select(`
        id,
        project_id,
        Project!inner (
          ProjectMember!inner (
            user_id
          )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.user_id', userId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    // Create comment
    const { data: comment, error } = await this.supabase
      .from('Comment')
      .insert({
        task_id: taskId,
        user_id: userId,
        content: createCommentDto.content.trim()
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user:User (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to create comment: ${error.message}`);
    }

    // TODO: Create activity log entry
    // TODO: Send notifications to task watchers

    return comment;
  }

  async updateComment(
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto
  ): Promise<CommentWithUser> {
    // Check if comment exists and user owns it
    const { data: existingComment, error: fetchError } = await this.supabase
      .from('Comment')
      .select('id, user_id')
      .eq('id', commentId)
      .single();

    if (fetchError || !existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.user_id !== userId) {
      throw new ForbiddenException('You can only edit your own comments');
    }

    // Update comment
    const { data: comment, error } = await this.supabase
      .from('Comment')
      .update({
        content: updateCommentDto.content.trim()
      })
      .eq('id', commentId)
      .select(`
        id,
        content,
        created_at,
        updated_at,
        user:User (
          id,
          name,
          email
        )
      `)
      .single();

    if (error) {
      throw new BadRequestException(`Failed to update comment: ${error.message}`);
    }

    return comment;
  }

  async deleteComment(commentId: string, userId: string): Promise<void> {
    // Get comment with task and project info
    const { data: comment, error: fetchError } = await this.supabase
      .from('Comment')
      .select(`
        id,
        user_id,
        task:Task (
          id,
          project_id,
          Project (
            ProjectMember (
              user_id,
              role
            )
          )
        )
      `)
      .eq('id', commentId)
      .single();

    if (fetchError || !comment) {
      throw new NotFoundException('Comment not found');
    }

    // Check if user owns the comment OR is project owner
    const isOwner = comment.user_id === userId;
    const isProjectOwner = comment.task.Project.ProjectMember.some(
      (pm: any) => pm.user_id === userId && pm.role === 'owner'
    );

    if (!isOwner && !isProjectOwner) {
      throw new ForbiddenException(
        'Only comment owner or project owner can delete this comment'
      );
    }

    // Delete comment
    const { error } = await this.supabase
      .from('Comment')
      .delete()
      .eq('id', commentId);

    if (error) {
      throw new BadRequestException(`Failed to delete comment: ${error.message}`);
    }
  }
}
