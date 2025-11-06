export class ReorderUpdate {
  taskId!: string;
  toPosition!: number;
  toStatus!: string;
}

export class ReorderTasksDto {
  updates!: ReorderUpdate[];
}