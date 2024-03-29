<script lang="ts" setup>
import { PropType, computed, nextTick, ref, watch } from 'vue';
import {
    ComponentStatus,
    LightsRunning,
    ValueItem,
    ValuePool,
    checkDataSource,
    loadProp,
} from '@mora-light/core/types/running';
import { LightCoreData } from '../types/core';
import { DataResult } from '@mora-light/core/types/common';
import { LightCore, LightStatusInfo, getLightStatusInfo } from '@mora-light/core/types';
import MoraLightVue from '../light';

const props = defineProps({
    hostAgent: {
        required: true,
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true,
    },
    data: {
        type: Object as PropType<LightCoreData>,
        required: true,
    },
    prop: {
        type: String,
        required: true,
    },
});

const running = ref<LightsRunning>(new LightsRunning());

const hasData = computed(() => running.value.size());

watch(
    () => props.data,
    () => {
        if (!props.data) return;

        running.value = new LightsRunning();

        nextTick(() => {
            const lightRunning = new LightsRunning();

            const propPool = new ValuePool();
            if (props.status === 'running') {
                loadProp(JSON.parse(props.data.core_json), propPool, JSON.parse(props.prop));
            }

            lightRunning.push(props.data.hash, props.data, propPool);

            running.value = lightRunning;

            checkLight();

            // produce();
        });
    },
    {
        immediate: true,
    },
);

const runningResult = ref<DataResult<LightCore>>({ err: { message: `initial...` } });

const lightRef = ref<HTMLElement>();

const status = ref<'using' | 'completed'>('using');

// check light status
const checkLight = () => {
    const light = running.value.getLightCore(0)!;
    let outerValues: ValueItem[] = running.value.getOuterValues(0) ?? [];
    let propValues: ValueItem[] = running.value.getPropPool(0)!.values();
    let innerValues: ValueItem[] = [];
    // console.error("checkLight", index, light, outerValues);
    for (let i = 0; i < light.data.length; i++) {
        const check = checkDataSource(
            light.data[i],
            true,
            { outerValues, propValues, innerValues },
            lightRef.value,
        );
        // console.error("checkLight", light.data[i], outerValues, check);
        if (check.result.err !== undefined) {
            runningResult.value = { err: check.result.err };
            status.value = 'using';
            // console.error("set using", i, check[1]);
            return;
        }
        outerValues = check.values.outerValues!;
        innerValues = check.values.innerValues;
    }
    runningResult.value[0] = { ok: light };
};

const lightStatus = computed<LightStatusInfo>(() => {
    return getLightStatusInfo(
        running.value.size() === 0 ? undefined : running.value.getLightCore(0),
    );
});

const showStatus = computed<ComponentStatus>(() => {
    switch (props.status) {
        case 'preview':
            return 'preview';
        case 'running':
            return 'running';
    }

    const result = runningResult.value;
    const current = status.value;

    if (result === undefined) return 'using';
    if (result.err !== undefined) return 'using';
    if (current === undefined) return 'completed';
    return current;
});

// const hasContent = computed<boolean>(() => {
//     return (
//         getLightStatusInfo(running.value.size() === 0 ? undefined : running.value.getLightCore(0))
//             .has || showStatus.value === 'using'
//     );
// });

const completed = computed(() => {
    return runningResult.value.err === undefined;
});

const onChangeStatus = () => {
    status.value = showStatus.value === 'using' ? 'completed' : 'using';
};

const onLightUsingChanged = (r: DataResult<LightCore>) => {
    runningResult.value = r;

    // console.error("onLightUsingChanged", r);

    if (r.ok !== undefined) {
        running.value.refresh();
        checkLight();
    }

    produce();
};

const emit = defineEmits<{
    produce: [LightsRunning];
}>();

const produce = () => {
    switch (props.status) {
        case 'preview':
            return;
        case 'running':
            return;
    }
    if (runningResult.value.err !== undefined) {
        console.error('article editor error', runningResult.value.err);
        return;
    }

    console.error('article editor ok', running.value);

    if (completed.value) {
        const running2 = new LightsRunning();

        for (let i = 0; i < running.value.size(); i++) {
            const key = running.value.getLightKey(i);
            let lightCoreData = running.value.getLightCoreData(i)!;
            let propPool = running.value.getPropPool(i)!;

            running2.push(key, lightCoreData, propPool);
        }

        emit('produce', running2);
    }
};

const showController = computed(() => {
    switch (props.status) {
        case 'preview':
            return false;
        case 'running':
            return false;
    }
    return true;
});
</script>

<template>
    <div class="mora-lights-content" v-if="hasData">
        <div class="control" v-if="showController">
            <span>
                {{ !lightStatus.has ? 'NO UI' : '' }}
            </span>
            <div class="right">
                <div class="change-status" v-if="runningResult.ok" @click="onChangeStatus">
                    {{ showStatus === 'completed' ? 'Edit' : 'Confirm' }}
                </div>
            </div>
        </div>
        <MoraLightVue
            :hostAgent="props.hostAgent"
            :status="props.status"
            :running="(running as any)"
            :index="0"
            ref="lightRef"
        />
    </div>
</template>

<style lang="less" scoped>
.mora-lights-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    > .control {
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: center;

        > .right {
            display: flex;
            flex-direction: row;
            justify-content: flex-end;
            align-items: center;
            > .change-status {
                margin-right: 10px;
                font-size: 14px;
                user-select: none;
                cursor: pointer;
            }
            > .delete {
                font-size: 14px;
                color: red;
                opacity: 0.7;
                user-select: none;
                cursor: pointer;
            }
        }
    }
}
</style>
