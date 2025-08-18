<template>
  <div class="container mx-auto px-8 pt-8">
    <section class="border-b-4 border-primary-500 pb-4 ">
      <div class="flex flex-wrap items-center justify-between gap-4">
        <h1 class="text-3xl font-bold">Personas</h1>

        <div class="flex items-center gap-2 justify-end">
          <input
            v-model="filters.nameKeyword"
            type="text"
            placeholder="Search by name..."
            class="form-input w-48"
          />
          <select v-model="filters.discipline" class="form-select">
            <option value="">All disciplines</option>
            <option v-for="discipline in availableDisciplines" :key="discipline" :value="discipline">
              {{ discipline }}
            </option>
          </select>
          <select v-model="filters.hasUser" class="form-select">
            <option value="">All sparks</option>
            <option value="true">With user</option>
            <option value="false">Without user</option>
          </select>
          <button v-if="hasActiveFilters" @click="clearFilters" class="btn-secondary">
            Clear
          </button>
        </div>
      </div>
      <div class="mt-4 text-sm text-secondary-600 dark:text-secondary-400">
        Showing {{ filteredSparks.length }} of {{ sparks.length }} sparks.
      </div>
    </section>

    <section>
      <div v-if="pending" class="text-center">Loading...</div>
      <div v-else-if="error" class="text-center text-red-500">
        An error occurred: {{ error.message }}
      </div>
      <div v-else-if="filteredSparks.length === 0 && hasActiveFilters" class="text-center py-12">
        <div class="text-secondary-500">
          <svg class="w-16 h-16 mx-auto mb-4 text-secondary-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"></path>
          </svg>
          <p class="text-lg font-medium mb-2">No sparks found</p>
          <p class="text-sm">Try adjusting your filters or <button @click="clearFilters" class="text-primary-500 hover:text-primary-600 underline">clear all filters</button></p>
        </div>
      </div>
      <div v-else>
        <SparkGrid :sparks="filteredSparks" @chat="handleChat" />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import SparkGrid from "~/components/spark/Grid.vue";

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
  userId?: string | null; // Add userId field for filtering
};

const { data, pending, error } = useFetch<{ data: Spark[] }>("/api/spark");
const sparks = computed(() => data.value?.data ?? []);

// Filter state
const filters = ref({
  nameKeyword: '',
  discipline: '',
  hasUser: ''
});

// Available disciplines for the dropdown
const availableDisciplines = computed(() => {
  const disciplines = new Set(sparks.value.map(spark => spark.discipline));
  return Array.from(disciplines).sort();
});

// Check if any filters are active
const hasActiveFilters = computed(() => {
  return filters.value.nameKeyword || filters.value.discipline || filters.value.hasUser;
});

// Filtered sparks based on current filters
const filteredSparks = computed(() => {
  return sparks.value.filter(spark => {
    // Name keyword filter
    if (filters.value.nameKeyword && !spark.name.toLowerCase().includes(filters.value.nameKeyword.toLowerCase())) {
      return false;
    }
    
    // Discipline filter
    if (filters.value.discipline && spark.discipline !== filters.value.discipline) {
      return false;
    }
    
    // Associated user filter
    if (filters.value.hasUser !== '') {
      const hasUser = Boolean(spark.userId);
      if (filters.value.hasUser === 'true' && !hasUser) {
        return false;
      }
      if (filters.value.hasUser === 'false' && hasUser) {
        return false;
      }
    }
    
    return true;
  });
});

// Clear all filters
const clearFilters = () => {
  filters.value = {
    nameKeyword: '',
    discipline: '',
    hasUser: ''
  };
};

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
