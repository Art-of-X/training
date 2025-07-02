<script lang="ts" setup>

definePageMeta({
    layout: 'default',
});
</script>

<template>
        <main>
            <div class="contentDoc py-10 md:w-2/3">
                <ContentDoc />
            </div>
        </main>
</template>


<style>
.contentDoc h1 {
    font-size: 2.5rem !important;
    font-weight: 700;
    margin-bottom: 1rem;
}

.contentDoc h2 {
    font-size: 2rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.contentDoc h3 {
    font-size: 1.75rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.contentDoc h4 {
    font-size: 1.5rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.contentDoc h5 {
    font-size: 1.25rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.contentDoc h6 {
    font-size: 1rem;
    font-weight: 600;
    margin-bottom: 1rem;
}

.contentDoc p {
    font-size: 1.25rem;
    line-height: 1.75rem;
    margin-bottom: 1rem;
}

.contentDoc ul {
    margin-bottom: 1rem;
}

.contentDoc ol {
    margin-bottom: 1rem;
}
</style>