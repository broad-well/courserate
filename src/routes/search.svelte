<main>
    <h2>Course Search</h2>
    
    <div class="container">
        <div style="display: flex; justify-content: center; align-items: center;">
            <div style="width: 70%; margin-right: 8px;">
                <mwc-textfield placeholder="Search for a course..." fullwidth={true}
                    iconTrailing="search"
                    outlined={true} required={true} maxlength="50"
                    bind:this={query}
                    on:keyup={searchKeyDown} />
            </div>
            <div style="width: 30%; text-align: center;">
                <mwc-button label="Search" on:click={submitQuery} raised={true} icon="search" />
            </div>
        </div>
    </div>

    <mwc-list>
    {#await answers}
        Searching...
    {:then ans}
    {#each ans as course}
        <a href="/course/{course.id}">
            <mwc-list-item>
                <span>{course.name}</span>
                <mwc-icon slot="meta">chevron_right</mwc-icon>
            </mwc-list-item>
        </a>
    {:else}
        <i>No results found...</i>
    {/each}
    {/await}
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
    let answers = Promise.resolve([]);

    function searchKeyDown(event) {
        if (event.key === 'Enter') submitQuery();
    }
    function submitQuery() {
        answers = get('/api/course/search', {q: query.value});
    }
</script>