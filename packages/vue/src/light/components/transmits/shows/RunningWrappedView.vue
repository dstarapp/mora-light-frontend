<script lang="ts" setup>
import { PropType, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { CandidType } from '@mora-light/core/types/candid';
import { UnionTransmitShowView } from '@mora-light/core/types/transmit';
import RunningBoolViewVue from './basic/RunningBoolView.vue';
import RunningTextViewVue from './basic/RunningTextView.vue';
import RunningImageViewVue from './basic/RunningImageView.vue';
import RunningTableViewVue from './basic/RunningTableView.vue';
import RunningVecViewVue from './combined/RunningVecView.vue';
import RunningOptViewVue from './combined/RunningOptView.vue';
import RunningRecordViewVue from './combined/RunningRecordView.vue';
import RunningVariantViewVue from './combined/RunningVariantView.vue';
import RunningTupleViewVue from './combined/RunningTupleView.vue';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
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
    () => [props.view, props.from],
    () => {
        console.error('wrapped view', props.view, props.from);
    },
    { immediate: true },
);
</script>

<template>
    <div class="running-wrapped-view-content">
        <template v-if="props.view.constraint.name === 'BoolView'">
            <RunningBoolViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'TextView'">
            <RunningTextViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'ImageView'">
            <RunningImageViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'TableView'">
            <RunningTableViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'VecView'">
            <RunningVecViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :subtype="props.view.subtype!"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'OptView'">
            <RunningOptViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :subtype="props.view.subtype!"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'RecordView'">
            <RunningRecordViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :subitems="props.view.subitems!"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'VariantView'">
            <RunningVariantViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :subitems="props.view.subitems!"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else-if="props.view.constraint.name === 'TupleView'">
            <RunningTupleViewVue
                :status="props.status"
                :from="(props.from as any)"
                :constraint="props.view.constraint"
                :subitems="props.view.subitems!"
                :runtime="(props.view.runtime as any)"
                :callingRefresh="props.callingRefresh"
            />
        </template>
        <template v-else>
            <template v-if="props.status === 'using'">
                <div class="wrong-name">
                    Unrecognizable component name {{ (props.view.constraint as any).name }}
                </div>
            </template>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-view-content {
    @apply w-full relative;
    > .title {
        @apply mt-1 text-xs opacity-60;
    }
    > .wrong-name {
        @apply w-full h-15 flex justify-center items-center;
    }
}
</style>
