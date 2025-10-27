import { Injectable, BadRequestException, NotFoundException, ForbiddenException } from '@nestjs/common';
import { SupabaseService } from '../supabase/supabase.service';

@Injectable()
export class LabelService {
  constructor(private readonly supabaseService: SupabaseService) {}

  private get supabase() {
    return this.supabaseService.client;
  }

  // verify user is a member of project
  private async verifyProjectAccess(projectId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('Project')
      .select('id, ProjectMember!inner(userid)')
      .eq('id', projectId)
      .eq('ProjectMember.userid', userId)
      .single();

    if (error || !data) throw new ForbiddenException('Project not found or access denied');
  }

  // verify user has access to the task (via project membership)
  private async verifyTaskAccess(taskId: string, userId: string) {
    const { data, error } = await this.supabase
      .from('Task')
      .select(`
        id,
        projectId,
        Project!inner (
          id,
          ProjectMember!inner ( userid )
        )
      `)
      .eq('id', taskId)
      .eq('Project.ProjectMember.userid', userId)
      .single();

    if (error || !data) throw new ForbiddenException('Task not found or access denied');
    return data;
  }

  async createLabel(projectId: string, userId: string, name: string, color?: string) {
    await this.verifyProjectAccess(projectId, userId);

    const { data, error } = await this.supabase
      .from('label')
      .insert({ project_id: projectId, name: name.trim(), color: color ?? '#cccccc' })
      .select('*')
      .single();

    if (error || !data) throw new BadRequestException(error?.message ?? 'Failed to create label');
    return data;
  }

  async listLabelsByProject(projectId: string, userId: string) {
    await this.verifyProjectAccess(projectId, userId);

    const { data, error } = await this.supabase
      .from('label')
      .select('id, name, color, created_at')
      .eq('project_id', projectId)
      .order('created_at', { ascending: true });

    if (error) throw new BadRequestException(error.message);
    return data || [];
  }

  async assignLabelToTask(taskId: string, labelId: string, userId: string) {
    // ensure user has access to the task (and thus project)
    const task = await this.verifyTaskAccess(taskId, userId);
    // ensure label exists and belongs to same project
    const { data: label, error: labelErr } = await this.supabase
      .from('label')
      .select('id, project_id')
      .eq('id', labelId)
      .single();

    if (labelErr || !label) throw new NotFoundException('Label not found');

    if (label.project_id !== task.projectId) {
      throw new BadRequestException('Label does not belong to task project');
    }

    // avoid duplicate
    const { data: exists } = await this.supabase
      .from('task_label')
      .select('*')
      .eq('task_id', taskId)
      .eq('label_id', labelId)
      .single();

    if (exists) return true;

    const { error } = await this.supabase
      .from('task_label')
      .insert({ task_id: taskId, label_id: labelId });

    if (error) throw new BadRequestException(error.message);
    return true;
  }

  async removeLabelFromTask(taskId: string, labelId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const { error } = await this.supabase
      .from('task_label')
      .delete()
      .eq('task_id', taskId)
      .eq('label_id', labelId);

    if (error) throw new BadRequestException(error.message);
    return true;
  }

  async listLabelsForTask(taskId: string, userId: string) {
    await this.verifyTaskAccess(taskId, userId);

    const { data, error } = await this.supabase
      .from('task_label')
      .select('label ( id, name, color )')
      .eq('task_id', taskId);

    if (error) throw new BadRequestException(error.message);
    return (data || []).map((r: any) => r.label);
  }
}