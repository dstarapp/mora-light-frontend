<script lang="ts" setup>
import { PropType } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import { TriggerMode } from '@mora-light/core/types/trigger';
import RunningLoadingTriggerModeVue from './modes/RunningLoadingTriggerMode.vue';
import RunningButtonTriggerModeVue from './modes/RunningButtonTriggerMode.vue';
import RunningClockTriggerModeVue from './modes/RunningClockTriggerMode.vue';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: true,
    },
    calling: {
        type: Number,
        required: true,
    },
    initial: {
        type: Object as PropType<TriggerMode>,
        required: true,
    },
    sourcesRefresh: {
        type: Number,
        required: true,
    },
    callingRefresh: {
        type: Number,
        required: true,
    },
    executing: {
        type: Boolean,
        required: true,
    },
});
</script>

<template>
    <div class="running-wrapped-triggers-content">
        <template v-if="initial.type === 'loading'">
            <RunningLoadingTriggerModeVue
                :status="props.status"
                :runningLight="props.runningLight"
                :calling="props.calling"
                :initial="(props.initial as any)"
                :sourcesRefresh="props.sourcesRefresh"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="initial.type === 'button'">
            <RunningButtonTriggerModeVue
                :status="props.status"
                :runningLight="props.runningLight"
                :calling="props.calling"
                :initial="(props.initial as any)"
                :sourcesRefresh="props.sourcesRefresh"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="initial.type === 'clock'">
            <RunningClockTriggerModeVue
                :status="props.status"
                :runningLight="props.runningLight"
                :calling="props.calling"
                :initial="(props.initial as any)"
                :sourcesRefresh="props.sourcesRefresh"
                :callingRefresh="props.callingRefresh"
                :executing="props.executing"
            />
        </template>
        <template v-else>
            <template v-if="props.status === 'using'">
                <div class="wrong-type">Unrecognized trigger type {{ (initial as any).type }}</div>
            </template>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-triggers-content {
    width: 100%;

    > .wrong-type {
        width: 100%;
        height: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        color: #ff8585;
        font-size: 14px;
    }
}
</style>
