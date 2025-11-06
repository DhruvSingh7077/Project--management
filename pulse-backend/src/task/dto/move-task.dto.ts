export class MoveTaskDto {
  toStatus!: string; // destination column/status (e.g. "todo", "inprogress", "done")
  toPosition!: number; // 0-based index within destination column
}