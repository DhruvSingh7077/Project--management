export interface Task {
  id: string;
  title: string;
  description?: string;
  status: string;
  priority: string;
  dueDate?: Date;
  createdAt: Date;
  updatedAt: Date;
  projectId?: string;
  assigneeId?: string;
}
