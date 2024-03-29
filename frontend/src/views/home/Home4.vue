<script lang="ts" setup>
import { ref } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { Principal } from '@dfinity/principal';
import { LightCore } from '@mora-light/core/types';
import WrappedMoraLightVue from '../../../../packages/vue/src/wrapped/index.vue';
import '../../../../packages/vue/src//assets/iconfont/iconfont.css';

let core: LightCore = {
    version: '0.0.1',
    data: [
        {
            source: 'input',
            input: {
                result: { type: 'int64' },
            },
        },
        {
            source: 'input',
            input: {
                result: { type: 'float64' },
            },
        },
        {
            source: 'input',
            input: {
                result: { type: 'text' },
            },
        },
        {
            source: 'input',
            input: {
                result: { type: 'principal' },
            },
        },
        {
            source: 'input',
            input: {
                result: {
                    type: 'opt',
                    subtype: {
                        type: 'nat8',
                    },
                },
            },
        },
    ],
    trigger: { type: 'button', text: 'Run', loading: false },
    transmits: [],
};

const info = {
    name: 'test light',
    cover: 'QmfVV8acYbEnhjMN4G8Pru2gzLcsam8Y12zZt2TTNvsy9S',
    thumbnail: 'QmPMgAEogb3oaygekaEVZGvTtRcrag9RUYiizt7sPk4oSW',
    categories: ['Tools'],
    runnable_planet: { All: null },
    instruction:
        "Regardless of the business wars between Web2 platforms, but when most of the creators' needs can be partially met on Web2, it is easy to be confused.Regardless of the business wars between Web2 platforms, but when most of the creators' needs can be partially met on Web2, it is easy to be confused.",
};
const value = {
    hash: 'VDDKSXIY3FIZMWJ',
    id: 'GM3TGMIKZI',
    created: BigInt('1683278864243388262'),
    creator: Principal.fromText('aaaaa-aa'),
    updated: BigInt('1683278864243388262'),
    info_json: JSON.stringify(info),
    core_json: JSON.stringify(core),
    audited: BigInt('1683278864243388262'),
    auditor: Principal.fromText('aaaaa-aa'),
};
const data = { value };
// const status: ComponentStatus = 'preview';
// const status: ComponentStatus = 'using';
const status: ComponentStatus = 'running';
// const prop: string = JSON.stringify({});
const prop: string = JSON.stringify({
    n: {
        type: 'principal',
        value: 'ipcaz-wiaaa-aaaai-qoy4q-cai',
    },
});

const isDark = ref(false);
const onDark = (type) => {
    if (type) {
        isDark.value = true;
        document.querySelectorAll('#app')[0].className = 'dark';
    } else {
        isDark.value = false;
        document.querySelectorAll('#app')[0].className = 'light';
    }
};
</script>

<template>
    <div class="test">
        <div class="isDark" v-if="!isDark" @click="onDark(true)">dark</div>
        <div class="isDark" v-if="isDark" @click="onDark(false)">light</div>
        <div class="test2">Light Dev Start</div>
        <WrappedMoraLightVue :hostAgent="undefined" :data="data" :status="status" :prop="prop" />
        <div class="test2">Light Dev End</div>
    </div>
</template>

<style lang="less">
.test {
    @apply dark:(bg-dark-900);
    .test2 {
        margin: 10px auto;
        color: black;
    }

    .isDark {
        color: #ff0000;
        cursor: pointer;
    }
}
</style>
