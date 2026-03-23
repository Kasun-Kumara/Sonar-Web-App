<script lang="ts">
	import { X, Calendar, Clock, Users, FileText, AlertCircle, Copy, Check, Info, Shield, HelpCircle } from 'lucide-svelte';
	import { fly, fade } from 'svelte/transition';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSave: (hackathon: any) => void;
	}

	let { isOpen = $bindable(), onClose, onSave }: Props = $props();

	// Form State
	let title = $state('');
	let dateTime = $state('');
	let endDate = $state('');
	let location = $state('');
	let agenda = $state('');
	let specialInstructions = $state('');
	let maxParticipants = $state<number | null>(null);
	let isUnlimited = $state(true);
	let status = $state<'draft' | 'published'>('draft');

	// Auto-generated identifiers
	let hackathonId = $state('');
	let password = $state('');
	let invitationLink = $state('');
	
	// UI State
	let copiedId = $state(false);
	let copiedPassword = $state(false);
	let copiedLink = $state(false);
	let titleError = $state('');
	let saving = $state(false);

	function generateRandomString(length: number): string {
		const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
		let result = '';
		for (let i = 0; i < length; i++) {
			result += chars.charAt(Math.floor(Math.random() * chars.length));
		}
		return result;
	}

	function generateHackathonId(): string {
		return `HCK-${generateRandomString(8)}`;
	}

	function generatePassword(): string {
		return generateRandomString(12);
	}

	function generateInvitationLink(id: string, pwd: string): string {
		if (typeof window === 'undefined') return '';
		const baseUrl = window.location.origin;
		return `${baseUrl}/join/${id}?pwd=${pwd}`;
	}

	// Re-generate credentials when opening a new one
	$effect(() => {
		if (isOpen && !hackathonId) {
			hackathonId = generateHackathonId();
			password = generatePassword();
			invitationLink = generateInvitationLink(hackathonId, password);
		}
	});

	function copyToClipboard(text: string, type: 'id' | 'password' | 'link') {
		navigator.clipboard.writeText(text).then(() => {
			if (type === 'id') {
				copiedId = true;
				setTimeout(() => (copiedId = false), 2000);
			} else if (type === 'password') {
				copiedPassword = true;
				setTimeout(() => (copiedPassword = false), 2000);
			} else if (type === 'link') {
				copiedLink = true;
				setTimeout(() => (copiedLink = false), 2000);
			}
		});
	}

	function handleSave() {
		titleError = '';

		if (!title.trim()) {
			titleError = 'Hackathon title is required';
			return;
		}

		saving = true;

		const hackathonData = {
			id: hackathonId,
			name: title.trim(),
			dateTime: dateTime || null,
			endDate: endDate || null,
			location: location.trim() || 'Online',
			agenda: agenda.trim() || null,
			specialInstructions: specialInstructions.trim() || null,
			maxParticipants: isUnlimited ? null : maxParticipants,
			password: password,
			invitationLink: invitationLink,
			status: status,
			createdAt: new Date().toISOString(),
			participants: 0
		};

		// Adding a small delay for better UX
		setTimeout(() => {
			onSave(hackathonData);
			saving = false;
			closeDrawer();
		}, 600);
	}

	function resetForm() {
		title = '';
		dateTime = '';
		endDate = '';
		location = '';
		agenda = '';
		specialInstructions = '';
		maxParticipants = null;
		isUnlimited = true;
		status = 'draft';
		hackathonId = '';
		password = '';
		invitationLink = '';
		titleError = '';
	}

	function closeDrawer() {
		resetForm();
		isOpen = false;
		onClose();
	}
</script>

{#if isOpen}
	<!-- Overlay -->
	<div
		class="drawer-overlay"
		role="button"
		tabindex="0"
		transition:fade={{ duration: 200 }}
		onclick={closeDrawer}
		onkeydown={(e) => e.key === 'Escape' && closeDrawer()}
	></div>

	<!-- Drawer Container -->
	<div
		class="drawer-container"
		role="dialog"
		aria-labelledby="drawer-title"
		transition:fly={{ y: 600, duration: 450, opacity: 1 }}
	>
		<!-- Header -->
		<div class="drawer-header">
			<div class="header-info">
				<h2 id="drawer-title">Create New Hackathon</h2>
				<p>Plan and configure your next big event</p>
			</div>
			<button class="close-btn" onclick={closeDrawer} title="Close drawer">
				<X size={20} />
			</button>
		</div>

		<!-- Content -->
		<div class="drawer-content">
			<!-- Visual ID Banner -->
			<div class="id-banner">
				<div class="id-info">
					<span class="id-label">AUTO-GENERATED ID</span>
					<span class="id-value">{hackathonId}</span>
				</div>
				<button class="banner-copy-btn" onclick={() => copyToClipboard(hackathonId, 'id')}>
					{#if copiedId}
						<Check size={16} /> <span>Copied!</span>
					{:else}
						<Copy size={16} /> <span>Copy ID</span>
					{/if}
				</button>
			</div>

			<div class="section-divider">
				<span class="divider-text">BASIC INFORMATION</span>
			</div>

			<div class="field-container">
				<label for="h-title" class="field-label required">Event Title</label>
				<div class="input-wrapper" class:has-error={titleError}>
					<FileText size={18} class="input-icon" />
					<input 
						id="h-title" 
						type="text" 
						bind:value={title} 
						placeholder="e.g. Winter AI Challenge 2026"
						class="form-control"
					/>
				</div>
				{#if titleError}
					<span class="error-text"><AlertCircle size={12} /> {titleError}</span>
				{/if}
			</div>

			<div class="field-grid">
				<div class="field-container">
					<label for="h-start" class="field-label">Start Date & Time</label>
					<div class="input-wrapper">
						<Calendar size={18} class="input-icon" />
						<input 
							id="h-start" 
							type="datetime-local" 
							bind:value={dateTime} 
							class="form-control"
						/>
					</div>
				</div>
				<div class="field-container">
					<label for="h-end" class="field-label">End Date & Time</label>
					<div class="input-wrapper">
						<Calendar size={18} class="input-icon" />
						<input 
							id="h-end" 
							type="datetime-local" 
							bind:value={endDate} 
							class="form-control"
						/>
					</div>
				</div>
			</div>

			<div class="field-container">
				<label for="h-location" class="field-label">Event Location</label>
				<div class="input-wrapper">
					<Info size={18} class="input-icon" />
					<input 
						id="h-location" 
						type="text" 
						bind:value={location} 
						placeholder="e.g. Online, Innovation Hub, San Francisco"
						class="form-control"
					/>
				</div>
			</div>

			<div class="section-divider">
				<span class="divider-text">ACCESS & LIMITS</span>
			</div>

			<div class="access-info-box">
				<div class="access-field">
					<div class="access-label-group">
						<Shield size={16} class="label-icon" />
						<span class="access-label">Access Password</span>
					</div>
					<div class="access-value-row">
						<code>{password}</code>
						<button class="icon-btn-tinted" onclick={() => copyToClipboard(password, 'password')}>
							{#if copiedPassword}<Check size={14} />{:else}<Copy size={14} />{/if}
						</button>
					</div>
				</div>
				
				<div class="access-field">
					<div class="access-label-group">
						<Users size={16} class="label-icon" />
						<span class="access-label">Participant Limit</span>
					</div>
					<div class="limit-control-row">
						<!-- Toggle Switch Container -->
						<div class="toggle-container">
							<button 
								class="toggle-switch-btn" 
								class:active={isUnlimited} 
								onclick={() => isUnlimited = !isUnlimited}
							>
								<div class="toggle-dot"></div>
							</button>
							<span class="toggle-text">{isUnlimited ? 'Unlimited Capacity' : 'Limited Entry'}</span>
						</div>
						{#if !isUnlimited}
							<input 
								type="number" 
								bind:value={maxParticipants} 
								class="number-input" 
								placeholder="Qty"
								min="1"
							/>
						{/if}
					</div>
				</div>
			</div>

			<div class="field-container">
				<label for="h-agenda" class="field-label">Agenda & Schedule</label>
				<textarea 
					id="h-agenda" 
					bind:value={agenda} 
					rows="4" 
					placeholder="Outline the main events, milestones, and timeline..."
					class="form-control-area"
				></textarea>
			</div>

			<div class="field-container">
				<label for="h-rules" class="field-label">Rules & Special Instructions</label>
				<textarea 
					id="h-rules" 
					bind:value={specialInstructions} 
					rows="3" 
					placeholder="Safety guidelines, technical requirements, or competition rules..."
					class="form-control-area"
				></textarea>
			</div>

			<div class="footer-settings">
				<div class="status-option">
					<span class="field-label">Visibility Status</span>
					<div class="radio-group">
						<button 
							class="radio-btn" 
							class:active={status === 'draft'} 
							onclick={() => status = 'draft'}
						>
							<div class="radio-dot"></div>
							Draft
						</button>
						<button 
							class="radio-btn" 
							class:active={status === 'published'} 
							onclick={() => status = 'published'}
						>
							<div class="radio-dot"></div>
							Published
						</button>
					</div>
				</div>
			</div>
		</div>

		<!-- Footer -->
		<div class="drawer-footer">
			<button class="footer-btn secondary" onclick={closeDrawer}>Discard Changes</button>
			<button class="footer-btn primary" onclick={handleSave} disabled={saving}>
				{#if saving}
					<div class="spinner"></div> Creating...
				{:else}
					Initialize Hackathon
				{/if}
			</button>
		</div>
	</div>
{/if}

<style>
	:root {
		--drawer-bg: #0f1115;
		--drawer-header-bg: #16191f;
		--input-bg: #1e2229;
		--border-color: #2e343d;
		--text-main: #e1e7ef;
		--text-muted: #8b95a5;
		--accent-color: #3b82f6;
		--accent-hover: #2563eb;
		--error-red: #ef4444;
	}

	.drawer-overlay {
		position: absolute;
		inset: 0;
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(2px);
		z-index: 999;
	}

	.drawer-container {
		position: absolute;
		left: 0;
		right: 0;
		bottom: 0;
		width: 100%;
		height: 90%;
		background: var(--drawer-bg);
		display: flex;
		flex-direction: column;
		z-index: 1000;
		box-shadow: 0 -10px 40px rgba(0, 0, 0, 0.6);
		border-top: 1px solid var(--border-color);
		border-radius: 24px 24px 0 0;
		overflow: hidden;
	}

	@media (max-width: 600px) {
		.drawer-container {
			width: 100%;
		}
	}

	.drawer-header {
		padding: 24px 32px;
		background: var(--drawer-header-bg);
		border-bottom: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.header-info h2 {
		font-size: 1.25rem;
		font-weight: 700;
		color: #fff;
		margin: 0;
	}

	.header-info p {
		font-size: 0.85rem;
		color: var(--text-muted);
		margin: 4px 0 0 0;
	}

	.close-btn {
		background: #232831;
		border: 1px solid var(--border-color);
		color: var(--text-muted);
		width: 36px;
		height: 36px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: all 0.2s;
	}

	.close-btn:hover {
		color: #fff;
		border-color: var(--text-muted);
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 32px;
		scrollbar-width: thin;
		scrollbar-color: var(--border-color) transparent;
	}

	.id-banner {
		background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
		border: 1px solid #334155;
		border-radius: 12px;
		padding: 16px 20px;
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 32px;
	}

	.id-info {
		display: flex;
		flex-direction: column;
	}

	.id-label {
		font-size: 0.65rem;
		font-weight: 800;
		color: var(--accent-color);
		letter-spacing: 0.05em;
	}

	.id-value {
		font-family: 'JetBrains Mono', 'Fira Code', monospace;
		font-size: 1.1rem;
		font-weight: 600;
		color: #fff;
	}

	.banner-copy-btn {
		background: rgba(59, 130, 246, 0.1);
		border: 1px solid rgba(59, 130, 246, 0.2);
		color: var(--accent-color);
		padding: 8px 12px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 8px;
		font-size: 0.8rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
	}

	.banner-copy-btn:hover {
		background: var(--accent-color);
		color: #fff;
	}

	.section-divider {
		display: flex;
		align-items: center;
		margin: 24px 0 16px 0;
	}

	.divider-text {
		font-size: 0.7rem;
		font-weight: 700;
		color: var(--text-muted);
		letter-spacing: 0.1em;
		padding-right: 12px;
	}

	.section-divider::after {
		content: '';
		flex: 1;
		height: 1px;
		background: var(--border-color);
	}

	.field-container {
		margin-bottom: 24px;
	}

	.field-label {
		display: block;
		font-size: 0.85rem;
		font-weight: 600;
		color: var(--text-main);
		margin-bottom: 8px;
	}

	.field-label.required::after {
		content: '*';
		color: var(--error-red);
		margin-left: 4px;
	}

	.input-wrapper {
		position: relative;
		display: flex;
		align-items: center;
	}

	.input-icon {
		position: absolute;
		left: 12px;
		color: var(--text-muted);
		pointer-events: none;
	}

	.form-control {
		width: 100%;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 12px 12px 12px 42px;
		color: #fff;
		font-size: 0.95rem;
		transition: all 0.2s;
	}

	.form-control:focus {
		outline: none;
		border-color: var(--accent-color);
		box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.15);
	}

	.has-error .form-control {
		border-color: var(--error-red);
	}

	.error-text {
		display: flex;
		align-items: center;
		gap: 4px;
		color: var(--error-red);
		font-size: 0.75rem;
		margin-top: 6px;
	}

	.field-grid {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 16px;
	}

	.access-info-box {
		background: #16191f;
		border: 1px solid var(--border-color);
		border-radius: 12px;
		padding: 20px;
		margin-bottom: 24px;
		display: flex;
		flex-direction: column;
		gap: 20px;
	}

	.access-field {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.access-label-group {
		display: flex;
		align-items: center;
		gap: 8px;
	}

	.label-icon {
		color: var(--accent-color);
	}

	.access-label {
		font-size: 0.8rem;
		font-weight: 600;
		color: var(--text-muted);
	}

	.access-value-row {
		display: flex;
		align-items: center;
		padding: 10px 14px;
		background: #0f1115;
		border: 1px solid var(--border-color);
		border-radius: 8px;
		justify-content: space-between;
	}

	.access-value-row code {
		font-family: 'JetBrains Mono', monospace;
		color: #fff;
		font-size: 0.9rem;
	}

	.icon-btn-tinted {
		background: rgba(59, 130, 246, 0.1);
		border: none;
		color: var(--accent-color);
		width: 28px;
		height: 28px;
		border-radius: 6px;
		display: flex;
		align-items: center;
		justify-content: center;
		cursor: pointer;
		transition: background 0.2s;
	}

	.icon-btn-tinted:hover {
		background: rgba(59, 130, 246, 0.2);
	}

	.limit-control-row {
		display: flex;
		align-items: center;
		gap: 12px;
	}

	.toggle-container {
		display: flex;
		align-items: center;
		gap: 12px;
		background: #0f1115;
		padding: 4px 12px;
		border-radius: 20px;
		border: 1px solid var(--border-color);
	}

	.toggle-switch-btn {
		position: relative;
		width: 36px;
		height: 20px;
		background: #232831;
		border-radius: 10px;
		border: none;
		cursor: pointer;
		transition: all 0.3s;
		padding: 0;
	}

	.toggle-switch-btn.active {
		background: var(--accent-color);
	}

	.toggle-dot {
		position: absolute;
		top: 3px;
		left: 3px;
		width: 14px;
		height: 14px;
		background: #fff;
		border-radius: 50%;
		transition: all 0.3s;
	}

	.toggle-switch-btn.active .toggle-dot {
		left: calc(100% - 17px);
	}

	.toggle-text {
		font-size: 0.85rem;
		color: #fff;
		min-width: 110px;
	}

	.number-input {
		width: 70px;
		background: #1e2229;
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 8px 10px;
		color: #fff;
		font-size: 0.9rem;
		text-align: center;
	}

	.form-control-area {
		width: 100%;
		background: var(--input-bg);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 12px;
		color: #fff;
		font-size: 0.95rem;
		resize: vertical;
		font-family: inherit;
		min-height: 80px;
	}

	.form-control-area:focus {
		outline: none;
		border-color: var(--accent-color);
	}

	.footer-settings {
		margin-top: 8px;
		padding-top: 16px;
		border-top: 1px solid var(--border-color);
	}

	.radio-group {
		display: flex;
		gap: 12px;
		margin-top: 10px;
	}

	.radio-btn {
		background: #16191f;
		border: 1px solid var(--border-color);
		color: var(--text-muted);
		padding: 10px 16px;
		border-radius: 8px;
		display: flex;
		align-items: center;
		gap: 10px;
		font-size: 0.85rem;
		font-weight: 500;
		cursor: pointer;
		flex: 1;
		transition: all 0.2s;
	}

	.radio-btn.active {
		border-color: var(--accent-color);
		background: rgba(59, 130, 246, 0.05);
		color: #fff;
	}

	.radio-dot {
		width: 10px;
		height: 10px;
		border-radius: 50%;
		border: 2px solid var(--text-muted);
		background: transparent;
	}

	.radio-btn.active .radio-dot {
		border-color: var(--accent-color);
		background: var(--accent-color);
		box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
	}

	.drawer-footer {
		padding: 24px 32px;
		border-top: 1px solid var(--border-color);
		display: flex;
		gap: 16px;
		background: var(--drawer-header-bg);
	}

	.footer-btn {
		flex: 1;
		padding: 14px;
		border-radius: 8px;
		font-size: 0.95rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 10px;
	}

	.footer-btn.primary {
		background: var(--accent-color);
		color: #fff;
		border: none;
	}

	.footer-btn.primary:hover {
		background: var(--accent-hover);
		transform: translateY(-1px);
	}

	.footer-btn.primary:disabled {
		opacity: 0.7;
		cursor: not-allowed;
		transform: none;
	}

	.footer-btn.secondary {
		background: transparent;
		color: var(--text-muted);
		border: 1px solid var(--border-color);
	}

	.footer-btn.secondary:hover {
		border-color: var(--text-muted);
		color: #fff;
	}

	/* Spinner */
	.spinner {
		width: 18px;
		height: 18px;
		border: 2px solid rgba(255, 255, 255, 0.3);
		border-top-color: #fff;
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to { transform: rotate(360deg); }
	}
</style>
