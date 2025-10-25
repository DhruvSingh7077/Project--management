import {
  Injectable,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseService } from '../../supabase/supabase.service';

@Injectable()
export class ProjectMemberService {
  constructor(private readonly supabase: SupabaseService) {}

  // ▶ Add a member to a project
  async addMember(
    currentUserId: string,
    projectId: string,
    userId: string,
    role = 'member',
  ) {
    // Add logging to debug input
    console.log('Adding member with:', {
      currentUserId,
      projectId,
      userId,
      role,
    });

    // Check if userId is provided
    if (!userId) throw new BadRequestException('userId is required');

    // Verify current user owns the project
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
    if (project.data.ownerId !== currentUserId)
      throw new ForbiddenException('Only the project owner can add members');

    const insert = (await this.supabase.client
      .from('ProjectMember')
      .insert({ projectid: projectId, userid: userId, role })
      .select('projectId:projectid, userId:userid, role, createdAt:createdat')
      .single()) as unknown as {
      data: any;
      error: { message: string } | null;
    };

    if (insert.error) {
      console.log('Insert Error:', insert.error); // Log full error for debugging
      throw new BadRequestException(insert.error.message);
    }
    return insert.data;
  }

  // ▶ List all members of a project
  async listMembers(currentUserId: string, projectId: string) {
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
    if (project.data.ownerId !== currentUserId)
      throw new ForbiddenException('Access denied');

    const members = (await this.supabase.client
      .from('ProjectMember')
      .select('userId:userid, role, createdAt:createdat')
      .eq('projectid', projectId)) as unknown as {
      data: any[];
      error: { message: string } | null;
    }; 

    if (members.error) throw new BadRequestException(members.error.message);

    return members.data;
  }

  // ▶ Remove a member from a project
  async removeMember(currentUserId: string, projectId: string, userId: string) {
    const project = (await this.supabase.client
      .from('Project')
      .select('ownerId')
      .eq('id', projectId)
      .single()) as unknown as {
      data: { ownerId: string } | null;
      error: { message: string; code?: string } | null;
    };

    if (project.data?.ownerId !== currentUserId)
      throw new ForbiddenException('Only owner can remove members');

    const deleted = (await this.supabase.client
      .from('ProjectMember')
      .delete()
      .eq('projectid', projectId)
      .eq('userid', userId)) as unknown as {
      error: { message: string } | null;
    };
    if (deleted.error) throw new BadRequestException(deleted.error.message);

    return { message: 'Member removed successfully' };
  }
async changeRole(
  currentUserId: string,
  projectId: string,
  userId: string,
  role: 'member' | 'viewer',
) {
  if (!['member', 'viewer'].includes(role)) {
    throw new BadRequestException('Invalid role');
  }

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
  if (project.data.ownerId !== currentUserId)
    throw new ForbiddenException('Only owner can change roles');

  const updated = (await this.supabase.client
    .from('ProjectMember')
    .update({ role })
    .eq('projectid', projectId)
    .eq('userid', userId)
    .select('userId:userid, role, createdAt:createdat')
    .single()) as unknown as {
    data: any;
    error: { message: string } | null;
  };

  if (updated.error) throw new BadRequestException(updated.error.message);
  if (!updated.data) throw new NotFoundException('Membership not found');

  return updated.data;
}

}
