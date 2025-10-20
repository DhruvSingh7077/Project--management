import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';

import { User } from '@auth/user.decorator';
import { ProjectService } from '@project/project.service';

// DTOs (Data Transfer Objects)
class CreateProjectDto {
  name!: string;
  description?: string;
}

class UpdateProjectDto {
  name?: string;
  description?: string;
  status?: string;
}

@UseGuards(JwtAuthGuard)
@Controller('projects')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  /**
   * 🟢 Create a new project
   */
  @Post()
  async create(@User('id') userId: string, @Body() body: CreateProjectDto) {
    return this.projectService.create(userId, body);
  }

  /**
   * 🟣 Get all projects for the logged-in user
   */
  @Get()
  async findAll(@User('id') userId: string) {
    return this.projectService.findAll(userId);
  }

  /**
   * 🔵 Get one project by ID (owned by user)
   */
  @Get(':id')
  async findOne(@User('id') userId: string, @Param('id') id: string) {
    return this.projectService.findOne(userId, id);
  }

  /**
   * 🟠 Update project info
   */
  @Patch(':id')
  async update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectService.update(userId, id, body);
  }

  /**
   * 🔴 Delete project
   */
  @Delete(':id')
  async remove(@User('id') userId: string, @Param('id') id: string) {
    return this.projectService.remove(userId, id);
  }
}
