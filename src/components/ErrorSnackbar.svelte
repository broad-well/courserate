<mwc-snackbar bind:this={snackbar} labelText={error} />

<script>
    let snackbar;
    export let error;

    export function show() {
        snackbar.open();
    }
</script>