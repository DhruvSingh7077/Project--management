import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { CreateProjectDto, UpdateProjectDto } from './dto';

import { PrismaService } from '../prisma.service';

@Injectable()
export class ProjectService {
  constructor(private prisma: PrismaService) {}

  /**
   * Create a new project for the logged-in user
   */
  async create(userId: string, data: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        name: data.name,
        description: data.description,
        ownerId: userId,
      },
    });
  }

  /**
   * Get all projects belonging to the user
   */
  async findAll(userId: string) {
    return this.prisma.project.findMany({
      where: { ownerId: userId },
      include: { tasks: true },
    });
  }

  /**
   * Get a single project by ID, ensuring ownership
   */
  async findOne(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({
      where: { id },
      include: { tasks: true },
    });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    return project;
  }

  /**
   * Update a project — only owner can update
   */
  async update(userId: string, id: string, data: UpdateProjectDto) {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.project.update({
      where: { id },
      data,
    });
  }

  /**
   * Delete a project — only owner can delete
   */
  async remove(userId: string, id: string) {
    const project = await this.prisma.project.findUnique({ where: { id } });

    if (!project) throw new NotFoundException('Project not found');
    if (project.ownerId !== userId)
      throw new ForbiddenException('Access denied');

    return this.prisma.project.delete({
      where: { id },
    });
  }
}
