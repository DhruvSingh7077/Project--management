import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { TaskService } from './task.service';
import { CreateTaskDto } from './dto/create-task.dto';
import { UpdateTaskDto } from './dto/update-task.dto';
import { Task } from './entities/task.entity'; // ✅ import here

@Controller('tasks')
export class TaskController {
  constructor(private readonly taskService: TaskService) {}

  @Post()
  create(@Body() dto: CreateTaskDto): Task {
    // ✅ Now TS knows what Task is
    return this.taskService.create(dto);
  }

  @Get()
  findAll(): Task[] {
    return this.taskService.findAll();
  }

  @Get(':id')
  findOne(@Param('id') id: string): Task | undefined {
    return this.taskService.findOne(id);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTaskDto,
  ): Task | undefined {
    return this.taskService.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id') id: string): Task | undefined {
    return this.taskService.remove(id);
  }
}
