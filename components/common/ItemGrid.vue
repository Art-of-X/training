<template>
  <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
    <div
      v-for="item in items"
      :key="item.id"
      class="group relative aspect-square w-full rounded-lg bg-secondary-100 dark:bg-secondary-800 overflow-hidden portfolio-tile"
    >
      <!-- Media preview -->
      <template v-if="item.dendrogramSvg || item.filePath || item.link">
        <!-- SVG content preview -->
        <img
          v-if="item.dendrogramSvg"
          :src="svgToDataUrl(item.dendrogramSvg)"
          alt=""
          class="tile-media absolute inset-0 w-full h-full object-contain"
          loading="lazy"
        />
        
        <!-- Image preview -->
        <img
          v-else-if="isImage(previewUrl(item))"
          :src="previewUrl(item)"
          alt=""
          :class="['tile-media absolute inset-0 w-full h-full', isSvg(previewUrl(item)) ? 'object-contain p-6' : 'object-cover']"
          loading="lazy"
        />

        <!-- Video preview -->
        <video
          v-else-if="isVideo(previewUrl(item))"
          :src="previewUrl(item)"
          class="tile-media absolute inset-0 w-full h-full object-cover"
          preload="metadata"
          controls
        />

        <!-- Audio preview -->
        <div v-else-if="isAudio(previewUrl(item))" class="tile-media absolute inset-0 w-full h-full flex items-center justify-center p-4">
          <audio :src="previewUrl(item)" controls class="w-full"></audio>
        </div>

        <!-- PDF preview -->
        <iframe
          v-else-if="isPdf(previewUrl(item))"
          :src="previewUrl(item)"
          class="tile-media absolute inset-0 w-full h-full"
        />

        <!-- YouTube embed -->
        <iframe
          v-else-if="youtubeEmbed(previewUrl(item))"
          :src="youtubeEmbed(previewUrl(item)) as string"
          class="tile-media absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowfullscreen
        />

        <!-- Vimeo embed -->
        <iframe
          v-else-if="vimeoEmbed(previewUrl(item))"
          :src="vimeoEmbed(previewUrl(item)) as string"
          class="tile-media absolute inset-0 w-full h-full"
          allow="autoplay; fullscreen; picture-in-picture"
          allowfullscreen
        />

        <!-- Fallback iframe (may be blocked by X-Frame-Options) -->
        <iframe
          v-else-if="item.link"
          :src="item.link"
          class="tile-media absolute inset-0 w-full h-full"
          referrerpolicy="no-referrer"
          sandbox="allow-scripts allow-same-origin allow-popups allow-forms"
        />

        <!-- Fallback cover with domain badge -->
        <div v-else class="tile-media absolute inset-0 w-full h-full flex items-center justify-center">
          <div class="text-center text-secondary-500  text-sm ">
            {{ domainOf(item.link || '') }}
          </div>
        </div>
      </template>

      <!-- Text preview -->
      <div v-else-if="item.text" class="tile-media absolute inset-0 w-full h-full flex items-center justify-center p-4">
          <p class="text-secondary-700 dark:text-secondary-300  text-sm ">{{ item.text }}</p>
      </div>


      <!-- Description overlay -->
      <div
        class="absolute bottom-0 left-0 right-0 p-3  text-sm  font-medium transition-opacity tile-title z-20 pointer-events-none"
        :class="alwaysShowLabel ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'"
      >
        <div class="truncate w-full text-start">{{ tileTitle(item) }}</div>
      </div>



      <!-- Delete button -->
      <button
        @click.stop="$emit('delete', item.id)"
        class="absolute top-2 right-2 inline-flex items-center justify-center w-8 h-8 rounded-full bg-transparent hover:bg-transparent opacity-0 group-hover:opacity-100 transition z-30"
        aria-label="Delete item"
      >
        <div class="x-mask-secondary w-6 h-6" aria-hidden="true"></div>
      </button>
    </div>

    <!-- Add tile (optional, always last) -->
    <button
      v-if="showAdd"
      type="button"
      class="group relative aspect-square w-full rounded-lg border-2 border-dashed border-b-0 border-secondary-300 dark:border-secondary-600 hover:border-primary-500 hover:bg-secondary-50 dark:hover:bg-secondary-800/50 transition"
      style="aspect-ratio: 1 / 1;"
      @click="$emit('add')"
      @dragenter.prevent
      @dragover.prevent
      @drop.prevent="$emit('add')"
      aria-label="Add item"
    >
      <div class="absolute inset-0 flex flex-col items-center justify-center text-secondary-500 group-hover:text-primary-600">
        <div class="add-mask w-8 h-8 mb-2" aria-hidden="true"></div>
        <span class=" text-sm  font-medium">{{ addLabel }}</span>
      </div>
    </button>
  </div>
</template>

<script setup lang="ts">
import { defineProps, defineEmits, computed } from 'vue';

interface Item {
  id: string;
  description?: string;
  link?: string;
  filePath?: string;
  text?: string;
  hasDendrogram?: boolean;
  dendrogramSvg?: string | null;
}

withDefaults(defineProps<{
  items: Item[];
  showAdd?: boolean;
  alwaysShowLabel?: boolean;
  addLabel?: string;
}>(), {
  addLabel: 'Add'
});

defineEmits(['delete','add']);

// Helpers for preview and formatting
const domainOf = (urlStr: string) => {
  try { return new URL(urlStr).hostname.replace(/^www\./, '') } catch { return '' }
};

const hasExt = (urlStr: string, exts: string[]) => {
  try {
    const u = new URL(urlStr);
    const path = u.pathname.toLowerCase();
    return exts.some(ext => path.endsWith(ext));
  } catch {
    const lower = (urlStr || '').toLowerCase();
    return exts.some(ext => lower.includes(ext));
  }
};

const isImage = (urlStr: string) => hasExt(urlStr, ['.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg']);
const isSvg = (urlStr: string) => hasExt(urlStr, ['.svg']);
const isVideo = (urlStr: string) => hasExt(urlStr, ['.mp4', '.webm', '.ogg']);
const isAudio = (urlStr: string) => hasExt(urlStr, ['.mp3', '.wav', '.ogg']);
const isPdf = (urlStr: string) => hasExt(urlStr, ['.pdf']);

const youtubeEmbed = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('youtube.com')) {
      const v = url.searchParams.get('v');
      return v ? `https://www.youtube.com/embed/${v}` : null;
    }
    if (url.hostname.includes('youtu.be')) {
      const id = url.pathname.replace('/', '');
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
  } catch {}
  return null;
};

const vimeoEmbed = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    if (url.hostname.includes('vimeo.com')) {
      const id = url.pathname.split('/').filter(Boolean)[0];
      return id ? `https://player.vimeo.com/video/${id}` : null;
    }
  } catch {}
  return null;
};

const previewUrl = (item: Item) => item.filePath || item.link || '';

const svgToDataUrl = (svg: string | null) => {
  try {
    if (!svg) return '';
    return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
  } catch {
    return '';
  }
};

// no helpers needed for inline SVG


const getFileNameFromUrl = (urlStr: string) => {
  try {
    const url = new URL(urlStr);
    const base = url.pathname.split('/').pop() || ''
    return base.includes('_') ? base.substring(base.indexOf('_') + 1) : base;
  } catch {
    const base = (urlStr.split('/').pop() || '');
    return base.includes('_') ? base.substring(base.indexOf('_') + 1) : base;
  }
};
const tileTitle = (item: Item) => {
  if (item.description) return item.description;
  if (item.filePath) return getFileNameFromUrl(item.filePath);
  if (item.link) return domainOf(item.link);
  if (item.text) return "Text Snippet";
  return '';
};
</script>

<style scoped>
.add-mask {
  background-color: currentColor;
  -webkit-mask: url("/svg/icons/Add.svg") center / contain no-repeat;
  mask: url("/svg/icons/Add.svg") center / contain no-repeat;
}
.x-mask-secondary {
  background-color: var(--header-nav-active-color);
  -webkit-mask: url("/svg/x.svg") center / contain no-repeat;
  mask: url("/svg/x.svg") center / contain no-repeat;
}

.portfolio-tile { position: relative; }
.portfolio-tile { position: relative; aspect-ratio: 1 / 1; }
.portfolio-tile .tile-media { position: absolute; z-index: 0; transition: opacity 150ms ease-out; width: 100%; height: 100%; }
.portfolio-tile:hover { background-color: hsl(var(--color-primary-500)); }
.portfolio-tile:hover .tile-media { opacity: 0; pointer-events: none; }
.tile-title { opacity: 0; pointer-events: none; }
.portfolio-tile:hover .tile-title { opacity: 1; color: var(--header-nav-active-color); }

/* SVG dendrogram styling */
.portfolio-tile .tile-media svg {
  width: 100% !important;
  height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  object-fit: contain;
  display: block;
}
</style>
