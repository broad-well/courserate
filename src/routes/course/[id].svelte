<div class="course">
<div class="course-hero">
{#if course == undefined}
    Loading... Hold tight!
{:else}

    <i>{course.school}</i>
    <div style="display: flex; flex-direction: row; align-items: center">
        <h2>{course.name}</h2>
        <mwc-icon-button-toggle onIcon="star" offIcon="star_border"
            bind:this={courseStar} on:click={courseStarUpdate} />
    </div>
    <p>{course.student_count} student(s) have taken this course
        <br>
        You <b>have {course.id in $state.me.coursesTaken ? '' : 'not '}</b> taken this course.
    </p>
    {#if course.id in $state.me.coursesTaken}
        <mwc-fab class="course-actions" icon="edit" extended={true} label="Write a Review" on:click={() => reviewDialog.show()} />
    {:else}
        <mwc-fab class="course-actions" icon="person_add" extended={true} label="Join Course" on:click={clickJoin} />
    {/if}
{/if}
</div>

{#if course != undefined}
<mwc-dialog heading={'Join ' + course.name} bind:this={joinDialog}>
    <mwc-select label="Your level" bind:this={joinLevelSelect}>
        {#each course.levels as level}
            <mwc-list-item value={level}>{level}</mwc-list-item>
        {/each}
    </mwc-select>
    <mwc-button slot="primaryAction" dialogAction="join" label="Join" icon="person_add"
        on:click={joinCourse}/>
</mwc-dialog>

<mwc-dialog heading="Write a Review" bind:this={reviewDialog}>
    <div>
        <mwc-textarea bind:this={reviewText}
            label="Your review of {course == undefined ? '<unknown>' : course.name}"
            fullwidth />
        
        <ul>
            <li>You are writing to students deciding whether to take this course.
                They usually have no control over what teacher they get.
                <b>Review the course, not the teacher(s).</b></li>
            <li>What advice would you give someone who is about to take this course?</li>
        </ul>
    </div>
    <mwc-button slot="secondaryAction" dialogAction="discard" label="Discard"
        icon="delete" on:click={() => { reviewText.value = ''; reviewDialog.close()}}/>
    <mwc-button slot="primaryAction" dialogAction="submit" label="Submit" icon="send"
        on:click={() => submitReview(reviewText.value)}/>
</mwc-dialog>

<div class="reviews">
{#each reviews as review}
    <div class="review">
        <div class="counter-container">
            <mwc-icon-button icon="expand_less" on:click={() => upvoteReview(review)}
                selected={review.my_vote === 'up' ? true : null} disabled={review.my_vote} />
            <span class="counter">{review.upvotes - review.downvotes}</span>
            <mwc-icon-button icon="expand_more" on:click={() => downvoteReview(review)}
                selected={review.my_vote === 'down' ? true : null} disabled={review.my_vote} />
        {#if review.mine}
            <div class="review-delete">
                <mwc-icon-button icon="delete" on:click={() => removeReview(review)} />
            </div>
        {/if}
        </div>
        <div class="review-text">
            {review.text}
        </div>
        <div class="review-timestamp">
            Posted {reviewPostTime(review)}
        </div>
    </div>
{/each}
</div>
{/if}
</div>

<ErrorSnackbar error={error} bind:this={errorBar} />

<script context="module">


    export async function preload(page, session) {
        return page.params;
    }
</script>

<script>
    export let id;

    import ErrorSnackbar from '../../components/ErrorSnackbar.svelte';

    import { get, post } from '../../transport';
    import { onMount } from 'svelte';
    import { state } from '../../client/store';
    
    let error = undefined, errorBar;

    let course = undefined, reviews = [];
    $: showJoinDialog = course !== undefined && course.levels.length > 1;

    function loadReviews() {
        get(`/api/course/${id}/reviews`).then(r => reviews = r);
    }
    onMount(() => {
        get(`/api/course/${id}`).then(c => course = c);
        loadReviews();
    });

    function reviewPostTime(review) {
        return new Date(review.post_time * 1000).toLocaleString('en-us');
    }

    let reviewDialog, reviewText;
    let courseStar;
    let joinDialog, joinLevelSelect;

    function courseStarUpdate() {
        post('/api/course/star', {id: course.id, star: courseStar.on})
            .catch(problem => {
                courseStar.on = false;
                error = problem;
                errorBar.show();
            });
    }

    function clickJoin() {
        if (showJoinDialog) {
            joinDialog.show();
        } else {
            joinCourse();
        }
    }
    function joinCourse() {
        const level = joinLevelSelect.value == '' || joinLevelSelect.value == undefined ? undefined : joinLevelSelect.value;
        post('/api/course/join', {id: course.id, level})
            .then(() => {
                // TODO allow user to indicate level
                state.update(s => {
                    s.me.coursesTaken[course.id] = {level};
                })
            });
    }
    function submitReview(content) {
        post('/api/review/add', {course_id: course.id, content: content})
            .then(response => {
                reviews.unshift(response);
                state.update(s => {
                    s.me.reviews.push(response.id);
                    return s;
                });
            });
    }
    function upvoteReview(review) {
        if ($state.me.votes[review.id] != null) return;
        post('/api/review/upvote', {id: review.id})
            .then(() => {
                review.upvotes += 1;
                state.update(s => {
                    s.me.votes[review.id] = 1;
                    return s;
                });
            });
    }
    function downvoteReview(review) {
        if ($state.me.votes[review.id] != null) return;
        post('/api/review/downvote', {id: review.id})
            .then(() => {
                review.downvotes += 1;
                state.update(s => {
                    s.me.votes[review.id] = -1;
                    return s;
                });
            });
    }
    function removeReview(review) {
        post('/api/review/remove', {id: review.id})
            .then(() => {
                reviews = reviews.filter(it => it.id !== review.id)
                state.update(s => {
                    const i = s.me.reviews.indexOf(review.id);
                    if (i !== -1) {
                        s.me.reviews.splice(i, 1);
                    }
                    return s;
                });
            });
    }
</script>

<style>

    @media screen and (max-width: 840px) {
        .course-hero mwc-fab {
            position: fixed !important;
            right: 20px !important;
            bottom: 20px !important;
        }
        .course-hero h2 {
            font-size: 24px;
            margin: 15px 0;
        }
    }
    .course {
        padding: 15px;
        max-width: 800px;
        margin: 5px auto;
    }
    .course-hero {
        margin: 5px;
        padding: 20px;
        background-color: #4B78BC;
        color: aliceblue;
        border-radius: 5px;
        position: relative;
    }
    .course-hero mwc-fab {
        position: absolute;
        right: 15px;
        bottom: -24px;
    }
    .counter-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        --mdc-icon-size: 20px;
        --mdc-icon-button-size: 24px;
        width: 60px;
    }
    .review {
        display: flex;
        align-items: center;
        padding: 14px;
    }
    .review-text {
        padding: 10px;
    }
    .review-delete {
        margin-top: 4px;
    }
    .review-timestamp {
        text-align: right;
        font-size: 12px;
        color: #666;
    }
    mwc-button.inverted {
        --mdc-theme-on-primary: var(--mdc-theme-primary);
        --mdc-theme-primary: #dedede;
    }
    mwc-icon-button {
        border-radius: 100%;
    }
    mwc-icon-button[selected] {
        background-color: #ddd;
    }
</style>