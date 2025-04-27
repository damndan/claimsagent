export type UserRole = 'submitter' | 'approver';

export interface User {
  id: string;
  name: string;
  role: UserRole;
} 