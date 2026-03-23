<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth';
	import {
		getAllSessions,
		subscribeToActivityLogs,
		subscribeToSessions,
		getAllActivityLogs,
		getAdminTeamIds,
		parseSyncData
	} from '$lib/appwrite';
	import type { Session, ActivityLog, ActivitySyncData, TeamStatus, Team } from '$lib/types';
	import AdminSettingsModal from './AdminSettingsModal.svelte';
	import ReportModal from './ReportModal.svelte';
	import {
		Radar,
		Shield,
		Clock,
		Activity,
		LayoutGrid,
		List,
		Search,
		LogOut,
		RefreshCw,
		BarChart2,
		ShieldAlert,
		Monitor,
		Users,
		Zap,
		CheckCircle2,
		XCircle,
		Settings
	} from 'lucide-svelte';

	const HEARTBEAT_INTERVAL_MS = 15000 * 2; // 30 seconds

	let user = $state<Team | null>(null);
	let teams = $state<TeamStatus[]>([]);
	let activityLogs = $state<ActivityLog[]>([]);
	let loading = $state(true);
	let search = $state('');
	let lastUpdated = $state<Date | null>(null);
	let selectedTeam = $state<TeamStatus | null>(null);
	let showReport = $state(false);
	let sortKey = $state<'teamName' | 'status' | 'lastSeen'>('status');
	let sortDir = $state<'asc' | 'desc'>('asc');
	let statusFilter = $state<'all' | 'online' | 'offline'>('all');
	let viewMode = $state<'table' | 'grid'>('table');
	let showSettings = $state(false);
	let theme = $state('system');

	let unsubFunctions: Array<() => void> = [];
	let adminIds = $state(new Set<string>());
	let pollInterval: NodeJS.Timeout | null = null;
	let staleCheckInterval: NodeJS.Timeout | null = null;

	// Check auth on mount
	onMount(() => {
		if (browser) {
			const stored = localStorage.getItem('sonar_session');
			if (stored) {
				try {
					const parsedUser = JSON.parse(stored);
					user = parsedUser;
				} catch {
					// No session, but allow access for now
					user = { teamName: 'Admin', role: 'admin', $id: 'temp' } as Team;
				}
			} else {
				// Temporarily allow access without auth
				user = { teamName: 'Admin', role: 'admin', $id: 'temp' } as Team;
			}

			const storedTheme = localStorage.getItem('ide-theme') || 'system';
			theme = storedTheme;
			applyTheme(storedTheme);
		}

		loadSessions();
		setupSubscriptions();
		pollInterval = setInterval(loadSessions, 30000);
		staleCheckInterval = setInterval(() => {
			teams = applyStaleCheck(teams);
		}, 5000);
	});

	onDestroy(() => {
		if (browser) {
			unsubFunctions.forEach((fn) => fn());
			if (pollInterval) clearInterval(pollInterval);
			if (staleCheckInterval) clearInterval(staleCheckInterval);
		}
	});

	$effect(() => {
		if (browser) {
			applyTheme(theme);
			localStorage.setItem('ide-theme', theme);
		}
	});

	function applyTheme(t: string) {
		if (!browser) return;
		let activeTheme = t;
		if (t === 'system') {
			activeTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
		}
		document.documentElement.setAttribute('data-theme', activeTheme);
	}

	function applyStaleCheck(teamsList: TeamStatus[]): TeamStatus[] {
		const now = Date.now();
		return teamsList.map((s) => {
			const lastSeenMs = new Date(s.lastSeen).getTime();
			const stale = now - lastSeenMs > HEARTBEAT_INTERVAL_MS;
			if (stale && s.status === 'online') return { ...s, status: 'offline' as const };
			return s;
		});
	}

	async function loadSessions() {
		const [sessions, logs, adminIdSet] = await Promise.all([
			getAllSessions(),
			getAllActivityLogs(100),
			getAdminTeamIds()
		]);
		adminIds = adminIdSet;

		const syncMap = new Map<string, ActivitySyncData>();
		const logMetaMap = new Map<
			string,
			{ currentWindow?: string; currentFile?: string }
		>();
		for (const log of logs) {
			if (!syncMap.has(log.teamId)) {
				syncMap.set(log.teamId, parseSyncData(log));
				logMetaMap.set(log.teamId, {
					currentWindow: log.currentWindow,
					currentFile: log.currentFile
				});
			}
		}

		const now = Date.now();
		const fetched = sessions
			.filter((s) => !adminIds.has(s.teamId))
			.map((s) => {
				const lastSeenMs = new Date(s.lastSeen).getTime();
				const stale = now - lastSeenMs > HEARTBEAT_INTERVAL_MS;
				const meta = logMetaMap.get(s.teamId);
				return {
					...s,
					status: stale ? 'offline' : s.status,
					syncData: syncMap.get(s.teamId),
					currentWindow: meta?.currentWindow,
					currentFile: meta?.currentFile
				} as TeamStatus;
			});

		// Merge with existing to preserve realtime data
		const prevMap = new Map(teams.map((t) => [t.teamId, t]));
		teams = fetched.map((s) => {
			const existing = prevMap.get(s.teamId);
			if (!existing) return s;
			const existingMs = new Date(existing.lastSeen).getTime();
			const fetchedMs = new Date(s.lastSeen).getTime();
			if (existingMs > fetchedMs) {
				return {
					...s,
					lastSeen: existing.lastSeen,
					status: existing.status,
					currentWindow: existing.currentWindow || s.currentWindow,
					currentFile: existing.currentFile || s.currentFile,
					lastActivity: existing.lastActivity
				};
			}
			return {
				...s,
				currentWindow: s.currentWindow || existing.currentWindow,
				currentFile: s.currentFile || existing.currentFile,
				lastActivity: existing.lastActivity
			};
		});
		activityLogs = logs;
		lastUpdated = new Date();
		loading = false;
	}

	function setupSubscriptions() {
		const unsubActivity = subscribeToActivityLogs((log: ActivityLog) => {
			if (adminIds.has(log.teamId)) return;
			const sync = parseSyncData(log);
			teams = teams.map((t) => {
				if (t.teamId !== log.teamId) return t;
				return {
					...t,
					currentWindow: log.currentWindow || t.currentWindow,
					currentFile: log.currentFile || t.currentFile,
					status: 'online' as const,
					lastSeen: log.timestamp,
					lastActivity: log.timestamp,
					syncData: sync
				};
			});
			activityLogs = [log, ...activityLogs.filter((l) => l.teamId !== log.teamId)];
			lastUpdated = new Date();
		});

		const unsubSessions = subscribeToSessions((session: Session) => {
			if (adminIds.has(session.teamId)) return;
			const idx = teams.findIndex((t) => t.teamId === session.teamId);
			if (idx === -1) {
				teams = [...teams, session as TeamStatus];
			} else {
				teams = teams.map((t, i) => (i === idx ? { ...t, ...session } : t));
			}
			lastUpdated = new Date();
		});

		unsubFunctions = [unsubActivity, unsubSessions];
	}

	function logout() {
		authStore.logout();
		goto('/login');
	}

	// Computed values using $derived
	const onlineCount = $derived(teams.filter((t) => t.status === 'online').length);
	const offlineCount = $derived(teams.filter((t) => t.status === 'offline').length);
	const onlinePercent = $derived(
		teams.length > 0 ? Math.round((onlineCount / teams.length) * 100) : 0
	);

	const teamMetrics = $derived.by(() => {
		const metrics = new Map();
		for (const team of teams) {
			const sync = team.syncData;
			if (!sync) continue;
			const apps = Object.keys(sync.apps);
			let appBlurCount = 0;
			let extPasteCount = 0;
			let onlineEventCount = 0;
			let clipboardCopyCount = 0;
			const events = sync.activityEvents || [];
			for (const e of events) {
				if (e.type === 'app_blur') appBlurCount++;
				else if (e.type === 'clipboard_paste_external') extPasteCount++;
				else if (e.type === 'status_online') onlineEventCount++;
				else if (e.type === 'clipboard_copy') clipboardCopyCount++;
			}
			metrics.set(team.teamId, {
				totalLogs: sync.heartbeatCount,
				uniqueApps: new Set(apps),
				uniqueWindows: new Set(sync.windows),
				lastFile: sync.files.length > 0 ? sync.files[sync.files.length - 1] : '',
				lastWindow: sync.windows.length > 0 ? sync.windows[sync.windows.length - 1] : '',
				firstSeen: sync.sessionStart,
				lastSeen: sync.lastStatusAt,
				onlineSec: sync.totalOnlineSec,
				offlineSec: sync.totalOfflineSec,
				appBlurCount,
				extPasteCount,
				onlineCount: onlineEventCount,
				clipboardCopyCount,
				totalEvents: events.length
			});
		}
		return metrics;
	});

	const globalInsights = $derived.by(() => {
		const switchedAppCounts = new Map<string, number>();
		let totalOnlineSec = 0;
		let totalOfflineSec = 0;
		let totalHeartbeats = 0;
		for (const team of teams) {
			const sync = team.syncData;
			if (!sync) continue;
			totalHeartbeats += sync.heartbeatCount;
			totalOnlineSec += sync.totalOnlineSec;
			totalOfflineSec += sync.totalOfflineSec;
			for (const ev of sync.activityEvents || []) {
				if (ev.type === 'app_blur' && ev.details) {
					const m = ev.details.match(/^(?:Switched to|Active app):\s*(.+)$/i);
					if (m) {
						const raw = m[1].trim();
						const parts = raw.split(' - ');
						const appName = parts[parts.length - 1].trim() || raw;
						switchedAppCounts.set(appName, (switchedAppCounts.get(appName) || 0) + 1);
					}
				}
			}
		}
		const topApps = Array.from(switchedAppCounts.entries())
			.sort((a, b) => b[1] - a[1])
			.slice(0, 5);
		const fiveMinAgo = Date.now() - 5 * 60 * 1000;
		const recentlyActive = teams.filter((t) => new Date(t.lastSeen).getTime() > fiveMinAgo)
			.length;
		return { totalLogs: totalHeartbeats, uniqueApps: switchedAppCounts.size, topApps };
	});

	const filteredTeams = $derived.by(() => {
		let result = teams.filter(
			(t) => !search || t.teamName.toLowerCase().includes(search.toLowerCase())
		);
		if (statusFilter !== 'all') {
			result = result.filter((t) => t.status === statusFilter);
		}
		result.sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'teamName') cmp = a.teamName.localeCompare(b.teamName);
			else if (sortKey ===

 'status') cmp = a.status.localeCompare(b.status);
			else if (sortKey === 'lastSeen')
				cmp = new Date(a.lastSeen).getTime() - new Date(b.lastSeen).getTime();
			return sortDir === 'asc' ? cmp : -cmp;
		});
		return result;
	});

	function handleSort(key: 'teamName' | 'status' | 'lastSeen') {
		if (sortKey === key) sortDir = sortDir === 'asc' ? 'desc' : 'asc';
		else {
			sortKey = key;
			sortDir = 'asc';
		}
	}

	function formatTime(iso: string) {
		if (! iso) return '—';
		return new Date(iso).toLocaleTimeString();
	}

	function timeSince(iso: string) {
		if (!iso) return '—';
		const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
		if (diff < 60) return `${diff}s ago`;
		if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
		return `${Math.floor(diff / 3600)}h ago`;
	}

	function formatDuration(ms: number) {
		if (ms < 60000) return `${Math.round(ms / 1000)}s`;
		if (ms < 3600000) return `${Math.round(ms / 60000)}m`;
		const h = Math.floor(ms / 3600000);
		const m = Math.round((ms % 3600000) / 60000);
		return `${h}h ${m}m`;
	}

	function sortIcon(key: 'teamName' | 'status' | 'lastSeen') {
		if (sortKey !== key) return '↕';
		return sortDir === 'asc' ? '↑' : '↓';
	}

	function handleOpenReport(team: TeamStatus) {
		selectedTeam = team;
		showReport = true;
	}

	function handleTeamNameUpdated(newName: string) {
		if (user) {
			const updated = { ...user, teamName: newName };
			localStorage.setItem('sonar_session', JSON.stringify(updated));
			if (browser) window.location.reload();
		}
	}
</script>

<svelte:head>
	<title>Admin Dashboard - Sonar IDE</title>
</svelte:head>

<div class="admin-container">
	<div class="admin-header">
		<div class="admin-header-left">
			<div class="admin-logo">
				<span class="logo-icon-wrapper">
					<Radar class="logo-icon" size={20} />
				</span>
				<span class="logo-text">Sonar Admin</span>
			</div>
			<span class="admin-live-badge">
				<span class="live-dot" />
				Live System
			</span>
		</div>
		<div class="admin-header-right">
			{#if lastUpdated}
				<span class="last-updated">
					<Clock class="meta-icon" size={12} />
					{formatTime(lastUpdated.toISOString())}
				</span>
			{/if}
			<button
				class="admin-btn icon-btn"
				onclick={() => (showSettings = true)}
				title="Admin Settings"
			>
				<Settings size={14} />
			</button>
			<button
				class="admin-btn icon-btn"
				onclick={loadSessions}
				title="Refresh Data"
			>
				<RefreshCw size={14} class={loading ? 'anim-spin' : ''} />
			</button>
			<div class="admin-user-pill">
				<ShieldAlert size={14} class="user-icon" />
				{user?.teamName || 'Admin'}
			</div>
			<button class="admin-btn danger" onclick={logout}>
				<LogOut size={14} />
				Exit
			</button>
		</div>
	</div>

	<div class="admin-content">
		<!-- Top Analytics Row -->
		<div class="admin-metrics-section">
			<div class="metrics-row">
				<div class="stat-card">
					<div class="stat-card-header">
						<div class="stat-icon neutral"><Users size={16} /></div>
						<span class="stat-label">Total Teams Navigating</span>
					</div>
					<div class="stat-body">
						<span class="stat-value">{teams.length}</span>
					</div>
					<div class="stat-bar">
						<div
							class="stat-bar-fill neutral"
							style="width: 100%; background: rgba(255,255,255,0.1)"
						/>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-card-header">
						<div class="stat-icon online"><Zap size={16} /></div>
						<span class="stat-label">Currently Online</span>
					</div>
					<div class="stat-body">
						<span class="stat-value online">{onlineCount}</span>
					</div>
					<div class="stat-bar">
						<div class="stat-bar-fill online" style="width: {onlinePercent}%" />
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-card-header">
						<div class="stat-icon offline"><XCircle size={16} /></div>
						<span class="stat-label">Offline / Disconnected</span>
					</div>
					<div class="stat-body">
						<span class="stat-value offline">{offlineCount}</span>
					</div>
					<div class="stat-bar">
						<div
							class="stat-bar-fill offline"
							style="width: {teams.length ? (offlineCount / teams.length) * 100 : 0}%"
						/>
					</div>
				</div>

				<div class="stat-card">
					<div class="stat-card-header">
						<div class="stat-icon accent"><Activity size={16} /></div>
						<span class="stat-label">Total Events Caught</span>
					</div>
					<div class="stat-body">
						<span class="stat-value accent">{globalInsights.totalLogs}</span>
					</div>
					<div class="stat-bar">
						<div class="stat-bar-fill" style="width: 100%; background: var(--accent)" />
					</div>
				</div>
			</div>
		</div>

		<!-- Global Action Insights -->
		<div class="admin-insights-row">
			<div class="insight-card">
				<div class="insight-card-header">
					<div class="insight-title"><Monitor size={16} /> Top Distracting Apps Detected</div>
					<span class="insight-stat-pill">Platform Wide</span>
				</div>
				{#if globalInsights.topApps.length > 0}
					<div class="top-apps-list">
						{#each globalInsights.topApps as [app, count], idx}
							{@const isFlagged =
								app.toLowerCase().includes('discord') ||
								app.toLowerCase().includes('youtube') ||
								app.toLowerCase().includes('whatsapp')}
							{@const maxCount = globalInsights.topApps[0][1]}
							{@const pct = Math.round((count / maxCount) * 100)}
							<div class="top-app-item">
								<div class="top-app-header">
									<span class="top-app-name" class:flagged={isFlagged}>{app}</span>
									<span class="top-app-count">{count} switches</span>
								</div>
								<div class="top-app-bar">
									<div
										class="top-app-bar-fill"
										class:non-ide={isFlagged}
										style="width: {pct}%; background: {isFlagged
											? '#f59e0b'
											: 'rgba(255,255,255,0.2)'}"
									/>
								</div>
							</div>
						{/each}
					</div>
				{:else}
					<div class="insight-empty">
						<span style="opacity: 0.5">No off-IDE app switches detected yet</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Sticky Toolbar -->
		<div class="admin-controls-bar">
			<div class="controls-left">
				<div class="search-wrapper">
					<Search class="search-icon" size={16} />
					<input
						type="text"
						placeholder="Search candidates..."
						class="admin-search-input"
						bind:value={search}
					/>
				</div>
				<div class="filter-group">
					<button
						class="filter-btn"
						class:active={statusFilter === 'all'}
						onclick={() => (statusFilter = 'all')}
					>
						All <span class="filter-badge">{teams.length}</span>
					</button>
					<button
						class="filter-btn"
						class:active={statusFilter === 'online'}
						onclick={() => (statusFilter = 'online')}
					>
						Online <span class="filter-badge">{onlineCount}</span>
					</button>
					<button
						class="filter-btn"
						class:active={statusFilter === 'offline'}
						onclick={() => (statusFilter = 'offline')}
					>
						Offline <span class="filter-badge">{offlineCount}</span>
					</button>
				</div>
			</div>
			<div class="controls-right">
				<div class="view-toggle">
					<button
						class="view-btn"
						class:active={viewMode === 'table'}
						onclick={() => (viewMode = 'table')}
						title="List View"
					>
						<List size={16} />
					</button>
					<button
						class="view-btn"
						class:active={viewMode === 'grid'}
						onclick={() => (viewMode = 'grid')}
						title="Grid View"
					>
						<LayoutGrid size={16} />
					</button>
				</div>
			</div>
		</div>

		<!-- Dynamic Display Area -->
		<div class="admin-content-area">
			{#if loading}
				<div class="state-container">
					<RefreshCw class="anim-spin spinner-glow" size={32} />
					<span>Syncing telemetry stream...</span>
				</div>
			{:else if filteredTeams.length === 0}
				<div class="state-container">
					<ShieldAlert size={32} style="opacity: 0.3" />
					<span>No candidates match parameters.</span>
				</div>
			{:else if viewMode === 'table'}
				<!-- Table View -->
				<div class="glass-panel">
					<table class="modern-table">
						<thead>
							<tr>
								<th class="th-sortable" onclick={() => handleSort('teamName')}>
									<div class="th-content">
										Candidate {sortKey === 'teamName' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
									</div>
								</th>
								<th class="th-sortable" onclick={() => handleSort('status')}>
									<div class="th-content">
										Status {sortKey === 'status' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
									</div>
								</th>
								<th>Engagement Metrics</th>
								<th class="th-sortable" onclick={() => handleSort('lastSeen')}>
									<div class="th-content">
										Ping {sortKey === 'lastSeen' ? (sortDir === 'asc' ? '↑' : '↓') : ''}
									</div>
								</th>
								<th class="th-actions">Generate</th>
							</tr>
						</thead>
						<tbody>
							{#each filteredTeams as team (team.teamId)}
								{@const metrics = teamMetrics.get(team.teamId)}
								{@const riskLevel =
									metrics && metrics.appBlurCount > 10
										? 'high'
										: metrics && metrics.appBlurCount > 3
											? 'medium'
											: 'low'}
								<tr class="team-row {team.status}">
									<td>
										<div class="team-identity">
											<div class="team-avatar">{team.teamName.charAt(0).toUpperCase()}</div>
											<div class="team-info">
												<span class="team-name">{team.teamName}</span>
												<span class="team-window" title={team.currentWindow || 'Idle'}>
													{team.currentWindow || 'Awaiting window context'}
												</span>
											</div>
										</div>
									</td>
									<td>
										<div class="status-indicator {team.status}">
											<span class="pulse-disc" />
											{team.status === 'online' ? 'Active' : 'Disconnected'}
										</div>
									</td>
									<td>
										{#if metrics}
											<div class="metrics-cluster">
												<span
													class="metric-chip {metrics.appBlurCount > 0 ? 'warn' : 'clean'}"
													title="App Switches"
												>
													<Monitor size={12} />
													{metrics.appBlurCount}
												</span>
												<span class="metric-chip neutral" title="Total Events">
													<Activity size={12} />
													{metrics.totalEvents}
												</span>
												<span class="risk-badge {riskLevel}">
													{riskLevel === 'high'
														? 'High Risk'
														: riskLevel === 'medium'
															? 'Review'
															: 'Secure'}
												</span>
											</div>
										{:else}
											<span class="metric-chip clean">Assimilating...</span>
										{/if}
									</td>
									<td>
										<div class="time-display">
											<Clock size={12} />
											{formatTime(team.lastSeen)}
										</div>
									</td>
									<td class="td-actions">
										<button class="action-btn" onclick={() => handleOpenReport(team)}>
											<BarChart2 size={13} />
											Report
										</button>
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			{:else}
				<!-- Grid View -->
				<div class="modern-grid">
					{#each filteredTeams as team (team.teamId)}
						{@const metrics = teamMetrics.get(team.teamId)}
						<div class="grid-card {team.status}">
							<div class="grid-card-glow" />
							<div class="gc-header">
								<div class="gc-avatar">{team.teamName.charAt(0).toUpperCase()}</div>
								<div class="gc-title">
									<h4>{team.teamName}</h4>
									<div class="status-sm {team.status}">
										<span class="dot" />
										{team.status}
									</div>
								</div>
							</div>

							<div class="gc-body">
								<div class="gc-stat-row">
									<span class="gc-label">Active Window</span>
									<span class="gc-val truncate" title={team.currentWindow || 'N/A'}>
										{team.currentWindow || 'N/A'}
									</span>
								</div>
								<div class="gc-stat-row">
									<span class="gc-label">Active File</span>
									<span class="gc-val truncate" title={team.currentFile || 'N/A'}>
										{team.currentFile || 'N/A'}
									</span>
								</div>
								{#if metrics}
									<div class="gc-stat-row mt-4">
										<span class="gc-label">Away / Focus Loss</span>
										<span class="gc-val {metrics.appBlurCount > 3 ? 'warn' : ''}">
											{metrics.appBlurCount} events
										</span>
									</div>
								{/if}
							</div>

							<div class="gc-footer">
								<span class="gc-time"><Clock size={12} /> {formatTime(team.lastSeen)}</span>
								<button class="gc-btn" onclick={() => handleOpenReport(team)}>Report</button>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	{#if showReport && selectedTeam}
		<ReportModal
			team={selectedTeam}
			onClose={() => {
				showReport = false;
				selectedTeam = null;
			}}
		/>
	{/if}

	{#if showSettings && user}
		<AdminSettingsModal
			isOpen={showSettings}
			onClose={() => (showSettings = false)}
			{user}
			onLogout={logout}
			{theme}
			onThemeChange={(val) => (theme = val)}
			onTeamNameUpdated={handleTeamNameUpdated}
		/>
	{/if}
</div>

<style>
	@import './AdminDashboard.css';
</style>
