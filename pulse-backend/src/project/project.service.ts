import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { PostgrestError } from '@supabase/supabase-js';
import { Project, Task } from './entities/project.entity';

// ---------------------------------------------------------------------------
// A minimal shim type so TypeScript always knows .data and .error exist.
// ---------------------------------------------------------------------------
type SimpleResult<T> = { data: T | null; error: PostgrestError | null };

// Optional model shapes for convenience.

@Injectable()
export class ProjectService {
  constructor(private readonly supabase: SupabaseService) {}

  // -------------------------------------------------------------------------
  // Create a new project
  // -------------------------------------------------------------------------
  async create(userId: string, data: CreateProjectDto) {
    const res = (await this.supabase.client
      .from('Project')
      .insert({
        name: data.name,
        description: data.description ?? null,
        ownerId: userId,
      })
      .select('id,name,description,ownerId,createdAt,updatedAt')
      .single()) as unknown as SimpleResult<Project>;

    if (res.error) throw new BadRequestException(res.error.message);
    return { ...res.data!, tasks: [] };
  }

  // -------------------------------------------------------------------------
  // Get all projects belonging to the user (with tasks)
  // -------------------------------------------------------------------------
  async findAll(userId: string) {
    const res = (await this.supabase.client
      .from('Project')
      .select('id,name,description,ownerId,createdAt,updatedAt')
      .eq('ownerId', userId)
      .order('createdAt', { ascending: false })) as unknown as SimpleResult<
      Project[]
    >;

    if (res.error) throw new BadRequestException(res.error.message);
    const projects = res.data ?? [];
    if (!projects.length) return [];

    // Fetch tasks in one query
    const projectIds = projects.map((p) => p.id);
    const taskRes = (await this.supabase.client
      .from('Task')
      .select('*')
      .in('projectId', projectIds)) as unknown as SimpleResult<Task[]>;

    if (taskRes.error) throw new BadRequestException(taskRes.error.message);

    const taskMap = new Map<string, Task[]>();
    (taskRes.data ?? []).forEach((t) => {
      const pid = t.projectId;
      if (!taskMap.has(pid)) taskMap.set(pid, []);
      taskMap.get(pid)!.push(t);
    });

    return projects.map((p) => ({
      ...p,
      tasks: taskMap.get(p.id) ?? [],
    }));
  }

  // -------------------------------------------------------------------------
  // Get a single project (with ownership + tasks)
  // -------------------------------------------------------------------------
  async findOne(userId: string, id: string) {
    const res = (await this.supabase.client
      .from('Project')
      .select('id,name,description,ownerId,createdAt,updatedAt')
      .eq('id', id)
      .single()) as unknown as SimpleResult<Project>;

    if (res.error?.code === 'PGRST116' || !res.data)
      throw new NotFoundException('Project not found');
    if (res.error) throw new BadRequestException(res.error.message);
    if (res.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    const taskRes = (await this.supabase.client
      .from('Task')
      .select('*')
      .eq('projectId', id)) as unknown as SimpleResult<Task[]>;

    if (taskRes.error) throw new BadRequestException(taskRes.error.message);

    return { ...res.data, tasks: taskRes.data ?? [] };
  }

  // -------------------------------------------------------------------------
  // Update a project — only owner can update
  // -------------------------------------------------------------------------
  async update(userId: string, id: string, data: UpdateProjectDto) {
    // Step1–check ownership
    const result = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', id)
      .single()) as unknown as SimpleResult<{ ownerId: string }>;

    if (result.error?.code === 'PGRST116' || !result.data)
      throw new NotFoundException('Project not found');
    if (result.error) throw new BadRequestException(result.error.message);
    if (result.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    // Step2–apply patch
    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;

    if (Object.keys(patch).length > 0) {
      const updateRes = (await this.supabase.client
        .from('Project')
        .update(patch)
        .eq('id', id)
        .select('id')) as unknown as SimpleResult<Project>;

      if (updateRes.error)
        throw new BadRequestException(updateRes.error.message);
    }

    // Step3–return fresh entity
    return this.findOne(userId, id);
  }

  // -------------------------------------------------------------------------
  // Delete a project — only owner can delete
  // -------------------------------------------------------------------------
  async remove(userId: string, id: string) {
    const res = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', id)
      .single()) as unknown as SimpleResult<{ ownerId: string }>;

    if (res.error?.code === 'PGRST116' || !res.data)
      throw new NotFoundException('Project not found');
    if (res.error) throw new BadRequestException(res.error.message);
    if (res.data.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    const delRes = (await this.supabase.client
      .from('Project')
      .delete()
      .eq('id', id)
      .select('id,name,description,ownerId')
      .single()) as unknown as SimpleResult<Project>;

    if (delRes.error) throw new BadRequestException(delRes.error.message);
    return delRes.data;
  }
}
