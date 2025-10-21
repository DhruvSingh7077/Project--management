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
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';

@UseGuards(JwtAuthGuard)
@Controller('project')
export class ProjectController {
  constructor(private readonly projectService: ProjectService) {}

  @Post()
  async create(@User('id') userId: string, @Body() body: CreateProjectDto) {
    return this.projectService.create(userId, body);
  }

  @Get()
  async findAll(@User('id') userId: string) {
    return this.projectService.findAll(userId);
  }

  @Get(':id')
  async findOne(@User('id') userId: string, @Param('id') id: string) {
    return this.projectService.findOne(userId, id);
  }

  @Patch(':id')
  async update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() body: UpdateProjectDto,
  ) {
    return this.projectService.update(userId, id, body);
  }

  @Delete(':id')
  async remove(@User('id') userId: string, @Param('id') id: string) {
    return this.projectService.remove(userId, id);
  }
}
