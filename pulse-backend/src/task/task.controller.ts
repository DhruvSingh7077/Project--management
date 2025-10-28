import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt/jwt.guard';
import { User } from '@auth/user.decorator';
import { TaskService } from './task.service';
import { MoveTaskDto } from './dto/move-task.dto';
import { ReorderTasksDto } from './dto/reorder-tasks.dto';

@UseGuards(JwtAuthGuard)
@Controller('task')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  // ▶  Create a task inside a specific project
  @Post(':projectId')
  async create(
    @User('id') userId: string,
    @Param('projectId') projectId: string,
    @Body() dto: any,
  ) {
    return this.taskService.create(userId, projectId, dto);
  }

  // ▶  Get all tasks belonging to a project
  @Get(':projectId')
  async findAll(
    @User('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.taskService.findAll(userId, projectId);
  }

  // ▶  Update a task by its id
  @Patch(':id')
  async update(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body() dto: any,
  ) {
    return this.taskService.update(userId, id, dto);
  }

  // ▶  Change only the status of a task
  @Patch(':id/status')
  async changeStatus(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body('status') status: string,
  ) {
    return this.taskService.update(userId, id, { status });
  }

  // ▶  Assign the task to a user
  @Patch(':id/assign')
  async assignTask(
    @User('id') userId: string,
    @Param('id') id: string,
    @Body('assigneeId') assigneeId: string,
  ) {
    return this.taskService.update(userId, id, { assigneeId });
  }

  // ▶  Delete a task by its id
  @Delete(':id')
  async remove(@User('id') userId: string, @Param('id') id: string) {
    return this.taskService.remove(userId, id);
  }

  // Board view - group all tasks by status
  @Get(':projectId/board')
  async getBoard(
    @User('id') userId: string,
    @Param('projectId') projectId: string,
  ) {
    return this.taskService.getBoard(userId, projectId);
  }

  @Patch('tasks/:taskId/move')
  async moveTask(
    @Param('taskId') taskId: string,
    @Body() body: MoveTaskDto,
    @Request() req: any
  ) {
    const userId = req.user.id;
    await this.taskService.moveTask(taskId, userId, body.toStatus, body.toPosition);
    return { success: true, message: 'Task moved' };
  }

  @Post('tasks/reorder')
  async reorderTasks(
    @Body() body: ReorderTasksDto,
    @Request() req: any
  ) {
    const userId = req.user.id;
    await this.taskService.reorderTasks(userId, body.updates);
    return { success: true, message: 'Tasks reordered' };
  }
}
