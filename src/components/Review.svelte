<div class="review">
    <div class="counter-container">
        <mwc-icon-button icon="expand_less" on:click={() => upvoteReview(review)}
            selected={$state.me.votes[review.id] === 1 ? true : null} disabled={$state.me.votes[review.id] !== undefined ? true : null} />
        <span class="counter">{score}</span>
        <mwc-icon-button icon="expand_more" on:click={() => downvoteReview(review)}
            selected={$state.me.votes[review.id] === -1 ? true : null} disabled={$state.me.votes[review.id] !== undefined ? true : null} />
    {#if $state.me.reviews.indexOf(review.id) !== -1}
        <div class="review-delete">
            <mwc-icon-button icon="delete" on:click={() => removeReview(review)} />
        </div>
    {/if}
    </div>
    <div class="review-text">
        {review.text}
        <div class="review-timestamp">
            Posted {reviewPostTime(review)}
            {#if showCourse}
                <br>
                <a href="/course/{review.courseId}" style="text-decoration: underline">View Course</a>
            {/if}
        </div>
    </div>
</div>

<script>
import { state } from '../client/store';
import { post } from '../transport';
import { createEventDispatcher } from 'svelte';

export let review;
export let showCourse = false;
let score = review.upvotes - review.downvotes;

const dispatch = createEventDispatcher();

function reviewPostTime(review) {
    return new Date(review.post_time).toLocaleString('en-us');
}

function upvoteReview(review) {
    if ($state.me.votes[review.id] != null) return;
    post('/api/review/upvote', {id: review.id})
        .then(() => {
            score += 1;
            state.update(s => {
                s.me.votes[review.id] = 1;
                return s;
            });
            dispatch('upvote');
        });
}
function downvoteReview(review) {
    if ($state.me.votes[review.id] != null) return;
    post('/api/review/downvote', {id: review.id})
        .then(() => {
            score -= 1;
            state.update(s => {
                s.me.votes[review.id] = -1;
                return s;
            });
            dispatch('downvote');
        });
}
function removeReview(review) {
    post('/api/review/remove', {id: review.id})
        .then(() => {
            state.update(s => {
                const i = s.me.reviews.indexOf(review.id);
                if (i !== -1) {
                    s.me.reviews.splice(i, 1);
                }
                return s;
            });
            dispatch('remove');
        });
}
</script>

<style>
.review {
    display: flex;
    align-items: center;
    padding: 14px;
    width: 100%;
}
.review-text {
    padding: 10px;
}
.review-delete {
    margin-top: 4px;
}
.review-timestamp {
    font-size: 12px;
    color: #666;
    margin-top: 5px;
}

.counter-container {
    display: flex;
    flex-direction: column;
    align-items: center;
    --mdc-icon-size: 20px;
    --mdc-icon-button-size: 24px;
    width: 50px;
}
mwc-icon-button {
    border-radius: 100%;
}
mwc-icon-button[selected] {
    background-color: #ddd;
}
</style>