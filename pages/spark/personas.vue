<template>
  <div class="container mx-auto p-8 space-y-8">
    <section class="border-b-4 border-primary-500 pb-4">
      <h1 class="text-3xl font-bold">Personas</h1>
    </section>
    <section>
      <div v-if="pending" class="text-center">Loading...</div>
      <div v-else-if="error" class="text-center text-red-500">
        An error occurred: {{ error.message }}
      </div>
      <div v-else>
        <DendrogramGrid :sparks="sparks" @chat="handleChat" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import DendrogramGrid from "~/components/spark/DendrogramGrid.vue";

type SparkDendrogram = {
  id: string;
  dendrogramSvg: string;
  dendrogramPng?: string;
  updatedAt: string;
};

type Spark = {
  id: string;
  name: string;
  description: string;
  discipline: string;
  dendrograms: SparkDendrogram[];
};

const { data, pending, error } = useFetch<{ data: Spark[] }>("/api/spark");
const sparks = computed(() => data.value?.data ?? []);

// Handle chat button click
const handleChat = (spark: Spark) => {
  // Navigate to chat page with the selected spark
  navigateTo({
    path: "/training/chat",
    query: {
      spark: spark.id,
      sparkName: spark.name,
      sparkDescription: spark.description,
    },
  });
};
</script>
