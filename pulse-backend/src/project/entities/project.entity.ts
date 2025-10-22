// src/project/entities/project.entity.ts
export class Project {
  id!: string;
  name!: string;
  description?: string;
  ownerId!: string;
  createdAt?: string;
  updatedAt?: string;
}
export interface Task {
  id: string;
  name: string;
  projectId: string;
  [key: string]: any;
}
