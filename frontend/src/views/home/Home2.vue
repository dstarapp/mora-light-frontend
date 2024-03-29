<script lang="ts" setup>
import { ref } from 'vue';
import { HttpAgent } from '@dfinity/agent';
// import { WrappedMoraLight as WrappedMoraLightVue } from '@mora-light/vue';
import WrappedMoraLightVue from '../../../../packages/vue/src/wrapped/index.vue';

import { ComponentStatus } from '@mora-light/core/types/running';

import '@mora-light/vue/index.css';
import '@mora-light/vue/iconfont.css';

const canister_id = ref('nciuh-jiaaa-aaaai-qo75a-cai');
const hash = ref('JN7XUNBK47G3S3T');
const prop: string = JSON.stringify({
    canister_id: {
        // If the operation of the light requires some data
        type: 'principal',
        value: 'ipcaz-wiaaa-aaaai-qoy4q-cai',
    },
});
const status = ref<ComponentStatus>('running'); // Run status
const hostAgent = ref<HttpAgent | undefined>(undefined); // If you have login information, you can provide Light components
</script>

<template>
    <div class="test-light">
        <WrappedMoraLightVue
            :anchor="{ canister_id, hash }"
            :prop="prop"
            :status="status"
            :hostAgent="hostAgent"
        />
    </div>
</template>

<style lang="less"></style>
