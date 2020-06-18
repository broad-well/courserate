<main class="course">
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
    <p>
        {course.student_count} student(s) have taken this course
        <br>
        You have {course.id in $state.me.coursesTaken ? '' : 'not '} taken this course.
    </p>
    {#if course.id in $state.me.coursesTaken}
        <mwc-fab class="course-actions" icon="edit" extended={true}
            label="Write a Review" on:click={() => reviewDialog.show()} />
    {:else}
        <mwc-fab class="course-actions" icon="person_add" extended={true}
            label="Join Course Alumni" on:click={clickJoin} />
    {/if}
    {/if}
</div>

{#if course != undefined}
<mwc-dialog heading={'Join ' + course.name} bind:this={joinDialog}>
    {#each course.levels as level}
        <mwc-list-item value={level} on:click={() => joinCourse(level)}>{level}</mwc-list-item>
    {/each}
    <mwc-button slot="secondaryAction" dialogAction="cancel"
        label="Cancel" icon="cancel" />
</mwc-dialog>

<mwc-dialog heading="Write a Review" bind:this={reviewDialog}>
    <div>
        <mwc-textarea bind:this={reviewText} rows="7"
            placeholder="Your review of {course == undefined ? '<unknown>' : course.name}..."
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
    <Review {review} on:remove={() => removeReview(review)} />
{/each}
</div>
{/if}
</main>

<ErrorSnackbar error={error} bind:this={errorBar} />

<script context="module">


    export async function preload(page, session) {
        return page.params;
    }
</script>

<script>
    export let id;

    import ErrorSnackbar from '../../components/ErrorSnackbar.svelte';
    import Review from '../../components/Review.svelte';

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
        get(`/api/course/${id}`).then(c => course = c).then(() => {
            courseStar.on = $state.me.starredCourses.indexOf(course.id) !== -1;
        });
        loadReviews();
    });


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
            joinCourse(undefined);
        }
    }
    function joinCourse(level) {
        if (joinDialog != undefined) joinDialog.close();
        post('/api/course/join', {id: course.id, level})
            .then(() => state.update(s => {
                s.me.coursesTaken[course.id] = {level};
                return s;
            }))
            .then(() => course = course);
    }
    function submitReview(content) {
        post('/api/review/add', {course_id: course.id, content: content})
            .then(response => {
                reviews = [response, ...reviews];
                state.update(s => {
                    s.me.reviews.push(response.id);
                    return s;
                });
            });
    }
    function removeReview(review) {
        reviews = reviews.filter(it => it.id !== review.id);
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
</style>