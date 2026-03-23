<script lang="ts">
	import { X, Calendar, Clock, Users, FileText, AlertCircle, Copy, Check } from 'lucide-svelte';

	interface Props {
		isOpen: boolean;
		onClose: () => void;
		onSave: (hackathon: any) => void;
	}

	let { isOpen = $bindable(), onClose, onSave }: Props = $props();

	let isClosing = $state(false);
	let title = $state('');
	let dateTime = $state('');
	let duration = $state('');
	let agenda = $state('');
	let specialInstructions = $state('');
	let maxParticipants = $state('');
	let isUnlimited = $state(true);

	let hackathonId = $state('');
	let password = $state('');
	let invitationLink = $state('');
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
		const baseUrl = window.location.origin;
		return `${baseUrl}/join/${id}?pwd=${pwd}`;
	}

	$effect(() => {
		if (isOpen) {
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
			duration: duration || null,
			agenda: agenda.trim() || null,
			specialInstructions: specialInstructions.trim() || null,
			maxParticipants: isUnlimited ? null : parseInt(maxParticipants) || null,
			password: password,
			invitationLink: invitationLink,
			status: 'draft',
			createdAt: new Date().toISOString(),
			participants: 0
		};

		// Simulate save delay
		setTimeout(() => {
			onSave(hackathonData);
			saving = false;
			handleClose();
		}, 500);
	}

	function resetForm() {
		title = '';
		dateTime = '';
		duration = '';
		agenda = '';
		specialInstructions = '';
		maxParticipants = '';
		isUnlimited = true;
		titleError = '';
		copiedId = false;
		copiedPassword = false;
		copiedLink = false;
	}

	function handleClose() {
		isClosing = true;
		setTimeout(() => {
			resetForm();
			isClosing = false;
			isOpen = false;
			onClose();
		}, 300); // Match animation duration
	}
</script>

{#if isOpen}
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div
		class="drawer-overlay"
		class:closing={isClosing}
		onclick={handleClose}
		onkeydown={(e) => e.key === 'Escape' && handleClose()}
	></div>
	<!-- svelte-ignore a11y_no_static_element_interactions -->
	<div class="drawer-container" class:closing={isClosing} onclick={(e) => e.stopPropagation()}>
		<div class="drawer-header">
			<div>
				<h2>Create New Hackathon</h2>
				<p>Fill in the details below to create your hackathon event</p>
			</div>
			<button class="close-btn" onclick={handleClose}>
				<X size={24} />
			</button>
		</div>

		<div class="drawer-content">
			<!-- Auto-generated Information -->
			<div class="info-section">
				<h3>Auto-Generated Information</h3>
				<div class="info-grid">
					<div class="info-item">
						<label>Hackathon ID</label>
						<div class="info-value">
							<code>{hackathonId}</code>
							<button
								class="copy-btn"
								onclick={() => copyToClipboard(hackathonId, 'id')}
								title="Copy Hackathon ID"
							>
								{#if copiedId}
									<Check size={16} />
								{:else}
									<Copy size={16} />
								{/if}
							</button>
						</div>
					</div>
					<div class="info-item">
						<label>Access Password</label>
						<div class="info-value">
							<code>{password}</code>
							<button
								class="copy-btn"
								onclick={() => copyToClipboard(password, 'password')}
								title="Copy Password"
							>
								{#if copiedPassword}
									<Check size={16} />
								{:else}
									<Copy size={16} />
								{/if}
							</button>
						</div>
					</div>
				</div>
				<div class="info-item full-width">
					<label>Invitation Link</label>
					<div class="info-value">
						<code class="invitation-link">{invitationLink}</code>
						<button
							class="copy-btn"
							onclick={() => copyToClipboard(invitationLink, 'link')}
							title="Copy Invitation Link"
						>
							{#if copiedLink}
								<Check size={16} />
							{:else}
								<Copy size={16} />
							{/if}
						</button>
					</div>
					<p class="info-hint">
						Share this link with participants. They can join without entering the password manually.
					</p>
				</div>
			</div>

			<!-- Form Fields -->
			<div class="form-section">
				<h3>Hackathon Details</h3>

				<div class="form-group">
					<label for="title" class="required">Hackathon Title</label>
					<input
						id="title"
						type="text"
						bind:value={title}
						placeholder="Enter hackathon title"
						class="form-input"
						class:error={titleError}
					/>
					{#if titleError}
						<div class="error-message">
							<AlertCircle size={14} />
							{titleError}
						</div>
					{/if}
				</div>

				<div class="form-row">
					<div class="form-group">
						<label for="dateTime">
							<Calendar size={16} />
							Date & Time (Optional)
						</label>
						<input
							id="dateTime"
							type="datetime-local"
							bind:value={dateTime}
							class="form-input"
						/>
					</div>

					<div class="form-group">
						<label for="duration">
							<Clock size={16} />
							Duration (Optional)
						</label>
						<input
							id="duration"
							type="text"
							bind:value={duration}
							placeholder="e.g., 24 hours, 3 days"
							class="form-input"
						/>
					</div>
				</div>

				<div class="form-group">
					<label for="agenda">
						<FileText size={16} />
						Agenda (Optional)
					</label>
					<textarea
						id="agenda"
						bind:value={agenda}
						placeholder="Describe the hackathon agenda, schedule, or objectives..."
						class="form-textarea"
						rows="4"
					></textarea>
				</div>

				<div class="form-group">
					<label for="specialInstructions">
						<AlertCircle size={16} />
						Special Instructions (Optional)
					</label>
					<textarea
						id="specialInstructions"
						bind:value={specialInstructions}
						placeholder="Any special instructions or rules for participants..."
						class="form-textarea"
						rows="3"
					></textarea>
				</div>

				<div class="form-group">
					<label for="maxParticipants">
						<Users size={16} />
						Maximum Participants
					</label>
					<div class="participants-control">
						<label class="checkbox-wrapper">
							<input type="checkbox" bind:checked={isUnlimited} class="checkbox" />
							<span>Unlimited</span>
						</label>
						{#if !isUnlimited}
							<input
								id="maxParticipants"
								type="number"
								bind:value={maxParticipants}
								placeholder="Enter max number"
								class="form-input"
								min="1"
							/>
						{/if}
					</div>
				</div>
			</div>
		</div>

		<div class="drawer-footer">
			<button class="btn-secondary" onclick={handleClose} disabled={saving}>Cancel</button>
			<button class="btn-primary" onclick={handleSave} disabled={saving}>
				{saving ? 'Creating...' : 'Create Hackathon'}
			</button>
		</div>
	</div>
{/if}

<style>
	.drawer-overlay {
		position: fixed;
		top: 0;
		right: 0;
		bottom: 0;
		left: 260px; /* Match sidebar width to not cover it */
		background: rgba(0, 0, 0, 0.6);
		backdrop-filter: blur(4px);
		z-index: 100;
		animation: fadeIn 0.2s ease-out forwards;
	}

	.drawer-overlay.closing {
		animation: fadeOut 0.3s ease-out forwards;
	}

	.drawer-container {
		position: fixed;
		bottom: 0;
		left: 260px; /* Match sidebar width */
		right: 0;
		background: #1e1e1e;
		border-top: 1px solid #3e3e42;
		border-radius: 16px 16px 0 0;
		box-shadow: 0 -4px 24px rgba(0, 0, 0, 0.4);
		z-index: 101;
		max-height: 90vh;
		display: flex;
		flex-direction: column;
		animation: slideUp 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	.drawer-container.closing {
		animation: slideDown 0.3s cubic-bezier(0.4, 0, 0.2, 1) forwards;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	@keyframes fadeOut {
		from {
			opacity: 1;
		}
		to {
			opacity: 0;
		}
	}

	@keyframes slideUp {
		from {
			transform: translateY(100%);
		}
		to {
			transform: translateY(0);
		}
	}

	@keyframes slideDown {
		from {
			transform: translateY(0);
		}
		to {
			transform: translateY(100%);
		}
	}

	/* Responsive - match sidebar width changes */
	@media (max-width: 1024px) {
		.drawer-overlay,
		.drawer-container {
			left: 220px;
		}
	}

	@media (max-width: 768px) {
		.drawer-overlay,
		.drawer-container {
			left: 80px;
		}
	}

	.drawer-header {
		padding: 24px 32px;
		border-bottom: 1px solid #3e3e42;
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
	}

	.drawer-header h2 {
		font-size: 24px;
		font-weight: 600;
		margin: 0 0 4px 0;
		color: #ffffff;
	}

	.drawer-header p {
		font-size: 14px;
		color: #888888;
		margin: 0;
	}

	.close-btn {
		background: transparent;
		border: none;
		color: #cccccc;
		cursor: pointer;
		padding: 4px;
		border-radius: 6px;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.close-btn:hover {
		background: #2a2d2e;
		color: #ffffff;
	}

	.drawer-content {
		flex: 1;
		overflow-y: auto;
		padding: 32px;
	}

	.info-section,
	.form-section {
		margin-bottom: 32px;
	}

	.info-section h3,
	.form-section h3 {
		font-size: 18px;
		font-weight: 600;
		margin: 0 0 20px 0;
		color: #ffffff;
	}

	.info-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
		gap: 16px;
		margin-bottom: 16px;
	}

	.info-item {
		display: flex;
		flex-direction: column;
		gap: 8px;
	}

	.info-item.full-width {
		grid-column: 1 / -1;
	}

	.info-item label {
		font-size: 13px;
		font-weight: 500;
		color: #cccccc;
	}

	.info-value {
		display: flex;
		align-items: center;
		gap: 8px;
		background: #2a2d2e;
		padding: 10px 12px;
		border-radius: 6px;
		border: 1px solid #3e3e42;
	}

	.info-value code {
		flex: 1;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 13px;
		color: #ffffff;
		background: transparent;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.info-value code.invitation-link {
		font-size: 12px;
	}

	.copy-btn {
		background: transparent;
		border: 1px solid #3e3e42;
		color: #cccccc;
		cursor: pointer;
		padding: 6px;
		border-radius: 4px;
		transition: all 0.2s;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.copy-btn:hover {
		background: #094771;
		border-color: #007acc;
		color: #ffffff;
	}

	.info-hint {
		font-size: 12px;
		color: #888888;
		margin: 4px 0 0 0;
		line-height: 1.5;
	}

	.form-group {
		margin-bottom: 20px;
	}

	.form-group label {
		display: flex;
		align-items: center;
		gap: 6px;
		font-size: 14px;
		font-weight: 500;
		color: #cccccc;
		margin-bottom: 8px;
	}

	.form-group label.required::after {
		content: '*';
		color: #f48771;
		margin-left: 4px;
	}

	.form-input,
	.form-textarea {
		width: 100%;
		padding: 10px 12px;
		background: #2a2d2e;
		border: 1px solid #3e3e42;
		border-radius: 6px;
		color: #ffffff;
		font-size: 14px;
		font-family: inherit;
		transition: all 0.2s;
		outline: none;
	}

	.form-input:focus,
	.form-textarea:focus {
		border-color: #007acc;
		background: #333333;
	}

	.form-input.error {
		border-color: #f48771;
	}

	.form-textarea {
		resize: vertical;
		min-height: 80px;
	}

	.form-row {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 16px;
	}

	.error-message {
		display: flex;
		align-items: center;
		gap: 6px;
		color: #f48771;
		font-size: 12px;
		margin-top: 6px;
	}

	.participants-control {
		display: flex;
		flex-direction: column;
		gap: 12px;
	}

	.checkbox-wrapper {
		display: flex;
		align-items: center;
		gap: 8px;
		cursor: pointer;
	}

	.checkbox {
		width: 18px;
		height: 18px;
		cursor: pointer;
		accent-color: #007acc;
	}

	.checkbox-wrapper span {
		font-size: 14px;
		color: #cccccc;
	}

	.drawer-footer {
		padding: 20px 32px;
		border-top: 1px solid #3e3e42;
		display: flex;
		justify-content: flex-end;
		gap: 12px;
	}

	.btn-primary,
	.btn-secondary {
		padding: 10px 24px;
		border-radius: 6px;
		font-size: 14px;
		font-weight: 500;
		cursor: pointer;
		transition: all 0.2s;
		border: none;
	}

	.btn-primary {
		background: #007acc;
		color: #ffffff;
	}

	.btn-primary:hover:not(:disabled) {
		background: #0e639c;
	}

	.btn-primary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.btn-secondary {
		background: transparent;
		border: 1px solid #3e3e42;
		color: #cccccc;
	}

	.btn-secondary:hover:not(:disabled) {
		background: #2a2d2e;
		border-color: #007acc;
		color: #ffffff;
	}

	.btn-secondary:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	/* Scrollbar */
	.drawer-content::-webkit-scrollbar {
		width: 10px;
	}

	.drawer-content::-webkit-scrollbar-track {
		background: #1e1e1e;
	}

	.drawer-content::-webkit-scrollbar-thumb {
		background: #424242;
		border-radius: 5px;
	}

	.drawer-content::-webkit-scrollbar-thumb:hover {
		background: #4e4e4e;
	}
</style>
