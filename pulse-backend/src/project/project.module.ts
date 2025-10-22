import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { SupabaseModule } from '../supabase/supabase.module';
import { ProjectMemberService } from './project-member/project-member.service';
import { ProjectMemberController } from './project-member/project-member.controller';

@Module({
  imports: [SupabaseModule],
  controllers: [ProjectController, ProjectMemberController],
  providers: [ProjectService, ProjectMemberService],
})
export class ProjectModule {}
