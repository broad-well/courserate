<main>
    <h2>Course Search</h2>
    
    <div class="container">
        <div style="display: flex; justify-content: center; align-items: center;">
            <div style="width: 70%;">
                <mwc-textfield fullwidth label="Course Search"
                    iconTrailing="search" helper="Search for a course..." outlined required maxlength="50"
                    bind:this={query} />
            </div>
            <div style="width: 30%; text-align: center;">
                <mwc-button label="Search" on:click={submitQuery} />
            </div>
        </div>
    </div>

    <mwc-list>
    {#each answers as course}
        <a href="/course/{course.id}">
            <mwc-list-item>
                <span>{course.name}</span>
                <mwc-icon slot="meta">chevron_right</mwc-icon>
            </mwc-list-item>
        </a>
    {/each}
    </mwc-list>
</main>

<style>
    main {
        max-width: 800px;
        margin: 20px auto;
        padding: 20px;
    }
</style>

<script>
    import { get } from '../transport';

    let query;
    let answers = [];

    function submitQuery() {
        get('/api/course/search', {q: query.value})
            .then(it => answers = it);
    }
</script>