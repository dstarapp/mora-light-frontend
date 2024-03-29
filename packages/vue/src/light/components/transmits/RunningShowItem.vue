<script lang="ts" setup>
import { PropType, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { CandidType } from '@mora-light/core/types/candid';
import { UnionTransmitShowView } from '@mora-light/core/types/transmit';
import RunningWrappedViewVue from './shows/RunningWrappedView.vue';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    index: {
        type: Number,
        required: false, // Display serial number
    },
    from: {
        type: Object as PropType<CandidType>,
        required: true, // The running result type of the light also needs to be used
    },
    view: {
        type: Object as PropType<UnionTransmitShowView>,
        required: true,
    },
    callingRefresh: {
        type: Number,
        required: true,
    },
});

watch(
    () => props.view,
    () => {
        console.error('show item view', props.view.runtime, props.from);
    },
    { immediate: true },
);
</script>

<template>
    <div class="running-show-item-content">
        <div class="title" v-if="props.status === 'using'">
            {{ index }} Display data {{ props.view.constraint.name }}
        </div>
        <RunningWrappedViewVue
            :status="props.status"
            :from="props.from"
            :view="props.view"
            :callingRefresh="props.callingRefresh"
        />
    </div>
</template>

<style lang="less" scoped>
.running-show-item-content {
    width: 100%;
    > .title {
        margin-bottom: 5px;
        font-size: 12px;
        opacity: 0.6;
    }
    > .wrong-name {
        width: 100%;
        height: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
    }
}
</style>
