<script lang="ts" setup>
import { ref } from 'vue';
import { Principal } from '@dfinity/principal';
import { HttpAgent } from '@dfinity/agent';
import { WrappedMoraLight as WrappedMoraLightVue } from '@mora-light/vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { LightCore } from '@mora-light/core/types';

import '@mora-light/vue/index.css';
import '@mora-light/vue/iconfont.css';

// Construct Light data by yourself
let core: LightCore = {
    version: '0.0.1',
    data: [],
    transmits: [],
};

const info = {
    name: 'Light', // Light Name
    cover: 'QmfVV8acYbEnhjMN4G8Pru2gzLcsam8Y12zZt2TTNvsy9S', // Cover Image
    thumbnail: 'QmPMgAEogb3oaygekaEVZGvTtRcrag9RUYiizt7sPk4oSW', // Thumbnail Image
    categories: ['Tools'], // categories
    runnable_planet: { All: null }, // Runnable Planet
    instruction: 'Light Instruction', // Light Instruction
};
const value = {
    hash: 'XXX', // Custom data
    id: 'XXX', // Custom data
    created: BigInt(new Date().getTime() * 1000000),
    creator: Principal.fromText('aaaaa-aa'),
    updated: BigInt(new Date().getTime() * 1000000),
    info_json: JSON.stringify(info),
    core_json: JSON.stringify(core),
    audited: BigInt(new Date().getTime() * 1000000),
    auditor: Principal.fromText('aaaaa-aa'),
};
const data = { value };
const prop: string = JSON.stringify({
    canister_id: {
        // If the operation of this light requires certain data
        type: 'principal',
        value: 'ipcaz-wiaaa-aaaai-qoy4q-cai',
    },
});
const status = ref<ComponentStatus>('running'); // Run status
const hostAgent = ref<HttpAgent | undefined>(undefined); // If you have login information, you can provide Light components
</script>

<template>
    <div class="test-light">
        <WrappedMoraLightVue :data="data" :prop="prop" :status="status" :hostAgent="hostAgent" />
    </div>
</template>

<style lang="less"></style>
