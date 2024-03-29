<script setup lang="ts">
import { onMounted, computed } from 'vue';
import { useStore } from 'vuex';
import { changeLanguage } from './locale';
import { UserText } from './store';
import { getLocaleText } from './store/modules/user';

const store = useStore();

const locale = computed(() => store.getters[UserText + '/' + getLocaleText]);

onMounted(() => changeLanguage(locale.value));

</script>

<template>
    <router-view />
</template>

<style lang="less"></style>
