export interface Team {
	$id?: string;
	teamName: string;
	password?: string;
	role: 'team' | 'admin';
	studentIds?: string[];
	createdAt?: string;
}

export interface Session {
	$id?: string;
	teamId: string;
	teamName: string;
	status: 'online' | 'offline';
	lastSeen: string;
	ipAddress?: string;
}

export interface ActivityLog {
	$id?: string;
	teamId: string;
	teamName: string;
	currentWindow: string;
	currentFile: string;
	status: 'online' | 'offline';
	timestamp: string;
	event?: 'went_online' | 'went_offline' | 'heartbeat' | 'offline_sync';
	appName?: string;
	windowTitle?: string;
}

/** Accumulated sync data stored as JSON in ActivityLog.windowTitle */
export interface ActivitySyncData {
	sessionStart: string;
	heartbeatCount: number;
	apps: Record<string, number>; // appName → total seconds
	files: string[]; // unique files worked on
	windows: string[]; // unique windows seen
	statusChanges: number; // number of online↔offline transitions
	totalOnlineSec: number;
	totalOfflineSec: number;
	lastStatus: 'online' | 'offline';
	lastStatusAt: string;
	offlinePeriods: Array<{ from: string; to: string; duration: number }>;
	activityEvents?: Array<{ type: string; timestamp: string; details?: string }>;
}

export interface StatusEntry {
	status: 'online' | 'offline';
	from: string;
	to: string;
	duration: number;
}

export interface AppUsageEntry {
	appName: string;
	windowTitle: string;
	firstSeen: string;
	lastSeen: string;
	totalTime: number;
}

export interface Report {
	$id?: string;
	teamId: string;
	teamName: string;
	sessionStart: string;
	sessionEnd: string;
	generatedAt: string;
	reportData: string;
}

export interface ReportData {
	team: Team;
	sessionStart: string;
	sessionEnd: string;
	statusTimeline: StatusEntry[];
	appUsage: AppUsageEntry[];
	summary: {
		totalDuration: number;
		totalOnlineTime: number;
		totalOfflineTime: number;
		disconnections: number;
		longestOnlineStretch: number;
		percentOnline: number;
		percentInIDE: number;
		appSwitches: number;
	};
}

export interface HeartbeatPayload {
	teamName: string;
	teamId: string;
	currentWindow: string;
	currentFile: string;
	status: 'online' | 'offline';
	timestamp: string;
	appName?: string;
	activityEvents?: Array<{ type: string; timestamp: string; details?: string }>;
}

export interface TeamStatus extends Session {
	currentWindow?: string;
	currentFile?: string;
	lastActivity?: string;
	syncData?: ActivitySyncData;
}

export interface OfflineSyncSummary {
	offlineFrom: string;
	offlineTo: string;
	duration: number;
	logCount: number;
	apps: string[];
	files: string[];
	windows: string[];
	syncedAt: string;
}
