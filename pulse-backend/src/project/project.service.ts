import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './dto';
import { SupabaseService } from '../supabase/supabase.service';

// PascalCase table/column names
const TABLES = {
  project: 'Project',
  task: 'Task',
  ownerId: 'ownerId',
  projectId: 'projectId',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt',
} as const;

@Injectable()
export class ProjectService {
  constructor(private readonly supabase: SupabaseService) {}

  // Create a new project for the logged-in user
  async create(userId: string, data: CreateProjectDto) {
    const { data: project, error } = await this.supabase.client
      .from(TABLES.project)
      .insert({
        name: data.name,
        description: data.description ?? null,
        [TABLES.ownerId]: userId,
      })
      .select(
        `id,name,description,${TABLES.ownerId},${TABLES.createdAt},${TABLES.updatedAt}`,
      )
      .single();

    if (error) throw new BadRequestException(error.message);
    return { ...project, tasks: [] };
  }

  // Get all projects belonging to the user (with tasks)
  async findAll(userId: string) {
    const { data: projects, error } = await this.supabase.client
      .from(TABLES.project)
      .select(
        `id,name,description,${TABLES.ownerId},${TABLES.createdAt},${TABLES.updatedAt}`,
      )
      .eq(TABLES.ownerId, userId)
      .order(TABLES.createdAt, { ascending: false });

    if (error) throw new BadRequestException(error.message);
    if (!projects?.length) return [];

    // Fetch tasks for all projects in one go
    const ids = projects.map((p) => p.id);
    const { data: tasks, error: tErr } = await this.supabase.client
      .from(TABLES.task)
      .select('*')
      .in(TABLES.projectId, ids);

    if (tErr) throw new BadRequestException(tErr.message);

    const byProject = new Map<string, any[]>();
    (tasks ?? []).forEach((t) => {
      const pid = t[TABLES.projectId];
      if (!byProject.has(pid)) byProject.set(pid, []);
      byProject.get(pid)!.push(t);
    });

    return projects.map((p) => ({
      ...p,
      tasks: byProject.get(p.id) ?? [],
    }));
  }

  // Get a single project by ID, ensuring ownership (with tasks)
  async findOne(userId: string, id: string) {
    const { data: project, error } = await this.supabase.client
      .from(TABLES.project)
      .select(
        `id,name,description,${TABLES.ownerId},${TABLES.createdAt},${TABLES.updatedAt}`,
      )
      .eq('id', id)
      .single();

    if (error?.code === 'PGRST116' || !project)
      throw new NotFoundException('Project not found');
    if (error) throw new BadRequestException(error.message);

    if (project[TABLES.ownerId] !== userId)
      throw new ForbiddenException('Access denied');

    const { data: tasks, error: tErr } = await this.supabase.client
      .from(TABLES.task)
      .select('*')
      .eq(TABLES.projectId, id);

    if (tErr) throw new BadRequestException(tErr.message);

    return { ...project, tasks: tasks ?? [] };
  }

  // Update a project — only owner can update
  async update(userId: string, id: string, data: UpdateProjectDto) {
    // Ownership check
    const { data: existing, error: findErr } = await this.supabase.client
      .from(TABLES.project)
      .select(TABLES.ownerId)
      .eq('id', id)
      .single();

    if (findErr?.code === 'PGRST116' || !existing)
      throw new NotFoundException('Project not found');
    if (findErr) throw new BadRequestException(findErr.message);
    if (existing[TABLES.ownerId] !== userId)
      throw new ForbiddenException('Access denied');

    const patch: Record<string, any> = {};
    if (data.name !== undefined) patch.name = data.name;
    if (data.description !== undefined) patch.description = data.description;

    if (Object.keys(patch).length) {
      const { error: updateErr } = await this.supabase.client
        .from(TABLES.project)
        .update(patch)
        .eq('id', id);
      if (updateErr) throw new BadRequestException(updateErr.message);
    }

    return this.findOne(userId, id);
  }

  // Delete a project — only owner can delete
  async remove(userId: string, id: string) {
    // Ownership check
    const { data: existing, error: findErr } = await this.supabase.client
      .from(TABLES.project)
      .select(TABLES.ownerId)
      .eq('id', id)
      .single();

    if (findErr?.code === 'PGRST116' || !existing)
      throw new NotFoundException('Project not found');
    if (findErr) throw new BadRequestException(findErr.message);
    if (existing[TABLES.ownerId] !== userId)
      throw new ForbiddenException('Access denied');

    const { data: deleted, error: delErr } = await this.supabase.client
      .from(TABLES.project)
      .delete()
      .eq('id', id)
      .select(`id,name,description,${TABLES.ownerId}`)
      .single();

    if (delErr) throw new BadRequestException(delErr.message);
    return deleted;
  }
}
