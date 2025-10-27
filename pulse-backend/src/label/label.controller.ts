import { Controller, Post, Get, Body, Param, UseGuards, Request, Delete } from '@nestjs/common';
import { LabelService } from './label.service';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';

@Controller('api')
@UseGuards(JwtAuthGuard)
export class LabelController {
  constructor(private readonly labelService: LabelService) {}

  @Post('projects/:projectId/labels')
  async createLabel(
    @Param('projectId') projectId: string,
    @Body() body: { name: string; color?: string },
    @Request() req: any
  ) {
    const userId = req.user.id;
    const label = await this.labelService.createLabel(projectId, userId, body.name, body.color);
    return { success: true, data: label };
  }

  @Get('projects/:projectId/labels')
  async listProjectLabels(
    @Param('projectId') projectId: string,
    @Request() req: any
  ) {
    const userId = req.user.id;
    const labels = await this.labelService.listLabelsByProject(projectId, userId);
    return { success: true, data: labels, count: labels.length };
  }

  @Post('tasks/:taskId/labels')
  async assignLabel(
    @Param('taskId') taskId: string,
    @Body() body: { labelId: string },
    @Request() req: any
  ) {
    const userId = req.user.id;
    await this.labelService.assignLabelToTask(taskId, body.labelId, userId);
    return { success: true, message: 'Label assigned to task' };
  }

  @Delete('tasks/:taskId/labels/:labelId')
  async removeLabel(
    @Param('taskId') taskId: string,
    @Param('labelId') labelId: string,
    @Request() req: any
  ) {
    const userId = req.user.id;
    await this.labelService.removeLabelFromTask(taskId, labelId, userId);
    return { success: true, message: 'Label removed from task' };
  }

  @Get('tasks/:taskId/labels')
  async listTaskLabels(
    @Param('taskId') taskId: string,
    @Request() req: any
  ) {
    const userId = req.user.id;
    const labels = await this.labelService.listLabelsForTask(taskId, userId);
    return { success: true, data: labels };
  }
}