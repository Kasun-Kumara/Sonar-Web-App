<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { browser } from '$app/environment';
	import { authStore } from '$lib/stores/auth';
	import {
		updateTeamName,
		updateTeamPassword,
		flushAllActivityLogs,
		getGlobalInternetRestriction,
		setGlobalInternetRestriction
	} from '$lib/appwrite';
	import type { Team } from '$lib/types';
	import {
		LayoutDashboard,
		Settings,
		LogOut,
		Plus,
		Calendar,
		Users,
		MapPin,
		Eye,
		EyeOff,
		Key,
		CheckCircle2,
		Trash2,
		Search,
		X
	} from 'lucide-svelte';
	import CreateHackathonDrawer from './CreateHackathonDrawer.svelte';

	let user = $state<Team | null>(null);
	let theme = $state('system');
	let activeTab = $state<'dashboard' | 'hackathons' | 'settings'>('dashboard');
	let hackathons = $state<any[]>([]);
	let showCreateDrawer = $state(false);

	// Settings state
	let searchQuery = $state('');
	let settingsActiveTab = $state('Account');
	let editingName = $state(false);
	let newTeamName = $state('');
	let nameError = $state('');
	let nameSuccess = $state('');
	let savingName = $state(false);

	let oldPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let savingPassword = $state(false);
	let showOldPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	let flushing = $state(false);
	let flushError = $state('');
	let flushSuccess = $state('');

	let globalRestriction = $state(false);
	let savingRestriction = $state(false);
	let restrictionError = $state('');
	let restrictionSuccess = $state('');

	onMount(() => {
		if (browser) {
			const stored = localStorage.getItem('sonar_session');
			if (stored) {
				try {
					user = JSON.parse(stored);
				} catch {
					// Auto-login with test credentials
					user = {
						teamName: 'Test Admin',
						role: 'admin',
						$id: 'test-admin-001',
						email: 'admin@test.com'
					} as Team;
					localStorage.setItem('sonar_session', JSON.stringify(user));
				}
			} else {
				// Auto-login with test credentials for development
				user = {
					teamName: 'Test Admin',
					role: 'admin',
					$id: 'test-admin-001',
					email: 'admin@test.com'
				} as Team;
				localStorage.setItem('sonar_session', JSON.stringify(user));
			}

			const storedTheme = localStorage.getItem('ide-theme') || 'system';
			theme = storedTheme;
			applyTheme(storedTheme);

			const storedHackathons = localStorage.getItem('sonar_hackathons');
			if (storedHackathons) {
				try {
					hackathons = JSON.parse(storedHackathons);
				} catch (e) {
					console.error('Failed to load hackathons', e);
				}
			}
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

	function logout() {
		authStore.logout();
		goto('/login');
	}

	const matchesSearch = (text: string) =>
		searchQuery === '' || text.toLowerCase().includes(searchQuery.toLowerCase());

	const isSearching = $derived(searchQuery.trim().length > 0);

	const showAccount = $derived(
		!isSearching
			? settingsActiveTab === 'Account'
			: matchesSearch('Account') ||
					matchesSearch('Team') ||
					matchesSearch('Name') ||
					matchesSearch('Password') ||
					matchesSearch('Sign Out')
	);

	const showActivityLogs = $derived(
		!isSearching
			? settingsActiveTab === 'Activity Logs'
			: matchesSearch('Flush') || matchesSearch('Activity') || matchesSearch('Logs')
	);

	const showPrivacy = $derived(
		!isSearching
			? settingsActiveTab === 'Privacy'
			: matchesSearch('Privacy') ||
					matchesSearch('Block') ||
					matchesSearch('Internet') ||
					matchesSearch('Restriction')
	);

	const showAppearance = $derived(
		!isSearching
			? settingsActiveTab === 'Appearance'
			: matchesSearch('Appearance') ||
					matchesSearch('Color Theme') ||
					matchesSearch('interface theme')
	);

	async function handleSaveName() {
		const trimmed = newTeamName.trim();
		if (!trimmed) {
			nameError = 'Team name cannot be empty';
			return;
		}
		if (!user?.$id) return;
		if (trimmed === user.teamName) {
			editingName = false;
			return;
		}

		savingName = true;
		nameError = '';
		nameSuccess = '';
		const result = await updateTeamName(user.$id, trimmed);
		if (result.success) {
			nameSuccess = 'Team name updated successfully';
			editingName = false;
			handleTeamNameUpdated(trimmed);
		} else {
			nameError = result.error || 'Failed to update team name';
		}
		savingName = false;
	}

	async function handleChangePassword() {
		passwordError = '';
		passwordSuccess = '';

		if (!oldPassword) {
			passwordError = 'Please enter your current password';
			return;
		}
		if (!newPassword) {
			passwordError = 'Please enter a new password';
			return;
		}
		if (newPassword.length < 4) {
			passwordError = 'New password must be at least 4 characters';
			return;
		}
		if (newPassword !== confirmPassword) {
			passwordError = 'New passwords do not match';
			return;
		}
		if (!user?.$id) return;

		savingPassword = true;
		const result = await updateTeamPassword(user.$id, oldPassword, newPassword);
		if (result.success) {
			passwordSuccess = 'Password updated successfully';
			oldPassword = '';
			newPassword = '';
			confirmPassword = '';
		} else {
			passwordError = result.error || 'Failed to update password';
		}
		savingPassword = false;
	}

	async function handleFlushLogs() {
		if (
			!window.confirm(
				'Are you sure you want to flush all activity logs? This action cannot be undone.'
			)
		)
			return;
		flushing = true;
		flushError = '';
		flushSuccess = '';
		const result = await flushAllActivityLogs();
		if (result.success) {
			flushSuccess = 'All activity logs have been flushed successfully';
		} else {
			flushError = result.error || 'Failed to flush activity logs';
		}
		flushing = false;
	}

	async function handleToggleRestriction(checked: boolean) {
		savingRestriction = true;
		restrictionError = '';
		restrictionSuccess = '';
		const result = await setGlobalInternetRestriction(checked);
		if (result.success) {
			globalRestriction = checked;
			restrictionSuccess = checked
				? 'Internet blocking enabled for all teams'
				: 'Internet blocking disabled for all teams';
			setTimeout(() => {
				restrictionSuccess = '';
			}, 3000);
		} else {
			restrictionError = result.error || 'Failed to update restriction';
		}
		savingRestriction = false;
	}

	function handleTeamNameUpdated(newName: string) {
		if (user) {
			const updated = { ...user, teamName: newName };
			localStorage.setItem('sonar_session', JSON.stringify(updated));
			if (browser) window.location.reload();
		}
	}

	$effect(() => {
		if (activeTab === 'settings') {
			settingsActiveTab = 'Account';
			searchQuery = '';
			newTeamName = user?.teamName || '';
			editingName = false;
			nameError = '';
			nameSuccess = '';
			oldPassword = '';
			newPassword = '';
			confirmPassword = '';
			passwordError = '';
			passwordSuccess = '';
			flushError = '';
			flushSuccess = '';
			globalRestriction = false;
			restrictionError = '';
			restrictionSuccess = '';
			if (user?.role === 'admin') {
				getGlobalInternetRestriction()
					.then((result) => {
						globalRestriction = result;
					})
					.catch(console.error);
			}
		}
	});

	function handleSaveHackathon(hackathonData: any) {
		hackathons = [hackathonData, ...hackathons];
		// Optional: Persist to local storage for demo purposes
		if (browser) {
			localStorage.setItem('sonar_hackathons', JSON.stringify(hackathons));
		}
	}
</script>

<svelte:head>
	<title>Admin Panel - Sonar IDE</title>
</svelte:head>

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
			<button
				class="nav-item"
				class:active={activeTab === 'dashboard'}
				onclick={() => (activeTab = 'dashboard')}
			>
				<LayoutDashboard size={20} />
				<span>Dashboard</span>
			</button>
			<button
				class="nav-item"
				class:active={activeTab === 'hackathons'}
				onclick={() => (activeTab = 'hackathons')}
			>
				<MapPin size={20} />
				<span>Hackathons</span>
			</button>
			<button
				class="nav-item"
				class:active={activeTab === 'settings'}
				onclick={() => (activeTab = 'settings')}
			>
				<Settings size={20} />
				<span>Settings</span>
			</button>
		</nav>

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
					<h1>Dashboard</h1>
					<p class="section-description">Welcome to your admin dashboard</p>
				</div>
				<div class="dashboard-blank">
					<div class="blank-state">
						<LayoutDashboard size={48} style="opacity: 0.3;" />
						<p>Dashboard content coming soon...</p>
					</div>
				</div>
			</div>
		{:else if activeTab === 'hackathons'}
			<div class="content-section hackathons-section">
				<div class="section-header">
					<h1>Hackathons</h1>
					<p class="section-description">Manage your hackathon events</p>
				</div>

				{#if hackathons.length === 0}
					<div class="hackathons-empty-state">
						<div class="empty-state-card">
							<MapPin size={64} style="opacity: 0.2;" />
							<h2>No hackathons yet</h2>
							<p>Create your first hackathon to get started with organizing events</p>
							<button class="create-hackathon-btn primary" onclick={() => (showCreateDrawer = true)}>
								<Plus size={20} />
								Create Your First Hackathon
							</button>
						</div>
					</div>
				{:else}
					<div class="hackathons-header">
						<button class="create-hackathon-btn" onclick={() => (showCreateDrawer = true)}>
							<Plus size={20} />
							Create New Hackathon
						</button>
					</div>

					<div class="hackathons-grid">
						{#each hackathons as hackathon}
							<div class="hackathon-card">
								<div class="hackathon-card-header">
									<h3>{hackathon.name}</h3>
									<span class="status-badge {hackathon.status}">{hackathon.status}</span>
								</div>
								<div class="hackathon-card-body">
									{#if hackathon.dateTime}
										<div class="hackathon-info">
											<Calendar size={16} />
											<span>{new Date(hackathon.dateTime).toLocaleString()}</span>
										</div>
									{/if}
									{#if hackathon.duration}
										<div class="hackathon-info">
											<MapPin size={16} />
											<span>Duration: {hackathon.duration}</span>
										</div>
									{/if}
									<div class="hackathon-info">
										<Users size={16} />
										<span>
											{hackathon.participants} / {hackathon.maxParticipants || 'Unlimited'}
											participants
										</span>
									</div>
								</div>
								<div class="hackathon-card-footer">
									<button class="hackathon-action-btn">View Details</button>
									<button class="hackathon-action-btn secondary">Edit</button>
								</div>
							</div>
						{/each}
					</div>
				{/if}

				<!-- Create Hackathon Drawer -->
				<CreateHackathonDrawer
					bind:isOpen={showCreateDrawer}
					onClose={() => (showCreateDrawer = false)}
					onSave={handleSaveHackathon}
				/>
			</div>
		{:else if activeTab === 'settings'}
			<div class="content-section settings-section">
				<div class="section-header">
					<h1>Settings</h1>
					<p class="section-description">Configure your admin account and global hackathon settings</p>
				</div>

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
										class:active={settingsActiveTab === 'Account'}
										onclick={() => {
											settingsActiveTab = 'Account';
											searchQuery = '';
										}}
									>
										Account
									</button>
								</li>
								<li>
									<button
										type="button"
										class="settings-tree-item"
										class:active={settingsActiveTab === 'Activity Logs'}
										onclick={() => {
											settingsActiveTab = 'Activity Logs';
											searchQuery = '';
										}}
									>
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
										}}
									>
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
										}}
									>
										Appearance
									</button>
								</li>
							</ul>
						</div>

						<div class="settings-content">
							{#if showAppearance}
								<div class="settings-section-inner">
									<h2 class="settings-section-title">Appearance</h2>

									{#if isSearching ? matchesSearch('Color Theme') || matchesSearch('interface theme') || matchesSearch('Appearance') : true}
										<div class="setting-item">
											<div class="setting-header">
												<span class="setting-title">
													Workbench: <span class="highlight">Color Theme</span>
												</span>
												<div class="setting-description">
													Select your interface theme or let it match your system.
												</div>
											</div>
											<div class="setting-control">
												<select
													class="setting-select"
													value={theme}
													onchange={(e) => {
														theme = e.currentTarget.value;
													}}
												>
													<option value="system">System Default</option>
													<option value="light">Light Theme</option>
													<option value="dark">Dark Theme</option>
												</select>
											</div>
										</div>
									{/if}
								</div>
							{/if}

							{#if showActivityLogs}
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
												Clear all activity log data for every team from the database and reset
												their local logs. New logs will be recorded from this point forward.
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
												Control internet access restrictions for all non-admin teams.
											</div>

											<div class="admin-password-form">
												<div class="setting-item" style="padding: 0; border: none">
													<div class="setting-header">
														<span class="setting-title" style="font-size: 13px; color: #d4d4d4"
															>Block Internet Access</span
														>
														<div class="setting-description">
															If enabled, non-admin teams will be restricted from using the IDE
															while connected to the internet.
														</div>
													</div>
													<div class="setting-control">
														<label class="checkbox-label">
															<input
																type="checkbox"
																class="checkbox-input"
																checked={globalRestriction}
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

							{#if showAccount}
								<div class="settings-section-inner">
									<h2 class="settings-section-title">Account</h2>

									<div class="account-card">
										<!-- Team Name -->
										<div class="account-members-section">
											<div class="account-members-header">
												<span class="setting-title"><span class="highlight">Team Name</span></span>
											</div>

											{#if !editingName}
												<div class="account-team-name" style="justify-content: space-between">
													<div style="display: flex; align-items: center; gap: 10px">
														<Users size={16} />
														<span>{user?.teamName || 'Admin'}</span>
													</div>
													<button
														class="activity-log-btn secondary"
														onclick={() => {
															editingName = true;
															newTeamName = user?.teamName || '';
															nameError = '';
															nameSuccess = '';
														}}
													>
														Edit
													</button>
												</div>
											{:else}
												<div class="account-add-member">
													<input
														type="text"
														class="settings-search-input account-member-input"
														placeholder="Enter new team name"
														bind:value={newTeamName}
														oninput={() => {
															nameError = '';
														}}
														onkeydown={(e) => {
															if (e.key === 'Enter') handleSaveName();
														}}
													/>
													<button
														class="activity-log-btn primary"
														onclick={handleSaveName}
														disabled={savingName}
													>
														{savingName ? 'Saving...' : 'Save'}
													</button>
													<button
														class="activity-log-btn secondary"
														onclick={() => {
															editingName = false;
															nameError = '';
														}}
													>
														Cancel
													</button>
												</div>
											{/if}
											{#if nameError}<div class="account-error">{nameError}</div>{/if}
											{#if nameSuccess}<div class="account-success">
													<CheckCircle2 size={12} />
													{nameSuccess}
												</div>{/if}
										</div>

										<!-- Change Password -->
										<div class="account-members-section">
											<div class="account-members-header">
												<span class="setting-title"
													><span class="highlight">Change Password</span></span
												>
											</div>
											<div class="setting-description">Update your admin account password.</div>

											<div class="admin-password-form">
												<div class="admin-password-field">
													<label class="admin-password-label" for="old-pwd">Current Password</label>
													<div class="admin-password-input-wrap">
														<input
															id="old-pwd"
															type={showOldPassword ? 'text' : 'password'}
															class="settings-search-input admin-password-input"
															placeholder="Enter current password"
															bind:value={oldPassword}
															oninput={() => {
																passwordError = '';
															}}
														/>
														<button
															type="button"
															class="admin-password-eye"
															onclick={() => {
																showOldPassword = !showOldPassword;
															}}
														>
															{#if showOldPassword}<EyeOff size={14} />{:else}<Eye
																	size={14}
																/>{/if}
														</button>
													</div>
												</div>
												<div class="admin-password-field">
													<label class="admin-password-label" for="new-pwd">New Password</label>
													<div class="admin-password-input-wrap">
														<input
															id="new-pwd"
															type={showNewPassword ? 'text' : 'password'}
															class="settings-search-input admin-password-input"
															placeholder="Enter new password"
															bind:value={newPassword}
															oninput={() => {
																passwordError = '';
															}}
														/>
														<button
															type="button"
															class="admin-password-eye"
															onclick={() => {
																showNewPassword = !showNewPassword;
															}}
														>
															{#if showNewPassword}<EyeOff size={14} />{:else}<Eye
																	size={14}
																/>{/if}
														</button>
													</div>
												</div>
												<div class="admin-password-field">
													<label class="admin-password-label" for="confirm-pwd">Confirm New Password</label>
													<div class="admin-password-input-wrap">
														<input
															id="confirm-pwd"
															type={showConfirmPassword ? 'text' : 'password'}
															class="settings-search-input admin-password-input"
															placeholder="Confirm new password"
															bind:value={confirmPassword}
															oninput={() => {
																passwordError = '';
															}}
															onkeydown={(e) => {
																if (e.key === 'Enter') handleChangePassword();
															}}
														/>
														<button
															type="button"
															class="admin-password-eye"
															onclick={() => {
																showConfirmPassword = !showConfirmPassword;
															}}
														>
															{#if showConfirmPassword}<EyeOff size={14} />{:else}<Eye
																	size={14}
																/>{/if}
														</button>
													</div>
												</div>
												<button
													class="activity-log-btn primary"
													onclick={handleChangePassword}
													disabled={savingPassword}
													style="align-self: flex-start; margin-top: 4px"
												>
													<Key size={14} />
													{savingPassword ? 'Updating...' : 'Update Password'}
												</button>
											</div>
											{#if passwordError}<div class="account-error">{passwordError}</div>{/if}
											{#if passwordSuccess}<div class="account-success">
													<CheckCircle2 size={12} />
													{passwordSuccess}
												</div>{/if}
										</div>

										<!-- Sign Out -->
										<div class="account-signout">
											<button class="activity-log-btn danger" onclick={logout}>
												<LogOut size={14} />
												Sign Out
											</button>
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

<style>
	@import './AdminPanel.css';
</style>
