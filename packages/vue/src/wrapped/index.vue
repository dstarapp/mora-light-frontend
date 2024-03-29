<script lang="ts" setup>
import { PropType, computed, nextTick, ref, watch } from 'vue';
import { LightExecutingQueryResult } from '../canisters/core_worker/core_worker.did.d';
import { LightCoreData } from '../types/core';
import { queryLightCoreData } from '../canisters/core_worker/apis';
import { ComponentStatus } from '@mora-light/core/types/running';
import MoraLightsVue from '../lights';

const props = defineProps({
    hostAgent: {
        required: true,
    },
    data: {
        type: Object as PropType<LightExecutingQueryResult>,
        required: false,
    },
    anchor: {
        type: Object as PropType<{ canister_id: string; hash: string }>,
        required: false,
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: false,
    },
    prop: {
        type: String,
        required: false,
    },
});

const no_data = ref(!props.data && !props.anchor);

const data = ref<LightExecutingQueryResult | undefined>(props.data);

const dataStatus = computed<'' | 'none' | 'frozen' | 'value'>(() =>
    data.value ? (Object.keys(data.value)[0] as any) : '',
);

const frozenReason = computed(() =>
    data.value && (data.value as any)['frozen'] ? (data.value as any)['frozen'] : '',
);

const lightCoreData = computed<LightCoreData | undefined>(() =>
    data.value && dataStatus.value === 'value' ? (data.value as any)['value'] : '',
);

const loadingError = ref<string>('');
const loading = ref<boolean>(false);

watch(
    () => [props.data, props.anchor],
    () => {
        no_data.value = true;
        nextTick(() => {
            no_data.value = !props.data && !props.anchor;
            if (props.data) {
                loadingError.value = '';
                loading.value = false;
                data.value = props.data;
            } else if (props.anchor) {
                loadingError.value = '';
                loading.value = true;
                data.value = undefined;
                queryLightCoreData(props.anchor.canister_id, props.anchor.hash)
                    .then((d) => {
                        data.value = d;
                    })
                    .catch((e) => {
                        loadingError.value = `${e}`;
                    })
                    .finally(() => (loading.value = false));
            }
        });
    },
    { immediate: true },
);

watch(
    () => lightCoreData.value,
    () => {
        if (!lightCoreData.value) return;
    },
    { immediate: true },
);
</script>

<template>
    <div class="wrapped-mora-light-content">
        <div class="wrapped-style" v-if="dataStatus !== 'value'">
            <template v-if="no_data">
                <div class="no-data">
                    <i class="iconfont icon-no"></i>
                    <p>No data</p>
                </div>
            </template>
            <template v-else-if="loadingError">
                <div class="loading-error">
                    <i class="iconfont icon-plugin-error"></i>
                    <p>{{ loadingError }}</p>
                </div>
            </template>
            <template v-else-if="loading">
                <div class="loading">
                    <div class="loading-animation"></div>
                    <strong>Loading...</strong>
                </div>
            </template>
            <template v-else-if="dataStatus === 'none'">
                <div class="status-none">
                    <img src="../assets/svg/light-not-exist.svg" alt="" />
                    <p>The light does not exist</p>
                </div>
            </template>
            <template v-else-if="dataStatus === 'frozen'">
                <div class="status-frozen">
                    <i class="iconfont icon-plugin-takeoff"></i>
                    <b>{{ frozenReason }}</b>
                </div>
            </template>
        </div>
        <div
            class="status-value"
            :canister-id="props.anchor?.canister_id ?? ''"
            :hash="props.anchor?.hash ?? ''"
            :prop="props.prop ?? '{}'"
            v-if="dataStatus === 'value'"
        >
            <MoraLightsVue
                :hostAgent="props.hostAgent"
                :status="props.status ?? 'running'"
                :data="lightCoreData!"
                :prop="props.prop ?? '{}'"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
@import '../assets/less/main.less';

.wrapped-mora-light-content {
    width: calc(100% - 20px);
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;
    margin: 0 10px;
    position: relative;

    > div {
        width: 100%;
        height: 100%;
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;

        &.wrapped-style {
            border-radius: 14px;
            box-sizing: border-box;
            background: linear-gradient(108.49deg, #34d399 3.38%, #7def84 101.22%),
                linear-gradient(0deg, rgba(255, 255, 255, 0.92), rgba(255, 255, 255, 0.92));
            backdrop-filter: blur(12.5px);

            > div {
                margin: 3.5px;
                width: 100%;
                height: 100%;
                max-height: 429px;
                min-height: 236px;
                border: 3px solid #00000000;
                border-radius: 11px;
                background: rgba(255, 255, 255, 0.92);
                display: flex;
                flex-direction: row;
                justify-content: center;
                align-items: center;

                &.no-data,
                &.loading-error,
                &.loading,
                &.status-none,
                &.status-frozen {
                    flex-direction: column;

                    i {
                        font-size: 66px;
                        color: #dddddd;
                        line-height: 58px;
                    }

                    p {
                        font-style: normal;
                        font-weight: 400;
                        font-size: 16px;
                        line-height: 19px;
                        color: #999999;
                        margin: 14px 0 0 0;
                    }

                    strong {
                        font-weight: 400;
                        font-size: 16px;
                        line-height: 18px;
                        text-align: center;
                        color: #000000;
                        margin: 14px 0 0 0;
                    }

                    b {
                        font-weight: 400;
                        font-size: 16px;
                        line-height: 18px;
                        text-align: center;
                        margin: 14px 0 0 0;
                        color: #666666;
                    }

                    img {
                        width: 58px;
                    }

                    &.status-none {
                        img {
                            width: 219px;
                        }
                    }
                }
            }
        }
    }
}
</style>
