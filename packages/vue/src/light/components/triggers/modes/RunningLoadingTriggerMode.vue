<script lang="ts" setup>
import { computed, inject, onMounted, onUnmounted, PropType, ref, watch } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import { LoadingTrigger } from '@mora-light/core/types/trigger';

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
        type: Object as PropType<LoadingTrigger>,
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

const executable = computed(() => !props.calling && ready.value);

watch(
    () => [props.sourcesRefresh, props.callingRefresh],
    () => {
        ready.value = props.runningLight.sources.isReady();
        trigger.value = props.runningLight.trigger;
        // console.error('ready', ready.value, trigger.value);
    },
);

const onExecute = () => {
    if (!executable.value) return;

    doTrigger();
};

const doTrigger = () => {
    const now = new Date().getTime(); // Calculate the current time

    cleanTimestampRecord();
    pushTimestampRecord('trigger -> start -> loading');

    (props.initial as any).runtime = { last: now }; // Record the current time
    props.runningLight.trigger = ''; // Clear error information

    // console.error('loading', trigger.value);

    props.runningLight.sources.clean();
    props.runningLight.canisters.trigger();
    props.runningLight.refreshTrigger(); // Refresh interface
};

let intervalId = 0;
let triggered = false;
onMounted(() => {
    clearInterval(intervalId);
    intervalId = Number(
        setInterval(() => {
            if (executable.value) {
                clearInterval(intervalId);
                triggered = true;
                console.error('do triggering by loading');
                onExecute();
            }
        }, 33),
    );
});
onUnmounted(() => {
    clearInterval(intervalId);
});
</script>

<template>
    <div class="running-loading-trigger-mode-content">
        <div class="tip" v-if="triggered">
            <span>{{ tipLast }}</span>
        </div>
        <!-- Any mode is displayed -->
        <div></div>
    </div>
</template>

<style lang="less" scoped>
.running-loading-trigger-mode-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;

    > .tip {
        display: flex;
        margin-bottom: 5px;
        display: none;

        > span {
            font-size: 12px;
            color: #999;
        }
    }
}
</style>
