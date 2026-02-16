// Mock data for the CleanFlow application

export interface Zone {
  id: string;
  name: string;
  wing: string;
  floor: string;
  roomType: string;
}

export interface TaskTemplate {
  id: string;
  name: string;
  type: 'maintenance' | 'deep_clean';
  shift: 'morning' | 'evening';
  estimatedMinutes: number;
  zone: Zone;
}

export interface StaffMember {
  id: string;
  name: string;
  avatar: string;
  role: 'staff' | 'supervisor' | 'manager';
  status: 'active' | 'idle' | 'break' | 'offline';
  phone?: string;
  securityBadgeNumber?: string;
}

export interface TaskAssignment {
  id: string;
  staff: StaffMember;
  task: TaskTemplate;
  date: string;
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  startedAt?: string;
  completedAt?: string;
  elapsedMinutes?: number;
  progress: number; // 0-100
  issues?: string[];
  stockLow?: string[];
  isBreakFix?: boolean;
  breakFixImageUrl?: string;
  breakFixDescription?: string;
  priority?: 'normal' | 'urgent';
}

export interface AuditEntry {
  id: string;
  taskAssignment: TaskAssignment;
  ratings: {
    cleanliness: number;
    thoroughness: number;
    timeliness: number;
    supplies: number;
    safety: number;
  };
  notes?: string;
  createdAt: string;
}

export const mockZones: Zone[] = [
  { id: 'z1', name: 'Main Lobby', wing: 'A', floor: '1', roomType: 'Lobby' },
  { id: 'z2', name: 'Conference Room A1', wing: 'A', floor: '1', roomType: 'Meeting Room' },
  { id: 'z3', name: 'Restroom A1-M', wing: 'A', floor: '1', roomType: 'Restroom' },
  { id: 'z4', name: 'Cafeteria', wing: 'B', floor: '1', roomType: 'Dining' },
  { id: 'z5', name: 'Lab 201', wing: 'B', floor: '2', roomType: 'Laboratory' },
  { id: 'z6', name: 'Office Wing C', wing: 'C', floor: '2', roomType: 'Open Office' },
  { id: 'z7', name: 'Restroom B2-F', wing: 'B', floor: '2', roomType: 'Restroom' },
  { id: 'z8', name: 'Server Room', wing: 'A', floor: '3', roomType: 'Technical' },
];

export const mockStaff: StaffMember[] = [
  { id: 's1', name: 'שרה כהן', avatar: 'SC', role: 'staff', status: 'active', phone: '050-1234567', securityBadgeNumber: 'SEC-1001' },
  { id: 's2', name: 'דוד לוי', avatar: 'DL', role: 'staff', status: 'active', phone: '050-2345678', securityBadgeNumber: 'SEC-1002' },
  { id: 's3', name: 'מאיה כץ', avatar: 'MK', role: 'staff', status: 'break', phone: '050-3456789', securityBadgeNumber: 'SEC-1003' },
  { id: 's4', name: 'אורן מור', avatar: 'OM', role: 'staff', status: 'active', phone: '050-4567890', securityBadgeNumber: 'SEC-1004' },
  { id: 's5', name: 'נועה פרץ', avatar: 'NP', role: 'staff', status: 'idle', phone: '050-5678901', securityBadgeNumber: 'SEC-1005' },
  { id: 's6', name: 'יעל שפירא', avatar: 'YS', role: 'supervisor', status: 'active', phone: '050-6789012', securityBadgeNumber: 'SEC-2001' },
  { id: 's7', name: 'רון אביב', avatar: 'RA', role: 'staff', status: 'offline', phone: '050-7890123', securityBadgeNumber: 'SEC-1006' },
  { id: 's8', name: 'ליאת גולן', avatar: 'LG', role: 'staff', status: 'offline', phone: '050-8901234', securityBadgeNumber: 'SEC-1007' },
];

export const mockTasks: TaskTemplate[] = [
  { id: 't1', name: 'Quick Clean - Lobby', type: 'maintenance', shift: 'morning', estimatedMinutes: 20, zone: mockZones[0] },
  { id: 't2', name: 'Sanitize Conference Room', type: 'maintenance', shift: 'morning', estimatedMinutes: 15, zone: mockZones[1] },
  { id: 't3', name: 'Deep Clean Restroom', type: 'deep_clean', shift: 'evening', estimatedMinutes: 45, zone: mockZones[2] },
  { id: 't4', name: 'Cafeteria Full Service', type: 'deep_clean', shift: 'evening', estimatedMinutes: 60, zone: mockZones[3] },
  { id: 't5', name: 'Lab Sterilization', type: 'deep_clean', shift: 'evening', estimatedMinutes: 40, zone: mockZones[4] },
  { id: 't6', name: 'Office Vacuuming', type: 'maintenance', shift: 'morning', estimatedMinutes: 30, zone: mockZones[5] },
  { id: 't7', name: 'Restroom Quick Check', type: 'maintenance', shift: 'morning', estimatedMinutes: 10, zone: mockZones[6] },
  { id: 't8', name: 'Server Room Dusting', type: 'maintenance', shift: 'morning', estimatedMinutes: 25, zone: mockZones[7] },
];

export const mockAssignments: TaskAssignment[] = [
  { id: 'a1', staff: mockStaff[0], task: mockTasks[0], date: '2026-02-15', status: 'completed', startedAt: '07:05', completedAt: '07:22', elapsedMinutes: 17, progress: 100 },
  { id: 'a2', staff: mockStaff[0], task: mockTasks[1], date: '2026-02-15', status: 'in_progress', startedAt: '07:30', elapsedMinutes: 12, progress: 65 },
  { id: 'a3', staff: mockStaff[0], task: mockTasks[6], date: '2026-02-15', status: 'pending', progress: 0, isBreakFix: true, breakFixDescription: 'צינור דולף בשירותים קומה 2', breakFixImageUrl: '/placeholder.svg', priority: 'urgent' },
  { id: 'a4', staff: mockStaff[1], task: mockTasks[3], date: '2026-02-15', status: 'overdue', startedAt: '07:00', elapsedMinutes: 75, progress: 80, issues: ['Equipment malfunction'], priority: 'urgent' },
  { id: 'a5', staff: mockStaff[1], task: mockTasks[5], date: '2026-02-15', status: 'pending', progress: 0 },
  { id: 'a6', staff: mockStaff[2], task: mockTasks[2], date: '2026-02-15', status: 'pending', progress: 0 },
  { id: 'a7', staff: mockStaff[3], task: mockTasks[4], date: '2026-02-15', status: 'in_progress', startedAt: '07:15', elapsedMinutes: 35, progress: 70, stockLow: ['Soap', 'Paper Towels'], priority: 'urgent' },
  { id: 'a8', staff: mockStaff[4], task: mockTasks[7], date: '2026-02-15', status: 'pending', progress: 0 },
  { id: 'a9', staff: mockStaff[0], task: mockTasks[2], date: '2026-02-15', status: 'completed', startedAt: '09:10', completedAt: '09:30', elapsedMinutes: 20, progress: 100, isBreakFix: true, breakFixDescription: 'שפיכת מים בלובי', breakFixImageUrl: '/placeholder.svg' },
  { id: 'a10', staff: mockStaff[3], task: mockTasks[6], date: '2026-02-15', status: 'in_progress', startedAt: '10:00', elapsedMinutes: 15, progress: 50, isBreakFix: true, breakFixDescription: 'צינור דולף בשירותים' },
];
