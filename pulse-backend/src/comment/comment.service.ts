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

    return {
      id: comment.id,
      content: comment.content,
      created_at: comment.created_at,
      updated_at: comment.updated_at,
      task_id: comment.task_id,
      user_id: comment.user_id,
      user: {
        id: comment.user && comment.user[0] ? comment.user[0].id : '',
        name: comment.user && comment.user[0] ? comment.user[0].name : '',
        email: comment.user && comment.user[0] ? comment.user[0].email : '',
      }
    };
  }
}
