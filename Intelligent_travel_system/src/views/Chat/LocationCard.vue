<template>
  <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 w-64 my-2">
    <div class="relative h-32 bg-gray-100">
      <img 
        :src="displayImage" 
        class="w-full h-full object-cover" 
        alt="Location Map"
        loading="lazy"
      />
      <div v-if="data.distance" class="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded-full">
        距您 {{ data.distance }}
      </div>
    </div>

    <div class="p-3">
      <div class="flex justify-between items-start">
        <h3 class="font-bold text-gray-800 text-base truncate flex-1">{{ data.name }}</h3>
        <span v-if="data.rating" class="text-orange-500 text-xs font-bold flex items-center">
          ★ {{ data.rating }}
        </span>
      </div>
      
      <p class="text-gray-500 text-xs mt-1 truncate">{{ data.address }}</p>

      <div class="mt-3 flex gap-2">
        <button 
          @click="handleNavigate"
          class="flex-1 bg-indigo-50 text-indigo-600 text-xs py-2 rounded-md font-medium hover:bg-indigo-100 transition-colors flex items-center justify-center gap-1"
        >
          <span>📍</span> 导航
        </button>
        <button 
          v-if="data.phone"
          class="flex-1 bg-gray-50 text-gray-600 text-xs py-2 rounded-md font-medium hover:bg-gray-100 transition-colors"
        >
          电话
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { LocationData } from '../../types/api';
import { getStaticMapUrl, openNavigation } from '../../utils/amap';

const props = defineProps<{
  data: LocationData;
}>();

// 优先显示后端传来的实景图，如果没有则自动生成地图
const displayImage = computed(() => {
  if (props.data.images && props.data.images.length > 0) {
    return props.data.images[0];
  }
  return getStaticMapUrl(props.data.lat, props.data.lng);
});

const handleNavigate = () => {
  openNavigation(props.data.lat, props.data.lng, props.data.name);
};
</script>