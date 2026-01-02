<template>
  <div class="bg-white rounded-lg overflow-hidden shadow-sm border border-gray-100 w-64 my-2 flex">
    <div class="w-24 h-24 flex-shrink-0 bg-gray-100">
      <img :src="data.imageUrl" class="w-full h-full object-cover" alt="Product" />
    </div>
    
    <div class="flex-1 p-2 flex flex-col justify-between">
      <div>
        <h4 class="text-sm font-bold text-gray-800 line-clamp-2">{{ data.name }}</h4>
        <p class="text-xs text-gray-400 mt-1">{{ data.shop }}</p>
      </div>
      
      <div class="flex justify-between items-end mt-2">
        <span class="text-red-500 font-bold text-sm">{{ data.price }}</span>
        <button class="bg-indigo-600 text-white text-xs px-2 py-1 rounded transform active:scale-95">
          去看看
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { ProductData } from '../../types/api';

defineProps<{
  data: ProductData;
}>();
</script>