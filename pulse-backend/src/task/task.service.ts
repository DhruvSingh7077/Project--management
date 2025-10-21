import { Injectable } from '@nestjs/common';
import { CreateTaskDto } from './dto/create-task.dto';
import { Task } from './entities/task.entity';
import { UpdateTaskDto } from './dto/update-task.dto';

@Injectable()
export class TaskService {
  private tasks: Task[] = [];

  create(dto: CreateTaskDto): Task {
    const task: Task = {
      id: (this.tasks.length + 1).toString(),
      title: dto.title,
      description: dto.description,
      status: dto.status ?? 'pending',
      priority: dto.priority ?? 'MEDIUM',
      dueDate: dto.dueDate ? new Date(dto.dueDate) : undefined,
      createdAt: new Date(),
      updatedAt: new Date(),
      projectId: dto.projectId,
      assigneeId: dto.assigneeId,
    };

    this.tasks.push(task);
    return task;
  }

  findAll(): Task[] {
    return this.tasks;
  }

  findOne(id: string): Task | undefined {
    return this.tasks.find((t) => t.id === id);
  }

  update(id: string, dto: UpdateTaskDto): Task | undefined {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    this.tasks[index] = {
      ...this.tasks[index],
      ...dto,
      dueDate: dto.dueDate ? new Date(dto.dueDate) : this.tasks[index].dueDate, // ✅ fix here
      updatedAt: new Date(),
    };

    return this.tasks[index];
  }

  remove(id: string): Task | undefined {
    const index = this.tasks.findIndex((t) => t.id === id);
    if (index === -1) return undefined;

    const deleted = this.tasks[index];
    this.tasks.splice(index, 1);
    return deleted;
  }
}
