<script lang="ts">
	import type { TeamStatus } from '$lib/types';

	interface Props {
		team: TeamStatus;
		onClose: () => void;
	}

	let { team, onClose }: Props = $props();
</script>

<!-- Placeholder for ReportModal - Full implementation needed -->
<div class="modal-overlay" onclick={onClose} role="button" tabindex="-1">
	<div class="modal-container" onclick={(e) => e.stopPropagation()} role="dialog">
		<div class="modal-header">
			<div class="modal-header-info">
				<div class="modal-team-avatar">
					{team.teamName.charAt(0).toUpperCase()}
				</div>
				<div>
					<h2>Report — {team.teamName}</h2>
					<p class="modal-subtitle">Session Report</p>
				</div>
			</div>
			<div class="modal-actions">
				<button class="modal-close-btn" onclick={onClose}>&times;</button>
			</div>
		</div>

		<div class="modal-body">
			<div class="modal-empty">
				<p>Report functionality is being implemented.</p>
				<p>Team: {team.teamName}</p>
				<p>Status: {team.status}</p>
				<p>Last Seen: {team.lastSeen}</p>
			</div>
		</div>
	</div>
</div>

<style>
	@import './ReportModal.css';
</style>
