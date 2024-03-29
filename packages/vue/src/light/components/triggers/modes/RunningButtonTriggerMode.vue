<script lang="ts" setup>
import { computed, PropType, ref, watch, inject } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import { ButtonTrigger } from '@mora-light/core/types/trigger';

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
        type: Object as PropType<ButtonTrigger>,
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
});

const cleanTimestampRecord = inject<() => void>('TIMESTAMP_RECORDS_CLEAN')!;
const pushTimestampRecord = inject<(tip: string) => void>('TIMESTAMP_RECORDS_PUSH')!;

const ready = ref(props.runningLight.sources.isReady());
const trigger = ref(props.runningLight.trigger);

const tipLast = computed(() => {
    const last = (props.initial as any).runtime?.last;
    if (last === undefined) return '';
    return `${new Date(last)}`;
});

const executable = computed(() => !!trigger.value && !props.calling && ready.value);

watch(
    () => [props.sourcesRefresh, props.callingRefresh],
    () => {
        ready.value = props.runningLight.sources.isReady();
        trigger.value = props.runningLight.trigger;
        // console.error('ready', ready.value, trigger.value);
    },
);

let delaying = false;
const onExecute = () => {
    if (!executable.value) return;
    if (delaying) return;
    delaying = true;

    setTimeout(() => doTrigger(), 14);
};

const doTrigger = () => {
    const now = new Date().getTime(); // Calculate the current time

    cleanTimestampRecord();
    pushTimestampRecord('trigger -> start -> button');

    (props.initial as any).runtime = { last: now }; // Record the current time
    props.runningLight.trigger = ''; // Clear error information

    // console.error("button click", props.initial.runtime);

    props.runningLight.sources.clean();
    props.runningLight.canisters.trigger();
    props.runningLight.refreshTrigger(); // Refresh interface

    delaying = false;
};
</script>

<template>
    <div class="running-button-trigger-mode-content">
        <div class="tip">
            <span>{{ tipLast }}</span>
        </div>
        <!-- Any mode is displayed -->
        <div class="button" @click="onExecute" :class="{ clickable: executable }">
            {{ props.initial.text }}
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-button-trigger-mode-content {
    @apply w-full flex flex-col justify-between items-center;

    > .tip {
        @apply flex mb-1 hidden;
        > span {
            @apply text-xs text-gray-400 dark:(text-light-900/50);
        }
    }

    > .button {
        @apply w-full flex justify-center items-center h-11 rounded-lg text-base text-black select-none opacity-50;
        background: linear-gradient(90deg, #34d399 2.69%, #7cee83 96.86%);
        &.clickable {
            @apply cursor-pointer opacity-100;
        }
    }
}
</style>
