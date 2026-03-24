<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth';
	import type { Team } from '$lib/types';
	import {
		Settings,
		LogOut,
		ArrowLeft,
		Save,
		Calendar,
		Users,
		MapPin,
		Clock,
		CheckCircle2,
		AlertTriangle,
		BarChart3,
		Search,
		X,
		Trash2,
		Eye,
		EyeOff
	} from 'lucide-svelte';

	let user = $state<Team | null>(null);
	let hackathon = $state<any>(null);
	let hackathonId = $state<string>('');
	let loading = $state(true);
	let saving = $state(false);
	let saveSuccess = $state('');
	let saveError = $state('');
	let activeTab = $state<'dashboard' | 'settings'>('dashboard');
	let settingsActiveTab = $state<'Hackathon' | 'Activity' | 'Privacy' | 'Appearance'>('Hackathon');
	let searchQuery = $state('');

	// Hackathon appearance settings
	let hackathonTheme = $state('system');

	// Activity logs
	let flushing = $state(false);
	let flushError = $state('');
	let flushSuccess = $state('');

	// Privacy settings
	let blockInternetAccess = $state(false);
	let savingRestriction = $state(false);
	let restrictionError = $state('');
	let restrictionSuccess = $state('');

	// Hackathon settings
	let settings = $state({
		name: '',
		description: '',
		dateTime: '',
		duration: '',
		location: '',
		maxParticipants: '',
		allowLateRegistration: true,
		enableTeamChat: true,
		allowInternetAccess: true,
		autoBackupInterval: 30,
		maxProjectSize: 100,
		allowedFileTypes: '.js,.ts,.html,.css,.json,.md',
		submissionDeadline: '',
		judingCriteria: '',
		prizes: '',
		rules: '',
		agenda: '',
		specialInstructions: ''
	});

	const matchesSearch = (text: string) =>
		searchQuery === '' || text.toLowerCase().includes(searchQuery.toLowerCase());

	const isSearching = $derived(searchQuery.trim().length > 0);

	const showHackathon = $derived(
		!isSearching
			? settingsActiveTab === 'Hackathon'
			: matchesSearch('Hackathon') ||
					matchesSearch('Name') ||
					matchesSearch('Description') ||
					matchesSearch('Date') ||
					matchesSearch('Location')
	);

	const showActivity = $derived(
		!isSearching
			? settingsActiveTab === 'Activity'
			: matchesSearch('Activity') || matchesSearch('Logs') || matchesSearch('Flush')
	);

	const showPrivacy = $derived(
		!isSearching
			? settingsActiveTab === 'Privacy'
			: matchesSearch('Privacy') || matchesSearch('Data') || matchesSearch('Internet') || matchesSearch('Block')
	);

	const showAppearance = $derived(
		!isSearching
			? settingsActiveTab === 'Appearance'
			: matchesSearch('Appearance') || matchesSearch('Theme') || matchesSearch('Color')
	);

	onMount(() => {
		hackathonId = $page.params.id;

		if (browser) {
			// Load user session
			const stored = localStorage.getItem('sonar_session');
			if (stored) {
				try {
					user = JSON.parse(stored);
				} catch {
					goto('/login');
					return;
				}
			} else {
				goto('/login');
				return;
			}

			// Load hackathon data
			loadHackathon();

			// Load hackathon-specific theme
			const hackathonThemeKey = `hackathon-theme-${hackathonId}`;
			const storedTheme = localStorage.getItem(hackathonThemeKey);
			if (storedTheme) {
				hackathonTheme = storedTheme;
			}

			// Load hackathon-specific internet restriction
			const restrictionKey = `hackathon-internet-restriction-${hackathonId}`;
			const storedRestriction = localStorage.getItem(restrictionKey);
			if (storedRestriction) {
				blockInternetAccess = storedRestriction === 'true';
			}
		}
	});

	function loadHackathon() {
		const storedHackathons = localStorage.getItem('sonar_hackathons');
		if (storedHackathons) {
			try {
				const hackathons = JSON.parse(storedHackathons);
				const found = hackathons.find((h: any) => h.id === hackathonId);

				if (found) {
					hackathon = found;
					// Populate settings from hackathon data
					settings.name = found.name || '';
					settings.description = found.description || '';
					settings.dateTime = found.dateTime || '';
					settings.duration = found.duration || '';
					settings.location = found.location || '';
					settings.maxParticipants = found.maxParticipants?.toString() || '';
					settings.agenda = found.agenda || '';
					settings.specialInstructions = found.specialInstructions || '';
					settings.allowLateRegistration = found.allowLateRegistration ?? true;
					settings.enableTeamChat = found.enableTeamChat ?? true;
					settings.allowInternetAccess = found.allowInternetAccess ?? true;
					settings.autoBackupInterval = found.autoBackupInterval || 30;
					settings.maxProjectSize = found.maxProjectSize || 100;
					settings.allowedFileTypes = found.allowedFileTypes || '.js,.ts,.html,.css,.json,.md';
					settings.submissionDeadline = found.submissionDeadline || '';
					settings.judingCriteria = found.judingCriteria || '';
					settings.prizes = found.prizes || '';
					settings.rules = found.rules || '';
				} else {
					goto('/admin-panel');
					return;
				}
			} catch (e) {
				console.error('Failed to load hackathon', e);
				goto('/admin-panel');
				return;
			}
		} else {
			goto('/admin-panel');
			return;
		}
		loading = false;
	}

	async function saveSettings() {
		saving = true;
		saveError = '';
		saveSuccess = '';

		try {
			const updatedHackathon = {
				...hackathon,
				name: settings.name,
				description: settings.description,
				dateTime: settings.dateTime,
				duration: settings.duration,
				location: settings.location,
				maxParticipants: settings.maxParticipants ? parseInt(settings.maxParticipants) : null,
				agenda: settings.agenda,
				specialInstructions: settings.specialInstructions,
				allowLateRegistration: settings.allowLateRegistration,
				enableTeamChat: settings.enableTeamChat,
				allowInternetAccess: settings.allowInternetAccess,
				autoBackupInterval: settings.autoBackupInterval,
				maxProjectSize: settings.maxProjectSize,
				allowedFileTypes: settings.allowedFileTypes,
				submissionDeadline: settings.submissionDeadline,
				judingCriteria: settings.judingCriteria,
				prizes: settings.prizes,
				rules: settings.rules,
				lastModified: new Date().toISOString()
			};

			const storedHackathons = localStorage.getItem('sonar_hackathons');
			if (storedHackathons) {
				const hackathons = JSON.parse(storedHackathons);
				const index = hackathons.findIndex((h: any) => h.id === hackathonId);
				if (index !== -1) {
					hackathons[index] = updatedHackathon;
					localStorage.setItem('sonar_hackathons', JSON.stringify(hackathons));
					hackathon = updatedHackathon;
					saveSuccess = 'Settings saved successfully';
					setTimeout(() => {
						saveSuccess = '';
					}, 3000);
				}
			}
		} catch (error) {
			console.error('Error saving settings:', error);
			saveError = 'Failed to save settings';
		}

		saving = false;
	}

	function logout() {
		authStore.logout();
		goto('/login');
	}

	function goBack() {
		goto('/admin-panel');
	}

	async function handleFlushLogs() {
		if (
			!window.confirm(
				'Are you sure you want to flush all activity logs for this hackathon? This action cannot be undone.'
			)
		)
			return;
		flushing = true;
		flushError = '';
		flushSuccess = '';
		try {
			// Clear activity logs for this hackathon
			const logsKey = `hackathon-logs-${hackathonId}`;
			localStorage.removeItem(logsKey);
			flushSuccess = 'Activity logs have been flushed successfully';
			setTimeout(() => {
				flushSuccess = '';
			}, 3000);
		} catch (error) {
			flushError = 'Failed to flush activity logs';
			console.error(error);
		}
		flushing = false;
	}

	async function handleToggleRestriction(checked: boolean) {
		savingRestriction = true;
		restrictionError = '';
		restrictionSuccess = '';
		try {
			blockInternetAccess = checked;
			const restrictionKey = `hackathon-internet-restriction-${hackathonId}`;
			localStorage.setItem(restrictionKey, checked.toString());
			restrictionSuccess = checked
				? 'Internet blocking enabled for this hackathon'
				: 'Internet blocking disabled for this hackathon';
			setTimeout(() => {
				restrictionSuccess = '';
			}, 3000);
		} catch (error) {
			restrictionError = 'Failed to update restriction';
			console.error(error);
		}
		savingRestriction = false;
	}

	function handleThemeChange(e: Event) {
		const select = e.currentTarget as HTMLSelectElement;
		hackathonTheme = select.value;
		const hackathonThemeKey = `hackathon-theme-${hackathonId}`;
		localStorage.setItem(hackathonThemeKey, hackathonTheme);
	}
</script>

<svelte:head>
	<title>Manage {hackathon?.name || 'Hackathon'} - Sonar IDE</title>
</svelte:head>

{#if loading}
	<div class="loading-container">
		<div class="loading-spinner"></div>
		<p>Loading hackathon...</p>
	</div>
{:else}
	<div class="admin-panel-container">
		<!-- Vertical Sidebar -->
		<aside class="admin-sidebar">
			<div class="sidebar-header">
				<div class="sidebar-logo">
					<img src="/favicon.png" alt="Sonar Logo" class="logo-img" />
				</div>
				<h2>Sonar Admin</h2>
			</div>

			<nav class="sidebar-nav">
				<button class="nav-item back-btn" onclick={goBack}>
					<ArrowLeft size={20} />
					<span>Back to Admin</span>
				</button>

				<div class="nav-divider"></div>

				<button
					class="nav-item"
					class:active={activeTab === 'dashboard'}
					onclick={() => (activeTab = 'dashboard')}>
					<BarChart3 size={20} />
					<span>Dashboard</span>
				</button>
				<button
					class="nav-item"
					class:active={activeTab === 'settings'}
					onclick={() => (activeTab = 'settings')}>
					<Settings size={20} />
					<span>Settings</span>
				</button>
			</nav>

			<div class="hackathon-info-sidebar">
				<div class="hackathon-title">
					<h3>{hackathon.name}</h3>
					<span class="status-badge {hackathon.status}">{hackathon.status}</span>
				</div>
				<div class="hackathon-meta">
					<div class="meta-item">
						<Calendar size={14} />
						<span>{hackathon.dateTime ? new Date(hackathon.dateTime).toLocaleDateString() : 'Date not set'}</span>
					</div>
					<div class="meta-item">
						<Users size={14} />
						<span>{hackathon.participants || 0} participants</span>
					</div>
					<div class="meta-item">
						<MapPin size={14} />
						<span>{hackathon.location || 'Location not set'}</span>
					</div>
				</div>
			</div>

			<div class="sidebar-footer">
				<div class="user-info">
					<div class="user-avatar">{user?.teamName.charAt(0).toUpperCase() || 'A'}</div>
					<div class="user-details">
						<span class="user-name">{user?.teamName || 'Admin'}</span>
						<span class="user-role">Administrator</span>
					</div>
				</div>
				<button class="logout-btn" onclick={logout} title="Logout">
					<LogOut size={18} />
				</button>
			</div>
		</aside>

		<!-- Main Content Area -->
		<main class="admin-main-content">
			{#if activeTab === 'dashboard'}
				<div class="content-section">
					<div class="section-header">
						<h1>Hackathon Overview</h1>
						<p class="section-description">Dashboard for {hackathon.name}</p>
					</div>

					<div class="dashboard-grid">
						<!-- Event Status Card -->
						<div class="dashboard-card">
							<div class="card-header">
								<h3>Event Status</h3>
								<span class="status-icon status-{hackathon.status}"></span>
							</div>
							<div class="card-content">
								<div class="status-display">
									<span class="status-badge {hackathon.status}">{hackathon.status}</span>
								</div>
								<p class="card-description">Current status of the hackathon event</p>
							</div>
						</div>

						<!-- Participants Card -->
						<div class="dashboard-card">
							<div class="card-header">
								<h3>Participants</h3>
								<Users size={24} />
							</div>
							<div class="card-content">
								<div class="stat-number">
									{hackathon.participants || 0}
									{#if hackathon.maxParticipants}
										<span class="stat-max">/ {hackathon.maxParticipants}</span>
									{/if}
								</div>
								<p class="card-description">Total registered participants</p>
							</div>
						</div>

						<!-- Date & Time Card -->
						<div class="dashboard-card">
							<div class="card-header">
								<h3>Event Date</h3>
								<Calendar size={24} />
							</div>
							<div class="card-content">
								<div class="date-info">
									{#if hackathon.dateTime}
										<p class="date-display">
											{new Date(hackathon.dateTime).toLocaleDateString('en-US', {
												weekday: 'long',
												year: 'numeric',
												month: 'long',
												day: 'numeric'
											})}
										</p>
										<p class="time-display">
											{new Date(hackathon.dateTime).toLocaleTimeString('en-US', {
												hour: '2-digit',
												minute: '2-digit'
											})}
										</p>
									{:else}
										<p class="no-data">Date not set</p>
									{/if}
								</div>
							</div>
						</div>

						<!-- Location Card -->
						<div class="dashboard-card">
							<div class="card-header">
								<h3>Location</h3>
								<MapPin size={24} />
							</div>
							<div class="card-content">
								<p class="location-display">
									{hackathon.location || 'Location not set'}
								</p>
								<p class="card-description">Event venue</p>
							</div>
						</div>

						<!-- Duration Card -->
						<div class="dashboard-card">
							<div class="card-header">
								<h3>Duration</h3>
								<Clock size={24} />
							</div>
							<div class="card-content">
								<p class="duration-display">
									{hackathon.duration || 'Not specified'}
								</p>
								<p class="card-description">Expected event duration</p>
							</div>
						</div>

						<!-- Quick Stats Card -->
						<div class="dashboard-card wide">
							<div class="card-header">
								<h3>Quick Statistics</h3>
							</div>
							<div class="card-content">
								<div class="stats-list">
									<div class="stat-row">
										<span class="stat-label">Hackathon ID:</span>
										<span class="stat-value">{hackathon.id}</span>
									</div>
									<div class="stat-row">
										<span class="stat-label">Password:</span>
										<span class="stat-value password">{hackathon.password || 'Not set'}</span>
									</div>
									<div class="stat-row">
										<span class="stat-label">Max Project Size:</span>
										<span class="stat-value">{hackathon.maxProjectSize || 100} MB</span>
									</div>
									<div class="stat-row">
										<span class="stat-label">Backup Interval:</span>
										<span class="stat-value">{hackathon.autoBackupInterval || 30} minutes</span>
									</div>
								</div>
							</div>
						</div>
					</div>
				</div>
			{:else if activeTab === 'settings'}
				<div class="content-section settings-section">
					<div class="section-header">
						<h1>Settings</h1>
						<p class="section-description">Configure {hackathon.name} settings</p>
					</div>

					{#if saveSuccess}
						<div class="success-message">
							<CheckCircle2 size={16} />
							{saveSuccess}
						</div>
					{/if}

					{#if saveError}
						<div class="error-message">
							<AlertTriangle size={16} />
							{saveError}
						</div>
					{/if}

					<div class="settings-container">
						<div class="settings-searchbar-container">
							<div class="search-input-wrapper">
								<Search size={16} class="search-icon" />
								<input
									type="text"
									placeholder="Search settings"
									bind:value={searchQuery}
									class="settings-search-input"
								/>
								{#if searchQuery}
									<button class="clear-search" onclick={() => (searchQuery = '')}>
										<X size={14} />
									</button>
								{/if}
							</div>
						</div>

						<div class="settings-body">
							<div class="settings-sidebar">
								<ul class="settings-tree">
									<li>
										<button
											type="button"
											class="settings-tree-item"
											class:active={settingsActiveTab === 'Hackathon'}
											onclick={() => {
												settingsActiveTab = 'Hackathon';
												searchQuery = '';
											}}>
											Hackathon Settings
										</button>
									</li>
									<li>
										<button
											type="button"
											class="settings-tree-item"
											class:active={settingsActiveTab === 'Activity'}
											onclick={() => {
												settingsActiveTab = 'Activity';
												searchQuery = '';
											}}>
											Activity Logs
										</button>
									</li>
									<li>
										<button
											type="button"
											class="settings-tree-item"
											class:active={settingsActiveTab === 'Privacy'}
											onclick={() => {
												settingsActiveTab = 'Privacy';
												searchQuery = '';
											}}>
											Privacy
										</button>
									</li>
									<li>
										<button
											type="button"
											class="settings-tree-item"
											class:active={settingsActiveTab === 'Appearance'}
											onclick={() => {
												settingsActiveTab = 'Appearance';
												searchQuery = '';
											}}>
											Appearance
										</button>
									</li>
								</ul>
							</div>

							<div class="settings-content">
								<!-- Hackathon Settings Tab -->
								{#if showHackathon}
									<div class="settings-section-inner">
										<h2 class="settings-section-title">Hackathon Settings</h2>

										<div class="account-card">
											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Name</span></span>
												</div>
												<div class="setting-control">
													<input
														type="text"
														class="settings-search-input"
														bind:value={settings.name}
														placeholder="Enter hackathon name"
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Description</span></span>
												</div>
												<div class="setting-control">
													<textarea
														class="settings-search-input account-member-input"
														bind:value={settings.description}
														placeholder="Describe your hackathon"
														rows="3"
													></textarea>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Date & Time</span></span>
												</div>
												<div class="setting-control">
													<input
														type="datetime-local"
														class="settings-search-input"
														bind:value={settings.dateTime}
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Duration</span></span>
												</div>
												<div class="setting-control">
													<input
														type="text"
														class="settings-search-input"
														bind:value={settings.duration}
														placeholder="e.g., 48 hours"
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Location</span></span>
												</div>
												<div class="setting-control">
													<input
														type="text"
														class="settings-search-input"
														bind:value={settings.location}
														placeholder="Enter location"
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Max Participants</span></span>
												</div>
												<div class="setting-control">
													<input
														type="number"
														class="settings-search-input"
														bind:value={settings.maxParticipants}
														placeholder="Leave empty for unlimited"
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Allow Late Registration</span></span>
												</div>
												<div class="setting-control">
													<label class="checkbox-label">
														<input
															type="checkbox"
															class="checkbox-input"
															bind:checked={settings.allowLateRegistration}
														/>
													</label>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Enable Team Chat</span></span>
												</div>
												<div class="setting-control">
													<label class="checkbox-label">
														<input
															type="checkbox"
															class="checkbox-input"
															bind:checked={settings.enableTeamChat}
														/>
													</label>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Allow Internet Access</span></span>
												</div>
												<div class="setting-control">
													<label class="checkbox-label">
														<input
															type="checkbox"
															class="checkbox-input"
															bind:checked={settings.allowInternetAccess}
														/>
													</label>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Auto Backup Interval (minutes)</span></span>
												</div>
												<div class="setting-control">
													<input
														type="number"
														class="settings-search-input"
														bind:value={settings.autoBackupInterval}
														min="5"
														max="120"
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Max Project Size (MB)</span></span>
												</div>
												<div class="setting-control">
													<input
														type="number"
														class="settings-search-input"
														bind:value={settings.maxProjectSize}
														min="10"
														max="1000"
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Allowed File Types</span></span>
													<div class="setting-description">Comma-separated list of file extensions</div>
												</div>
												<div class="setting-control">
													<input
														type="text"
														class="settings-search-input"
														bind:value={settings.allowedFileTypes}
														placeholder=".js,.ts,.html,.css,.json,.md"
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Submission Deadline</span></span>
												</div>
												<div class="setting-control">
													<input
														type="datetime-local"
														class="settings-search-input"
														bind:value={settings.submissionDeadline}
													/>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Judging Criteria</span></span>
												</div>
												<div class="setting-control">
													<textarea
														class="settings-search-input account-member-input"
														bind:value={settings.judingCriteria}
														placeholder="Describe judging criteria"
														rows="3"
													></textarea>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Prizes</span></span>
												</div>
												<div class="setting-control">
													<textarea
														class="settings-search-input account-member-input"
														bind:value={settings.prizes}
														placeholder="List prizes and awards"
														rows="3"
													></textarea>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Rules & Guidelines</span></span>
												</div>
												<div class="setting-control">
													<textarea
														class="settings-search-input account-member-input"
														bind:value={settings.rules}
														placeholder="Event rules and guidelines"
														rows="4"
													></textarea>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Agenda</span></span>
												</div>
												<div class="setting-control">
													<textarea
														class="settings-search-input account-member-input"
														bind:value={settings.agenda}
														placeholder="Event schedule and agenda"
														rows="4"
													></textarea>
												</div>
											</div>

											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Special Instructions</span></span>
												</div>
												<div class="setting-control">
													<textarea
														class="settings-search-input account-member-input"
														bind:value={settings.specialInstructions}
														placeholder="Special instructions"
														rows="3"
													></textarea>
												</div>
											</div>

											<div class="account-signout">
												<button
													class="activity-log-btn primary"
													onclick={saveSettings}
													disabled={saving}
													style="align-self: flex-start; margin-top: 4px">
													<Save size={14} />
													{saving ? 'Saving...' : 'Save All Changes'}
												</button>
											</div>
										</div>
									</div>
								{/if}

								<!-- Activity Logs Tab -->
								{#if showActivity}
									<div class="settings-section-inner">
										<h2 class="settings-section-title">Activity Logs</h2>

										<div class="account-card">
											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"
														><span class="highlight">Flush Activity Logs</span></span
													>
												</div>
												<div class="setting-description">
													Clear all activity log data for this hackathon and reset local logs. New logs will be recorded from this point forward.
												</div>

												<div class="admin-password-form">
													<button
														class="activity-log-btn danger"
														onclick={handleFlushLogs}
														disabled={flushing}
														style="align-self: flex-start; margin-top: 4px"
													>
														<Trash2 size={14} />
														{flushing ? 'Flushing...' : 'Flush Logs'}
													</button>
												</div>
												{#if flushError}<div class="account-error">{flushError}</div>{/if}
												{#if flushSuccess}<div class="account-success">
														<CheckCircle2 size={12} />
														{flushSuccess}
													</div>{/if}
											</div>
										</div>
									</div>
								{/if}

								<!-- Privacy Tab -->
								{#if showPrivacy}
									<div class="settings-section-inner">
										<h2 class="settings-section-title">Privacy</h2>

										<div class="account-card">
											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"
														><span class="highlight">Internet Restriction</span></span
													>
												</div>
												<div class="setting-description">
													Control internet access restrictions for teams in this hackathon.
												</div>

												<div class="admin-password-form">
													<div class="setting-item" style="padding: 0; border: none">
														<div class="setting-header">
															<span class="setting-title" style="font-size: 13px; color: #d4d4d4"
																>Block Internet Access</span
															>
														</div>
														<div class="setting-description">
															If enabled, teams will be restricted from accessing the internet during this hackathon.
														</div>
														<div class="setting-control">
															<label class="checkbox-label">
																<input
																	type="checkbox"
																	class="checkbox-input"
																	checked={blockInternetAccess}
																	onchange={(e) => handleToggleRestriction(e.currentTarget.checked)}
																	disabled={savingRestriction}
																/>
															</label>
														</div>
													</div>
												</div>
												{#if restrictionError}<div class="account-error">{restrictionError}</div
													>{/if}
												{#if restrictionSuccess}<div class="account-success">
														<CheckCircle2 size={12} />
														{restrictionSuccess}
													</div>{/if}
											</div>
										</div>
									</div>
								{/if}

								<!-- Appearance Tab -->
								{#if showAppearance}
									<div class="settings-section-inner">
										<h2 class="settings-section-title">Appearance</h2>

										<div class="account-card">
											<div class="account-members-section">
												<div class="account-members-header">
													<span class="setting-title"><span class="highlight">Color Theme</span></span>
												</div>
												<div class="setting-description">
													Select the theme for this hackathon's interface or let it match your system.
												</div>

												<div class="setting-control">
													<select
														class="setting-select"
														value={hackathonTheme}
														onchange={handleThemeChange}
													>
														<option value="system">System Default</option>
														<option value="light">Light Theme</option>
														<option value="dark">Dark Theme</option>
													</select>
												</div>
											</div>
										</div>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>
			{/if}
		</main>
	</div>
{/if}

<style>
	@import '../../AdminPanel.css';

	.loading-container {
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		height: 100vh;
		gap: 16px;
		color: #d4d4d4;
	}

	.loading-spinner {
		width: 32px;
		height: 32px;
		border: 3px solid #333;
		border-top: 3px solid #007acc;
		border-radius: 50%;
		animation: spin 1s linear infinite;
	}

	@keyframes spin {
		0% { transform: rotate(0deg); }
		100% { transform: rotate(360deg); }
	}

	.nav-divider {
		height: 1px;
		background: #333;
		margin: 8px 0;
	}

	.back-btn {
		color: #007acc !important;
		border: 1px solid #007acc;
		background: transparent;
		margin-bottom: 8px;
	}

	.back-btn:hover {
		background: #007acc;
		color: white !important;
	}

	.hackathon-info-sidebar {
		padding: 20px 0;
		border-top: 1px solid #333;
		border-bottom: 1px solid #333;
		margin: 20px 0;
	}

	.hackathon-title {
		display: flex;
		flex-direction: column;
		gap: 8px;
		margin-bottom: 16px;
	}

	.hackathon-title h3 {
		margin: 0;
		color: #d4d4d4;
		font-size: 16px;
		font-weight: 600;
	}

	.hackathon-meta {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.meta-item {
		display: flex;
		align-items: center;
		gap: 8px;
		color: #888;
		font-size: 13px;
	}

	/* Dashboard Styles */
	.dashboard-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
		gap: 20px;
		margin-top: 20px;
	}

	.dashboard-card {
		background: #252526;
		border: 1px solid #3e3e42;
		border-radius: 8px;
		padding: 24px;
		transition: all 0.2s ease;
	}

	.dashboard-card:hover {
		border-color: #007acc;
		box-shadow: 0 4px 12px rgba(0, 122, 204, 0.15);
	}

	.dashboard-card.wide {
		grid-column: span 2;
	}

	.card-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 20px;
		padding-bottom: 12px;
		border-bottom: 1px solid #3e3e42;
	}

	.card-header h3 {
		margin: 0;
		color: #ffffff;
		font-size: 16px;
		font-weight: 600;
	}

	.card-header :global(svg) {
		color: #007acc;
		opacity: 0.7;
	}

	.card-content {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.status-display {
		margin: 8px 0;
	}

	.stat-number {
		font-size: 32px;
		font-weight: 700;
		color: #007acc;
		margin: 12px 0;
	}

	.stat-max {
		font-size: 18px;
		color: #888;
		margin-left: 8px;
	}

	.date-info {
		margin: 12px 0;
	}

	.date-display {
		font-size: 18px;
		font-weight: 600;
		color: #d4d4d4;
		margin: 0 0 4px 0;
	}

	.time-display {
		font-size: 14px;
		color: #888;
		margin: 0;
	}

	.location-display {
		font-size: 16px;
		font-weight: 500;
		color: #d4d4d4;
		margin: 12px 0 0 0;
	}

	.duration-display {
		font-size: 16px;
		font-weight: 500;
		color: #d4d4d4;
		margin: 12px 0 0 0;
	}

	.no-data {
		color: #888;
		font-style: italic;
	}

	.card-description {
		font-size: 13px;
		color: #888;
		margin: 0;
	}

	.status-icon {
		width: 12px;
		height: 12px;
		border-radius: 50%;
		display: inline-block;
	}

	.status-icon.status-draft {
		background: #ffc107;
	}

	.status-icon.status-active {
		background: #4caf50;
	}

	.status-icon.status-completed {
		background: #9c27b0;
	}

	.stats-list {
		display: flex;
		flex-direction: column;
		gap: 16px;
	}

	.stat-row {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 12px;
		background: #1e1e1e;
		border-radius: 4px;
	}

	.stat-label {
		color: #888;
		font-size: 13px;
		font-weight: 500;
	}

	.stat-value {
		color: #d4d4d4;
		font-size: 14px;
		font-weight: 600;
	}

	.stat-value.password {
		font-family: 'Courier New', monospace;
		background: #1a1a1a;
		padding: 4px 8px;
		border-radius: 3px;
	}

	.success-message,
	.error-message {
		display: flex;
		align-items: center;
		gap: 8px;
		padding: 12px 16px;
		border-radius: 4px;
		margin-bottom: 20px;
		font-size: 14px;
	}

	.success-message {
		background: #1e3a1e;
		color: #4caf50;
		border: 1px solid #2d5a2d;
		margin: 20px 32px 0 32px;
	}

	.error-message {
		background: #3a1e1e;
		color: #f44336;
		border: 1px solid #5a2d2d;
		margin: 20px 32px 0 32px;
	}

	@media (max-width: 768px) {
		.dashboard-card.wide {
			grid-column: span 1;
		}
	}
</style>