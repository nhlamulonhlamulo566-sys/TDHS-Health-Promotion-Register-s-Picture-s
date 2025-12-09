

export interface Department {
  id: string;
  name: string;
  icon: keyof typeof import('lucide-react')['icons'];
}

export interface Workflow {
  id: string;
  name: string;
  description: string;
  departmentIds: string[];
  initiatorId?: string;
}

export interface DocumentHistory {
  departmentId: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'Upcoming' | 'Completed';
  timestamp: string;
  notes?: string;
  fileUrl?: string; 
}

export interface Document {
  id: string;
  name: string;
  type: string;
  content: string;
  fileUrl: string;
  workflowId: string;
  currentStep: number;
  history: DocumentHistory[];
  status: 'In-Progress' | 'Completed' | 'Rejected';
  pendingDepartmentId?: string;
  initiatorId?: string;
  initiatorName?: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  persalNumber: string;
  role: 'Administrator' | "Sub - District 1A User's Controller" | "Sub - District 1B User's Controller" | "Sub - District 2 User's Controller" | "Sub - District 3 & 4 User's Controller" | "Sub - District 5 & 6 User's Controller" | "Sub - District 7 User's Controller" | 'Health Promoter' | 'TDHS';
  departmentId?: string;
  status?: 'Active' | 'Deleted';
}

export interface Notification {
    id: string;
    userId: string;
    message: string;
    timestamp: string;
    isRead: boolean;
}
