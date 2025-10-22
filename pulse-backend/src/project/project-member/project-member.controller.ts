import {
  Controller,
  Post,
  Get,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../auth/jwt/jwt.guard';
import { User } from '@auth/user.decorator';
import { ProjectMemberService } from './project-member.service';

@UseGuards(JwtAuthGuard)
@Controller('project/:projectId/member')
export class ProjectMemberController {
  constructor(private readonly memberService: ProjectMemberService) {}

  // ➕ Add a new member
  @Post()
  async addMember(
    @User('id') currentUserId: string,
    @Param('projectId') projectId: string,
    @Body('userId') userId: string,
    @Body('role') role: string,
  ) {
    return this.memberService.addMember(currentUserId, projectId, userId, role);
  }

  // 👥 List all project members
  @Get()
  async listMembers(
    @User('id') currentUserId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.memberService.listMembers(currentUserId, projectId);
  }

  // ❌ Remove a member
  @Delete(':userId')
  async removeMember(
    @User('id') currentUserId: string,
    @Param('projectId') projectId: string,
    @Param('userId') userId: string,
  ) {
    return this.memberService.removeMember(currentUserId, projectId, userId);
  }
}
