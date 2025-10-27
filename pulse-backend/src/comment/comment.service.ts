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
    this.supabase = this.supabaseService.client;
  }

  async getCommentsByTask(taskId: string, userId: string): Promise<CommentWithUser[]> {
    // Diagnostic plain fetch
    const { data: plainTask, error: plainErr } = await this.supabase
      .from('Task')
      .select('*')
      .eq('id', taskId)
      .single();
    console.log('[TASK DIAG] plain:', plainTask, plainErr, 'taskId:', taskId, 'userId:', userId);

    // Join query with correct alias for relation name "Project" and column "userid"
    const { data: task, error: taskError } = await this.supabase
      .from('Task')
      .select(`
        id,
        projectId,
        Project!inner (
          id,
          ProjectMember!inner (
            userid
          )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.userid', userId)
      .single();

    console.log('[TASK DIAG] join:', task, taskError);

    if (taskError || !task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    // Fetch comments with user info
    const { data: comments, error } = await this.supabase
      .from('comment') // LOWERCASE
      .select(`
        id,
        content,
        created_at,
        updated_at,
        task_id,
        user_id,
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

    return (comments || []).map((c: any) => ({
      id: c.id,
      content: c.content,
      created_at: c.created_at,
      updated_at: c.updated_at,
      task_id: c.task_id,
      user_id: c.user_id,
      user: {
        id: c.user?.id ?? '',
        name: c.user?.name ?? '',
        email: c.user?.email ?? '',
      }
    }));
  }

  async createComment(
    taskId: string,
    userId: string,
    createCommentDto: CreateCommentDto,
  ): Promise<CommentWithUser> {
    // Diagnostic plain fetch
    const { data: plainTask, error: plainErr } = await this.supabase
      .from('Task')
      .select('*')
      .eq('id', taskId)
      .single();
    console.log('[TASK DIAG] plain:', plainTask, plainErr, 'taskId:', taskId, 'userId:', userId);

    // Join query with correct alias
    const { data: task, error: taskError } = await this.supabase
      .from('Task')
      .select(`
        id,
        projectId,
        Project!inner (
          id,
          ProjectMember!inner (
            userid
          )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.userid', userId)
      .single();

    console.log('[TASK DIAG] join:', task, taskError);

    if (taskError || !task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    // Insert comment
    const { data: comment, error } = await this.supabase
      .from('comment') // LOWERCASE
      .insert({
        task_id: taskId,
        user_id: userId,
        content: createCommentDto.content.trim(),
      })
      .select(`
        id,
        content,
        created_at,
        updated_at,
        task_id,
        user_id,
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

    // normalize returned user (Supabase may return relation as array or object)
    const createdUser = Array.isArray(comment.user) ? comment.user[0] : comment.user;

    return {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      task_id: comment.task_id,
      user_id: comment.user_id,
      user: {
        id: createdUser?.id ?? '',
        name: createdUser?.name ?? '',
        email: createdUser?.email ?? '',
      }
    };
  }

  async updateComment(
    taskId: string,
    commentId: string,
    userId: string,
    updateCommentDto: UpdateCommentDto,
  ): Promise<CommentWithUser> {
    // Verify task exists and user has access (same check as other methods)
    const { data: task, error: taskError } = await this.supabase
      .from('Task')
      .select(`
        id,
        projectId,
        Project!inner (
          id,
          ProjectMember!inner (
            userid
          )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.userid', userId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    // Fetch existing comment
    const { data: existingComment, error: existingError } = await this.supabase
      .from('comment')
      .select('*')
      .eq('id', commentId)
      .single();

    if (existingError || !existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.task_id !== taskId) {
      throw new BadRequestException('Comment does not belong to the specified task');
    }

    // Only the comment owner can update
    if (existingComment.user_id !== userId) {
      throw new ForbiddenException('You are not allowed to update this comment');
    }

    // Perform update and return updated comment with user relationship
    const { data: updated, error } = await this.supabase
      .from('comment')
      .update({
        content: updateCommentDto.content.trim(),
      })
      .eq('id', commentId)
      .select(`
        id,
        content,
        created_at,
        updated_at,
        task_id,
        user_id,
        user:User (
          id,
          name,
          email
        )
      `)
      .single();

    if (error || !updated) {
      throw new BadRequestException(`Failed to update comment: ${error?.message ?? 'unknown error'}`);
    }

    // normalize user object (Supabase can return relation as array or object)
    const userObj = Array.isArray(updated.user) ? updated.user[0] : updated.user;

    return {
      id: updated.id,
      content: updated.content,
      created_at: updated.created_at,
      updated_at: updated.updated_at,
      task_id: updated.task_id,
      user_id: updated.user_id,
      user: {
        id: userObj?.id ?? '',
        name: userObj?.name ?? '',
        email: userObj?.email ?? '',
      }
    };
  }

  // fetch one comment
  async getCommentById(commentId: string): Promise<CommentWithUser | null> {
    const { data: c, error } = await this.supabase
      .from('comment')
      .select(`
        id, content, created_at, updated_at, task_id, user_id,
        user:User ( id, name, email )
      `)
      .eq('id', commentId)
      .single();
    if (error || !c) return null;
    const userObj = Array.isArray(c.user) ? c.user[0] : c.user;
    return { id: c.id, content: c.content, created_at: c.created_at, updated_at: c.updated_at, task_id: c.task_id, user_id: c.user_id, user: { id: userObj?.id ?? '', name: userObj?.name ?? '', email: userObj?.email ?? '' } };
  }

  // soft delete (set deleted_at, keep history) with access + ownership checks
  async deleteComment(taskId: string, commentId: string, userId: string): Promise<void> {
    // Verify task exists and user has access (same check as other methods)
    const { data: task, error: taskError } = await this.supabase
      .from('Task')
      .select(`
        id,
        projectId,
        Project!inner (
          id,
          ProjectMember!inner (
            userid
          )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.userid', userId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found or you do not have access');
    }

    // Fetch existing comment
    const { data: existingComment, error: existingError } = await this.supabase
      .from('comment')
      .select('*')
      .eq('id', commentId)
      .single();

    if (existingError || !existingComment) {
      throw new NotFoundException('Comment not found');
    }

    if (existingComment.task_id !== taskId) {
      throw new BadRequestException('Comment does not belong to the specified task');
    }

    // Only the comment owner can delete
    if (existingComment.user_id !== userId) {
      throw new ForbiddenException('You are not allowed to delete this comment');
    }

    const { error } = await this.supabase
      .from('comment')
      .update({ deleted_at: new Date().toISOString() })
      .eq('id', commentId);

    if (error) {
      throw new BadRequestException(`Failed to delete comment: ${error.message}`);
    }
  }

  // reply to a comment (threading via parent_id)
  async replyToComment(taskId: string, parentId: string, userId: string, dto: { content: string }) {
    const { data, error } = await this.supabase
      .from('comment')
      .insert({ task_id: taskId, parent_id: parentId, user_id: userId, content: dto.content.trim() })
      .select('id, content, created_at, user:User(id,name,email)')
      .single();
    if (error) throw new BadRequestException(error.message);
    const userObj = Array.isArray(data.user) ? data.user[0] : data.user;
    return { id: data.id, content: data.content, created_at: data.created_at, user: { id: userObj?.id ?? '', name: userObj?.name ?? '', email: userObj?.email ?? '' } };
  }

  // like / unlike comment (idempotent)
  async toggleLike(commentId: string, userId: string): Promise<{ liked: boolean }> {
    const { data: exists } = await this.supabase.from('comment_like').select('*').eq('comment_id', commentId).eq('user_id', userId).single();
    if (exists) {
      await this.supabase.from('comment_like').delete().eq('comment_id', commentId).eq('user_id', userId);
      return { liked: false };
    } else {
      await this.supabase.from('comment_like').insert({ comment_id: commentId, user_id: userId });
      return { liked: true };
    }
  }
}
