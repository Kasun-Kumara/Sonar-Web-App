<script lang="ts">
	import { Search, X, Users, LogOut, Settings, Key, CheckCircle2, Eye, EyeOff, Trash2 } from 'lucide-svelte';
	import { updateTeamName, updateTeamPassword, flushAllActivityLogs, getGlobalInternetRestriction, setGlobalInternetRestriction } from '$lib/appwrite';
	import type { Team } from '$lib/types';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		user: Team | null;
		onLogout: () => void;
		theme: string;
		onThemeChange: (val: string) => void;
		onTeamNameUpdated: (newName: string) => void;
	}

	let { isOpen, onClose, user, onLogout, theme, onThemeChange, onTeamNameUpdated }: Props = $props();

	let activeTab = $state('Account');
	let searchQuery = $state('');

	// Team name state
	let editingName = $state(false);
	let newTeamName = $state('');
	let nameError = $state('');
	let nameSuccess = $state('');
	let savingName = $state(false);

	// Password state
	let oldPassword = $state('');
	let newPassword = $state('');
	let confirmPassword = $state('');
	let passwordError = $state('');
	let passwordSuccess = $state('');
	let savingPassword = $state(false);
	let showOldPassword = $state(false);
	let showNewPassword = $state(false);
	let showConfirmPassword = $state(false);

	// Flush activity logs state
	let flushing = $state(false);
	let flushError = $state('');
	let flushSuccess = $state('');

	// Restriction state
	let globalRestriction = $state(false);
	let savingRestriction = $state(false);
	let restrictionError = $state('');
	let restrictionSuccess = $state('');

	$effect(() => {
		if (isOpen) {
			activeTab = 'Account';
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
				getGlobalInternetRestriction().then((result) => {
					globalRestriction = result;
				}).catch(console.error);
			}
		}
	});

	function handleKeyDown(e: KeyboardEvent) {
		if (e.key === 'Escape' && isOpen) onClose();
	}

	const matchesSearch = (text: string) =>
		searchQuery === '' || text.toLowerCase().includes(searchQuery.toLowerCase());

	const isSearching = $derived(searchQuery.trim().length > 0);

	const showAccount = $derived(!isSearching
		? activeTab === 'Account'
		: matchesSearch('Account') || matchesSearch('Team') || matchesSearch('Name') || matchesSearch('Password') || matchesSearch('Sign Out'));

	const showActivityLogs = $derived(!isSearching
		? activeTab === 'Activity Logs'
		: matchesSearch('Flush') || matchesSearch('Activity') || matchesSearch('Logs'));

	const showPrivacy = $derived(!isSearching
		? activeTab === 'Privacy'
		: matchesSearch('Privacy') || matchesSearch('Block') || matchesSearch('Internet') || matchesSearch('Restriction'));

	const showAppearance = $derived(!isSearching
		? activeTab === 'Appearance'
		: matchesSearch('Appearance') || matchesSearch('Color Theme') || matchesSearch('interface theme'));

	async function handleSaveName() {
		const trimmed = newTeamName.trim();
		if (!trimmed) { nameError = 'Team name cannot be empty'; return; }
		if (!user?.$id) return;
		if (trimmed === user.teamName) { editingName = false; return; }

		savingName = true;
		nameError = '';
		nameSuccess = '';
		const result = await updateTeamName(user.$id, trimmed);
		if (result.success) {
			nameSuccess = 'Team name updated successfully';
			editingName = false;
			onTeamNameUpdated(trimmed);
		} else {
			nameError = result.error || 'Failed to update team name';
		}
		savingName = false;
	}

	async function handleChangePassword() {
		passwordError = '';
		passwordSuccess = '';

		if (!oldPassword) { passwordError = 'Please enter your current password'; return; }
		if (!newPassword) { passwordError = 'Please enter a new password'; return; }
		if (newPassword.length < 4) { passwordError = 'New password must be at least 4 characters'; return; }
		if (newPassword !== confirmPassword) { passwordError = 'New passwords do not match'; return; }
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
		if (!window.confirm('Are you sure you want to flush all activity logs? This action cannot be undone.')) return;
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
			restrictionSuccess = checked ? 'Internet blocking enabled for all teams' : 'Internet blocking disabled for all teams';
			setTimeout(() => { restrictionSuccess = ''; }, 3000);
		} else {
			restrictionError = result.error || 'Failed to update restriction';
		}
		savingRestriction = false;
	}

	const isWindows = typeof navigator !== 'undefined' && navigator.userAgent.toLowerCase().includes('win');
</script>

<svelte:window on:keydown={handleKeyDown} />

{#if isOpen}
<div class="vscode-settings-overlay">
	<div
		class="vscode-settings-header-tabs"
		style="padding-left: {isWindows ? '0px' : '75px'}"
	>
		<div class="vscode-settings-tab active">
			Admin Settings
			<button class="vscode-settings-tab-close" onclick={onClose} title="Close">
				<X size={16} />
			</button>
		</div>
	</div>

	<div class="vscode-settings-searchbar-container">
		<div class="vscode-search-input-wrapper">
			<Search size={16} class="vscode-search-icon" />
			<input
				type="text"
				placeholder="Search settings"
				bind:value={searchQuery}
				class="vscode-search-input"
			/>
		</div>
	</div>

	<div class="vscode-settings-body">
		<div class="vscode-settings-sidebar">
			<ul class="vscode-settings-tree">
				<li
					class:active={activeTab === 'Account'}
					onclick={() => {
						activeTab = 'Account';
						searchQuery = '';
					}}
				>
					Account
				</li>
				<li
					class:active={activeTab === 'Activity Logs'}
					onclick={() => {
						activeTab = 'Activity Logs';
						searchQuery = '';
					}}
				>
					Activity Logs
				</li>
				<li
					class:active={activeTab === 'Privacy'}
					onclick={() => {
						activeTab = 'Privacy';
						searchQuery = '';
					}}
				>
					Privacy
				</li>
				<li
					class:active={activeTab === 'Appearance'}
					onclick={() => {
						activeTab = 'Appearance';
						searchQuery = '';
					}}
				>
					Appearance
				</li>
			</ul>
		</div>

		<div class="vscode-settings-content">
			{#if showAppearance}
				<div class="vscode-settings-section">
					<h2 class="vscode-settings-section-title">Appearance</h2>

					{#if (isSearching ? matchesSearch("Color Theme") || matchesSearch("interface theme") || matchesSearch("Appearance") : true)}
						<div class="vscode-setting-item">
							<div class="vscode-setting-header">
								<span class="vscode-setting-title">
									Workbench: <span class="highlight">Color Theme</span>
								</span>
								<div class="vscode-setting-description">
									Select your interface theme or let it match your system.
								</div>
							</div>
							<div class="vscode-setting-control">
								<select
									class="vscode-select"
									value={theme}
									onchange={(e) => onThemeChange(e.currentTarget.value)}
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
				<div class="vscode-settings-section">
					<h2 class="vscode-settings-section-title">Activity Logs</h2>

					<div class="account-card">
						<div class="account-members-section">
							<div class="account-members-header">
								<span class="vscode-setting-title"><span class="highlight">Flush Activity Logs</span></span>
							</div>
							<div class="vscode-setting-description">
								Clear all activity log data for every team from the database and reset their local logs. New logs will be recorded from this point forward.
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
							{#if flushSuccess}<div class="account-success"><CheckCircle2 size={12} /> {flushSuccess}</div>{/if}
						</div>
					</div>
				</div>
			{/if}

			{#if showPrivacy}
				<div class="vscode-settings-section">
					<h2 class="vscode-settings-section-title">Privacy</h2>

					<div class="account-card">
						<div class="account-members-section">
							<div class="account-members-header">
								<span class="vscode-setting-title"><span class="highlight">Internet Restriction</span></span>
							</div>
							<div class="vscode-setting-description">Control internet access restrictions for all non-admin teams.</div>

							<div class="admin-password-form">
								<div class="vscode-setting-item" style="padding: 0; border: none">
									<div class="vscode-setting-header">
										<span class="vscode-setting-title" style="font-size: 13px; color: #d4d4d4">Block Internet Access</span>
										<div class="vscode-setting-description">If enabled, non-admin teams will be restricted from using the IDE while connected to the internet.</div>
									</div>
									<div class="vscode-setting-control">
										<label class="vscode-checkbox-label">
											<input
												type="checkbox"
												class="vscode-checkbox"
												checked={globalRestriction}
												onchange={(e) => handleToggleRestriction(e.currentTarget.checked)}
												disabled={savingRestriction}
											/>
										</label>
									</div>
								</div>
							</div>
							{#if restrictionError}<div class="account-error">{restrictionError}</div>{/if}
							{#if restrictionSuccess}<div class="account-success"><CheckCircle2 size={12} /> {restrictionSuccess}</div>{/if}
						</div>
					</div>
				</div>
			{/if}

			{#if showAccount}
				<div class="vscode-settings-section">
					<h2 class="vscode-settings-section-title">Account</h2>

					<div class="account-card">
						<!-- Team Name -->
						<div class="account-members-section">
							<div class="account-members-header">
								<span class="vscode-setting-title"><span class="highlight">Team Name</span></span>
							</div>

							{#if !editingName}
								<div class="account-team-name" style="justify-content: space-between">
									<div style="display: flex; align-items: center; gap: 10px">
										<Users size={16} />
										<span>{user?.teamName || 'Admin'}</span>
									</div>
									<button
										class="activity-log-btn secondary"
										onclick={() => { editingName = true; newTeamName = user?.teamName || ''; nameError = ''; nameSuccess = ''; }}
									>
										Edit
									</button>
								</div>
							{:else}
								<div class="account-add-member">
									<input
										type="text"
										class="vscode-search-input account-member-input"
										placeholder="Enter new team name"
										bind:value={newTeamName}
										oninput={() => { nameError = ''; }}
										onkeydown={(e) => { if (e.key === 'Enter') handleSaveName(); }}
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
										onclick={() => { editingName = false; nameError = ''; }}
									>
										Cancel
									</button>
								</div>
							{/if}
							{#if nameError}<div class="account-error">{nameError}</div>{/if}
							{#if nameSuccess}<div class="account-success"><CheckCircle2 size={12} /> {nameSuccess}</div>{/if}
						</div>

						<!-- Change Password -->
						<div class="account-members-section">
							<div class="account-members-header">
								<span class="vscode-setting-title"><span class="highlight">Change Password</span></span>
							</div>
							<div class="vscode-setting-description">Update your admin account password.</div>

							<div class="admin-password-form">
								<div class="admin-password-field">
									<label class="admin-password-label">Current Password</label>
									<div class="admin-password-input-wrap">
										<input
											type={showOldPassword ? 'text' : 'password'}
											class="vscode-search-input admin-password-input"
											placeholder="Enter current password"
											bind:value={oldPassword}
											oninput={() => { passwordError = ''; }}
										/>
										<button type="button" class="admin-password-eye" onclick={() => { showOldPassword = !showOldPassword; }}>
											{#if showOldPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
										</button>
									</div>
								</div>
								<div class="admin-password-field">
									<label class="admin-password-label">New Password</label>
									<div class="admin-password-input-wrap">
										<input
											type={showNewPassword ? 'text' : 'password'}
											class="vscode-search-input admin-password-input"
											placeholder="Enter new password"
											bind:value={newPassword}
											oninput={() => { passwordError = ''; }}
										/>
										<button type="button" class="admin-password-eye" onclick={() => { showNewPassword = !showNewPassword; }}>
											{#if showNewPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
										</button>
									</div>
								</div>
								<div class="admin-password-field">
									<label class="admin-password-label">Confirm New Password</label>
									<div class="admin-password-input-wrap">
										<input
											type={showConfirmPassword ? 'text' : 'password'}
											class="vscode-search-input admin-password-input"
											placeholder="Confirm new password"
											bind:value={confirmPassword}
											oninput={() => { passwordError = ''; }}
											onkeydown={(e) => { if (e.key === 'Enter') handleChangePassword(); }}
										/>
										<button type="button" class="admin-password-eye" onclick={() => { showConfirmPassword = !showConfirmPassword; }}>
											{#if showConfirmPassword}<EyeOff size={14} />{:else}<Eye size={14} />{/if}
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
							{#if passwordSuccess}<div class="account-success"><CheckCircle2 size={12} /> {passwordSuccess}</div>{/if}
						</div>

						<!-- Sign Out -->
						<div class="account-signout">
							<button class="activity-log-btn danger" onclick={onLogout}>
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
{/if}

<style>
	@import '../../lib/components/Settings/SettingsModal.css';
</style>
