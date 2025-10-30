import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseClient } from '@supabase/supabase-js';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class TaskService {
  private supabase: SupabaseClient;

  constructor(private readonly supabaseService: SupabaseService) {
    // try common property names, fall back to service itself (unsafe any)
    this.supabase =
      (this.supabaseService as any).client ??
      (this.supabaseService as any).supabase ??
      (this.supabaseService as any).getClient?.() ??
      (this.supabaseService as any);
  }

  // Check if user can access this project, by role
  // allowed: which roles are allowed for the action
  async hasProjectAccess(
    userId: string,
    projectId: string,
    allowed: Array<'owner' | 'member' | 'viewer'> = ['owner', 'member', 'viewer'],
  ) {
    // 1) Owner check
    const project = (await this.supabase
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

    if (allowed.includes('owner') && project.data.ownerId === userId) return true;

    // 2) Member check (ProjectMember uses lowercase column names)
    const member = (await this.supabase
      .from('ProjectMember')
      .select('role')
      .eq('projectid', projectId)
      .eq('userid', userId)
      .single()) as unknown as {
      data: { role: 'member' | 'viewer' } | null;
      error: { message: string } | null;
    };

    if (member.data && allowed.includes(member.data.role)) return true;

    throw new ForbiddenException('Access denied');
  }

  // ▶ Create a new task inside a specific project (owner + member)
  async create(userId: string, projectId: string, dto: any) {
    await this.hasProjectAccess(userId, projectId, ['owner', 'member']);

    const taskInsert = (await this.supabase
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

  // ▶ Get all tasks for a project (owner + member + viewer)
  async findAll(userId: string, projectId: string) {
    await this.hasProjectAccess(userId, projectId, ['owner', 'member', 'viewer']);

    const tasks = (await this.supabase
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

  // ▶ Get board view (owner + member + viewer)
  async getBoard(userId: string, projectId: string) {
    await this.hasProjectAccess(userId, projectId, ['owner', 'member', 'viewer']);

    const tasks = (await this.supabase
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

  // ▶ Update a task (owner + member)
  async update(userId: string, id: string, dto: any) {
    const task = (await this.supabase
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

    await this.hasProjectAccess(userId, task.data.projectId, ['owner', 'member']);

    const updatedTask = (await this.supabase
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

  // ▶ Delete a task (owner + member)
  async remove(userId: string, id: string) {
    const task = (await this.supabase
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

    await this.hasProjectAccess(userId, task.data.projectId, ['owner', 'member']);

    const deletedTask = (await this.supabase
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

  // Move a single task to a status(column) and position
  async moveTask(taskId: string, userId: string, toStatus: string, toPosition: number) {
    // verify task + membership (same pattern used elsewhere)
    const { data: task, error: taskError } = await this.supabase
      .from('Task')
      .select(`
        id,
        projectId,
        status,
        position,
        Project!inner (
          id,
          ProjectMember!inner ( userid )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.userid', userId)
      .single();

    if (taskError || !task) {
      throw new NotFoundException('Task not found or access denied');
    }

    const projectId = task.projectId;
    const fromStatus = task.status;

    // If toStatus not provided default to same
    toStatus = toStatus ?? fromStatus;
    toPosition = Math.max(0, Math.floor(Number(toPosition) || 0));

    // fetch tasks for destination column
    const { data: destTasks = [], error: destErr } = await this.supabase
      .from('Task')
      .select('id, position')
      .eq('projectId', projectId)
      .eq('status', toStatus)
      .order('position', { ascending: true });

    if (destErr) throw new BadRequestException(destErr.message);

    // remove moving task from lists if present
    let newDestOrder = (destTasks ?? []).filter((t: any) => t.id !== taskId).map((t: any) => t.id);
    if (toPosition > newDestOrder.length) toPosition = newDestOrder.length;
    newDestOrder.splice(toPosition, 0, taskId);

    // update positions for destination column
    for (let i = 0; i < newDestOrder.length; i++) {
      const id = newDestOrder[i];
      const updates: any = { position: i };
      // only change status for the moved task (others keep same status)
      if (id === taskId) updates.status = toStatus;
      const { error } = await this.supabase
        .from('Task')
        .update(updates)
        .eq('id', id);
      if (error) throw new BadRequestException(error.message);
    }

    // if moved between columns, reindex source column tasks to close the gap
    if (fromStatus !== toStatus) {
      const { data: srcTasks = [], error: srcErr } = await this.supabase
        .from('Task')
        .select('id')
        .eq('projectId', projectId)
        .eq('status', fromStatus)
        .order('position', { ascending: true });

      if (srcErr) throw new BadRequestException(srcErr.message);

      for (let i = 0; i < srcTasks.length; i++) {
        const { error } = await this.supabase
          .from('Task')
          .update({ position: i })
          .eq('id', srcTasks[i].id);
        if (error) throw new BadRequestException(error.message);
      }
    }

    return { success: true };
  }

  // Batch reorder multiple tasks (useful for large drag/drop operations)
  async reorderTasks(userId: string, updates: { taskId: string; toPosition: number; toStatus?: string }[]) {
    if (!Array.isArray(updates) || updates.length === 0) return { success: true };

    // group updates by target status so we can reindex each column
    const byStatus: Record<string, string[]> = {};

    // fetch all affected tasks to validate membership and project
    const taskIds = updates.map(u => u.taskId);
    const { data: tasks = [], error: fetchErr } = await this.supabase
      .from('Task')
      .select('id, projectId, status')
      .in('id', taskIds);

    if (fetchErr) throw new BadRequestException(fetchErr.message);
    if (tasks.length !== taskIds.length) throw new NotFoundException('One or more tasks not found');

    // ensure user is a member of each task's project
    const projectIds = Array.from(new Set(tasks.map((t: any) => t.projectId)));
    for (const pid of projectIds) {
      const { data: memberCheck, error: memErr } = await this.supabase
        .from('ProjectMember')
        .select('userid')
        .eq('projectid', pid)
        .eq('userid', userId)
        .single();
      if (memErr || !memberCheck) throw new ForbiddenException('Access denied to some projects');
    }

    // build mapping of status -> current ordered list (ids)
    const statuses = Array.from(new Set(updates.map(u => u.toStatus || tasks.find(t => t.id === u.taskId).status)));
    const statusCurrentMap: Record<string, string[]> = {};
    for (const s of statuses) {
      const { data: items = [], error: err } = await this.supabase
        .from('Task')
        .select('id')
        .eq('projectId', tasks[0].projectId) // assume same project for this batch; if cross-project needed, run per-project
        .eq('status', s)
        .order('position', { ascending: true });
      if (err) throw new BadRequestException(err.message);
      statusCurrentMap[s] = items.map((it: any) => it.id);
    }

    // apply updates by status
    for (const u of updates) {
      const currentStatus = tasks.find((t: any) => t.id === u.taskId).status;
      const targetStatus = u.toStatus ?? currentStatus;

      // ensure the task is removed from its current list
      statusCurrentMap[currentStatus] = statusCurrentMap[currentStatus].filter((id: string) => id !== u.taskId);
      if (!statusCurrentMap[targetStatus]) statusCurrentMap[targetStatus] = [];
      const pos = Math.max(0, Math.min(u.toPosition, statusCurrentMap[targetStatus].length));
      statusCurrentMap[targetStatus].splice(pos, 0, u.taskId);
    }

    // persist new positions for each status group
    for (const s of Object.keys(statusCurrentMap)) {
      const list = statusCurrentMap[s];
      for (let i = 0; i < list.length; i++) {
        const id = list[i];
        const { error } = await this.supabase
          .from('Task')
          .update({ position: i, status: s })
          .eq('id', id);
        if (error) throw new BadRequestException(error.message);
      }
    }

    return { success: true };
  }
}