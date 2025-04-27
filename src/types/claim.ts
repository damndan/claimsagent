export interface MediaFile {
  id: string;
  name: string;
  type: 'image' | 'video';
  size: number;
  lastModified: number;
}

export interface Claim {
  id: string;
  customerName: string;
  date: string;
  status: 'New' | 'In Progress' | 'Completed' | 'Rejected' | 'Pending';
  description: string;
  mediaFiles: MediaFile[];
  summary: string;
  assessment: string;
  submitted: boolean;
  submittedAt?: string;
  approvedAt?: string;
  rejectedAt?: string;
} 