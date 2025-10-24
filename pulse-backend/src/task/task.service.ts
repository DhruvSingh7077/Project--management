import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TaskService {
  constructor(private readonly supabase: SupabaseService) {}

  // ▶ Create a new task inside a specific project
  async create(userId: string, projectId: string, dto: any) {
    const project = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', projectId)
      .single()) as unknown as {
      data: { ownerId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (project.error?.code === 'PGRST116' || !project.data)
      throw new NotFoundException('Project not found');
    if (project.error) throw new BadRequestException(project.error.message);
    if (project.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    const taskInsert = (await this.supabase.client
      .from('Task')
      .insert({
        title: dto.title,
        description: dto.description ?? null,
        status: dto.status ?? 'todo',
        dueDate: dto.dueDate ?? null,
        assigneeId: dto.assigneeId ?? null,
        projectId,
      })
      .select('*')
      .single()) as unknown as {
      data: any;
      error: { message: string } | null;
    };

    if (taskInsert.error)
      throw new BadRequestException(taskInsert.error.message);

    return taskInsert.data;
  }

  // ▶ Get all tasks for a project
  async findAll(userId: string, projectId: string) {
    const project = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', projectId)
      .single()) as unknown as {
      data: { ownerId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (project.error?.code === 'PGRST116' || !project.data)
      throw new NotFoundException('Project not found');
    if (project.error) throw new BadRequestException(project.error.message);
    if (project.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    const tasks = (await this.supabase.client
      .from('Task')
      .select('*')
      .eq('projectId', projectId)
      .order('createdAt', { ascending: false })) as unknown as {
      data: any[];
      error: { message: string } | null;
    };

    if (tasks.error) throw new BadRequestException(tasks.error.message);

    return tasks.data;
  }

  // ▶ Get board view (group tasks by status)
  async getBoard(userId: string, projectId: string) {
    const project = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', projectId)
      .single()) as unknown as {
      data: { ownerId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (project.error?.code === 'PGRST116' || !project.data)
      throw new NotFoundException('Project not found');
    if (project.error) throw new BadRequestException(project.error.message);
    if (project.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    const tasks = (await this.supabase.client
      .from('Task')
      .select('*')
      .eq('projectId', projectId)
      .order('createdAt', { ascending: true })) as unknown as {
      data: any[];
      error: { message: string } | null;
    };

    if (tasks.error) throw new BadRequestException(tasks.error.message);

    const board = {
      todo: [] as any[],
      in_progress: [] as any[],
      done: [] as any[],
    };

    for (const t of tasks.data) {
      switch (t.status) {
        case 'in_progress':
          board.in_progress.push(t);
          break;
        case 'done':
          board.done.push(t);
          break;
        default:
          board.todo.push(t);
      }
    }

    return board;
  }

  // ▶ Update a task
  async update(userId: string, id: string, dto: any) {
    const task = (await this.supabase.client
      .from('Task')
      .select('projectId')
      .eq('id', id)
      .single()) as unknown as {
      data: { projectId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (task.error?.code === 'PGRST116' || !task.data)
      throw new NotFoundException('Task not found');
    if (task.error) throw new BadRequestException(task.error.message);

    const project = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', task.data.projectId)
      .single()) as unknown as {
      data: { ownerId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (project.error?.code === 'PGRST116' || !project.data)
      throw new NotFoundException('Project not found');
    if (project.error) throw new BadRequestException(project.error.message);
    if (project.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    const updatedTask = (await this.supabase.client
      .from('Task')
      .update({
        title: dto.title,
        description: dto.description,
        status: dto.status,
        assigneeId: dto.assigneeId,
        dueDate: dto.dueDate,
      })
      .eq('id', id)
      .select('*')
      .single()) as unknown as {
      data: any;
      error: { message: string } | null;
    };

    if (updatedTask.error)
      throw new BadRequestException(updatedTask.error.message);

    return updatedTask.data;
  }

  // ▶ Delete a task
  async remove(userId: string, id: string) {
    const task = (await this.supabase.client
      .from('Task')
      .select('projectId')
      .eq('id', id)
      .single()) as unknown as {
      data: { projectId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (task.error?.code === 'PGRST116' || !task.data)
      throw new NotFoundException('Task not found');
    if (task.error) throw new BadRequestException(task.error.message);

    const project = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', task.data.projectId)
      .single()) as unknown as {
      data: { ownerId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (project.error?.code === 'PGRST116' || !project.data)
      throw new NotFoundException('Project not found');
    if (project.error) throw new BadRequestException(project.error.message);
    if (project.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    const deletedTask = (await this.supabase.client
      .from('Task')
      .delete()
      .eq('id', id)
      .select('*')
      .single()) as unknown as {
      data: any;
      error: { message: string } | null;
    };

    if (deletedTask.error)
      throw new BadRequestException(deletedTask.error.message);
    return deletedTask.data;
  }
}
