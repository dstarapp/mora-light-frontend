# Mora Light

## Vue

Use the Mora Light component according to the following steps.

### 1. Install the necessary packages

```sh
npm i -S @mora-light/core @mora-light/vue
```

### 2. Import css

```typescript
import '@mora-light/vue/index.css';
import '@mora-light/vue/iconfont.css';
```

### 3. How to use component

#### a. Method 1

If you want to use Light which is reviewed by Mora，you will know it's Anchor data. Include:

canister_id: For example: 'nciuh-jiaaa-aaaai-qo75a-cai'

hash: For example: 'AA5O64TBZ2FMJXM'

This way will automatically fetch Light data from the Mora's canister to display and run.

```ts
<script lang="ts" setup>
import { ref } from 'vue';
import { HttpAgent } from '@dfinity/agent';
import { WrappedMoraLight as WrappedMoraLightVue } from '@mora-light/vue';
import { ComponentStatus } from '@mora-light/core/types/running';

import '@mora-light/vue/index.css';
import '@mora-light/vue/iconfont.css';

const canister_id = ref('nciuh-jiaaa-aaaai-qo75a-cai')
const hash = ref('AA5O64TBZ2FMJXM')
const prop: string = JSON.stringify({
    canister_id: { // If the operation of the light requires some data
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
```

#### b. Method 2

If you want to construct Light data yourself.

```ts
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
    instruction: "Light Instruction", // Light Instruction
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
    canister_id: { // If the operation of this light requires certain data
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
            :data="data"
            :prop="prop"
            :status="status"
            :hostAgent="hostAgent"
        />
    </div>
</template>

<style lang="less"></style>
```
