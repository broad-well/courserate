<div class="card">
    <h3>
        <div class="row vcenter">
            <mwc-icon style="padding: 0 5px 0 0;">star</mwc-icon>
            <span>Starred Courses</span>
        </div>
    </h3>

    {#each $state.me.starredCourses as courseId}
    <a href={`/course/${courseId}`}>
    <mwc-list-item hasMeta={true} twoline={true}>
        {#await get(`/api/course/${courseId}`)}
            <span>Loading course...</span>
        {:then course}
            <span>{course.name}</span>
            <span slot="secondary">{course.student_count} student(s) enrolled</span>
            <mwc-icon slot="meta">chevron_right</mwc-icon>
        {/await}
    </mwc-list-item>
    </a>
    {:else}
    <p>
        You have no stars :(<br>
        <i>Psst: You are a star</i>
    </p>
    {/each}
</div>

<script>
    import { state } from '../client/store';
    import { get } from '../transport';
</script>