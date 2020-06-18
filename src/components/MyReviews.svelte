<div class="card">
    <h3>
        <div class="row vcenter">
            <mwc-icon style="padding: 0 5px 0 0;">comment</mwc-icon>
            <span>My Reviews</span>
        </div>
    </h3>

    {#each $state.me.reviews as reviewId}
    <div>
        {#await get(`/api/review/info/${reviewId}`)}
            <span>Loading review...</span>
        {:then review}
            <Review {review} showCourse/>
        {/await}
    </div>
    {:else}
        <p>
            You have no reviews :(
        </p>
    {/each}
</div>

<script>
    import { state } from '../client/store';
    import { get } from '../transport';
    import Review from './Review.svelte';
</script>