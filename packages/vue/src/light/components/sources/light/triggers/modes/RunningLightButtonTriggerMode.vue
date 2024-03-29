<script lang="ts" setup>
import { computed, PropType, ref, watch } from 'vue';
import { RunningStatus } from '../../../../../../types/running/running';
import { RunningLight } from '../../../../../../types/running/light';
import { ButtonTrigger } from '../../../../../../types/parts/triggers/types/button';

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
        type: Object as PropType<ButtonTrigger>,
        required: true,
    },
});

const ready = ref(props.runningLight.sources.isReady());
const trigger = ref(props.runningLight.trigger);

const tipLast = computed(() => {
    const last = props.initial.runtime?.last;
    if (last === undefined) return '';
    return `${new Date(last)}`;
});

const executable = computed(() => !!trigger.value && !props.calling && ready.value);

watch(
    () => [props.sourcesRefresh, props.callingRefresh],
    () => {
        ready.value = props.runningLight.sources.isReady();
        trigger.value = props.runningLight.trigger;
        // console.error("light ready", ready.value, props.runningLight.canister);
        // console.error("light trigger", trigger.value);
    },
);

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
    @apply w-full flex flex-row justify-between items-center;
    > .tip {
        > span {
            @apply hidden;
        }
    }
    > .button {
        @apply border border-light-200 rounded-md py-1 px-2 text-sm text-black select-none dark:(border-dark-100 text-light-900);
        &.clickable {
            cursor: pointer;
        }
    }
    > div {
        @apply hidden;
    }
}
</style>
