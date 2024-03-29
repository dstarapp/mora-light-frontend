<script lang="ts" setup>
import { computed, inject, onMounted, onUnmounted, PropType, ref, watch } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import { ClockTrigger } from '@mora-light/core/types/trigger';

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
        type: Object as PropType<ClockTrigger>,
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

const cleanTimestampRecord = inject<() => void>('TIMESTAMP_RECORDS_CLEAN')!;
const pushTimestampRecord = inject<(tip: string) => void>('TIMESTAMP_RECORDS_PUSH')!;

const setClockTriggerRemindSeconds = inject<(s: number) => void>(
    'SET_CLOCK_TRIGGER_REMIND_SECONDS',
)!;

let intervalId = 0;

const ready = ref(props.runningLight.sources.isReady());
const trigger = ref(props.runningLight.trigger);

const tipLast = computed(() => {
    const last = (props.initial as any).runtime?.last;
    if (last === undefined) return '';
    return `${new Date(last)}`;
});

const executable = computed(() => !!trigger.value && !props.calling && ready.value);

let lastReady = ready.value;
watch(
    () => [props.sourcesRefresh, props.callingRefresh],
    () => {
        ready.value = props.runningLight.sources.isReady();
        trigger.value = props.runningLight.trigger;
        // console.error("ready", ready.value, props.runningLight.canister);
        // console.error("trigger", trigger.value);
        if (!lastReady && ready.value) last = new Date().getTime() - props.initial.sleep + 1233; // Each time from mistake to correct, extract
        lastReady = ready.value;
    },
);

let last = 0;
let stopDiff = 0;
watch(
    () => props.executing,
    (nv) => {
        const now = new Date().getTime();
        if (nv) {
            last = now - stopDiff;
        } else {
            stopDiff = now - last;
        }
    },
);
onMounted(() => {
    clearInterval(intervalId);
    intervalId = Number(
        setInterval(() => {
            if (!props.executing) return;
            const now = new Date().getTime();
            const diff = now - last;
            if (diff > props.initial.sleep) {
                last = now;
                setClockTriggerRemindSeconds(Math.floor(props.initial.sleep / 1000));
                onExecute();
            } else {
                setClockTriggerRemindSeconds(Math.floor((props.initial.sleep - diff) / 1000) + 1);
            }
        }, 73),
    );
});
onUnmounted(() => clearInterval(intervalId));

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
    pushTimestampRecord('trigger -> start -> clock');

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
    <div class="running-clock-trigger-mode-content">
        <div class="tip">
            <span>{{ tipLast }}</span>
        </div>
        <div class="clock">
            {{ `Trigger every ${props.initial.sleep / 1000} seconds` }}
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-clock-trigger-mode-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 20px;

    > .tip {
        display: flex;
        margin-bottom: 5px;
        display: none;

        > span {
            font-size: 12px;
            color: #999;
        }
    }

    > .clock {
        display: flex;
        justify-content: center;
        align-items: center;
        height: 44px;
        border: 1px solid #34d399;
        border-radius: 10px;
        width: 100%;
        font-weight: 400;
        font-size: 16px;
        color: #000000;
        user-select: none;
    }
}
</style>
