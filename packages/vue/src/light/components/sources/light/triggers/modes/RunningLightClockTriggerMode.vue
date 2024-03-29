<script lang="ts" setup>
import { computed, onMounted, onUnmounted, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../types/running/running';
import { RunningLight } from '../../../../../../types/running/light';
import { ClockTrigger } from '../../../../../../types/parts/triggers/types/clock';

const props = defineProps({
    parentTriggerRefresh: {
        type: Number,
        required: true,
    },
    parentRunningLight: {
        type: Object as PropType<RunningLight>,
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
});

let intervalId = 0;

const ready = ref(props.runningLight.sources.isReady());
const trigger = ref(props.runningLight.trigger);

const tipLast = computed(() => {
    const last = props.initial.runtime?.last;
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
        // console.error("light ready", ready.value, props.runningLight.canister);
        // console.error("light trigger", trigger.value);
        if (!lastReady && ready.value) last = new Date().getTime() - props.initial.sleep + 1233; // Each time from mistake to correct, extract
        lastReady = ready.value;
    },
);

let last = 0;
onMounted(() => {
    clearInterval(intervalId);
    intervalId = Number(
        setInterval(() => {
            const now = new Date().getTime();
            const diff = now - last;
            if (diff > props.initial.sleep) {
                last = now;
                onExecute();
            }
        }, 73),
    );
});
onUnmounted(() => clearInterval(intervalId));

const onExecute = () => {
    if (!executable.value) return;

    doTrigger();
};

const doTrigger = () => {
    const now = new Date().getTime(); // Calculate the current time

    props.initial.runtime = { last: now }; // Record the current time
    props.runningLight.trigger = ''; // Clear error information

    // console.error("light button click", props.initial.runtime);

    props.runningLight.sources.clean();
    props.runningLight.refreshTrigger(); // Refresh interface
};

watch(
    () => props.parentTriggerRefresh,
    () => {
        if (props.parentRunningLight.trigger === '') {
            doTrigger();
        }
    },
);
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
    flex-direction: row;
    justify-content: space-between;
    align-items: center;
    > .tip {
        > span {
            display: none;
        }
    }
    > .clock {
        border: 1px dashed #ccc;
        padding: 5px 10px;
        font-size: 14px;
        color: #000c;
        user-select: none;
    }
    > div {
        display: none;
    }
}
</style>
