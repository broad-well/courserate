<svelte:head>
	<title>CourseRate - Home</title>
</svelte:head>

<main>
	{#if $state.me != undefined}
		<h2>Welcome, {$state.me.name}!</h2>
		<div class="grid-container">
			<div class="column">
				<MyStars />
			</div>
			<div class="column">
				<MyReviews />
			</div>
		</div>
	{:else}
		Loading... Hold tight!
	{/if}
</main>

<script>
	import { state } from '../client/store';
	import MyStars from '../components/MyStars.svelte';
	import MyReviews from '../components/MyReviews.svelte';
</script>

<style>
	main {
		padding: 15px;
	}
	.grid-container {
		display: flex;
		flex-direction: column;
	}
	@media screen and (min-width: 800px) {
		.grid-container {
			flex-direction: row;
			width: 100%;
		}
	}
</style>