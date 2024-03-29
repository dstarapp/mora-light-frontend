<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch, inject } from 'vue';
import { ComponentStatus, ValueItem } from '@mora-light/core/types/running';
import { CandidType, CandidValue, findAloneType } from '@mora-light/core/types/candid';
import {
    DataResult,
    StringResult,
    parseDataResultArray,
    same,
} from '@mora-light/core/types/common';
import { Transform, findTransformToCandidType } from '@mora-light/core/types/transform';
import { DataTransmit } from '@mora-light/core/types/transmit';
import RunningShowItemVue from './RunningShowItem.vue';
import { TriggerMode } from '@mora-light/core/types/trigger';
// import RunningExportedOuterVue from './RunningExportedOuter.vue';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    initial: {
        type: Array as PropType<DataTransmit[]>,
        required: true,
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true, // Exported external variables
    },
    callingRefresh: {
        type: Number,
        required: true,
    },
    dataType: {
        type: Object as PropType<CandidType>,
        required: true, // The results type of the current plug -in
    },
    defaultValue: {
        type: Object as PropType<StringResult<CandidValue>>,
        required: false, // It may be a constant value, this is the value
    },
    transform: {
        type: Object as PropType<Transform>,
        required: false, // Is there a conversion function
    },
    triggerMode: {
        type: Object as PropType<TriggerMode>,
        required: true,
    },
    clockTriggerRemindSeconds: {
        type: Number,
        required: true,
    },
    executing: {
        type: Boolean,
        required: true,
    },
});

let checkedDataType: CandidType = props.dataType;
let checkedDefaultValue = props.defaultValue;
let checkedTransform: Transform | undefined = props.transform;
let checkedOuterValues: ValueItem[] = [...props.outerValues];

const transmits = ref<DataTransmit[]>(props.initial);

let transmitsResults: DataResult<DataTransmit>[] = parseDataResultArray(props.initial, () => [
    true,
]);

// Calculate the external variables required to spread data
const transmitsOuterValues = computed(() => {
    const result: ValueItem[][] = [];

    let last: ValueItem[] = [...props.outerValues]; // Empty array starting

    result[0] = [...last];

    for (let i = 1; i < transmits.value.length; i++) {
        const transmit = transmits.value[i - 1];

        let valueItems: ValueItem[] = [...last];

        if (transmit.transmit === 'outer' && transmit.exported.name) {
            const type =
                findTransformToCandidType(transmit.transform) ??
                findTransformToCandidType(props.transform) ??
                props.dataType;
            valueItems.push({
                name: transmit.exported.name,
                type,
                child: findAloneType(type).child,
                extra:
                    !transmit.transform && !props.transform && props.defaultValue?.ok !== undefined
                        ? { constant: true, runtime: props.defaultValue }
                        : { constant: false },
            });
        }

        last = valueItems;

        result[i] = [...last];
    }

    // console.error("transmitsOuterValues", result);

    return result;
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [
        props.callingRefresh,
        props.dataType,
        props.defaultValue,
        props.transform,
        props.outerValues,
        props.initial,
    ],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedDataType = props.dataType;
    const newCheckedDefaultValue = props.defaultValue;
    const newCheckedTransform = props.transform;
    const newCheckedOuterValues = [...props.outerValues];

    const newTransmits = props.initial;
    const newTransmitsResults = parseDataResultArray(newTransmits);

    if (
        initialed &&
        same(checkedDataType, newCheckedDataType) &&
        same(checkedDefaultValue, newCheckedDefaultValue) &&
        same(checkedTransform, newCheckedTransform) &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(transmits.value, newTransmits) &&
        same(transmitsResults, newTransmitsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedDataType = newCheckedDataType;
    checkedDefaultValue = newCheckedDefaultValue;
    checkedTransform = newCheckedTransform;
    checkedOuterValues = newCheckedOuterValues;

    transmits.value = newTransmits;

    transmitsResults = newTransmitsResults;

    initialed = true;

    changed();
};

const onUsingDataTransmitChanged = (i: number, r: DataResult<DataTransmit>) => {
    transmitsResults[i] = r;

    if (r.ok !== undefined) transmits.value[i] = r.ok;

    changed();
};

const produce = (): DataResult<DataTransmit[]> => {
    if (!initialed)
        return { err: { message: `${props.status} wrapped triggers has not been initial.` } };

    // Check whether there is an error in the dissemination data
    for (let i = 0; i < transmitsResults.length; i++) {
        const err = transmitsResults[i].err;
        if (err) return { err };
    }

    return { ok: transmitsResults.map((r) => r.ok!) };
};

const emit = defineEmits<{
    changed: [DataResult<DataTransmit[]>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-wrapped-transmits-content">
        <template v-if="transmits.length">
            <template v-for="(transmit, i) in transmits" :key="i">
                <template v-if="transmit.transmit === 'show'">
                    <div class="show">
                        <RunningShowItemVue
                            :status="props.status"
                            :index="i"
                            :from="
                                findTransformToCandidType(transmit.transform) ??
                                findTransformToCandidType(props.transform) ??
                                props.dataType
                            "
                            :view="transmit.view"
                            :callingRefresh="props.callingRefresh"
                            @changed="(r) => onUsingDataTransmitChanged(i, r)"
                        />
                    </div>
                </template>
                <template v-else-if="transmit.transmit === 'outer'">
                    <div class="outer" v-if="props.status === 'using'">
                        <!-- <RunningExportedOuterVue
                            :callingRefresh="props.callingRefresh"
                            :status="props.status"
                            :index="i"
                            :from="findTransformToCandidType(props.transform) ?? props.dataType"
                            :outerValues="transmitsOuterValues[i]"
                            :initial="transmit"
                            @changed="(r) => onUsingDataTransmitChanged(i, r)"
                        /> -->
                    </div>
                </template>
            </template>
        </template>
        <template v-else>
            <!-- No content -->
            <template v-if="props.status === 'using'">
                <div class="empty-transmit">Numerous consumer components of this light</div>
            </template>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-transmits-content {
    @apply w-full flex flex-col justify-center items-center;
    .triggerMode {
        position: absolute;
        right: 24px;
        top: 17px;
        display: flex;
        align-items: center;

        .icon-pause {
            color: #34d399;
            margin-right: 10px;
            cursor: pointer;
        }

        .icon-start {
            color: #34d399;
            cursor: pointer;
        }

        > i {
            font-size: 14px;
            color: #000;
            margin-right: 5px;
            line-height: 14px;
            position: relative;
            top: 1px;
        }

        p {
            font-weight: 400;
            font-size: 14px;
            line-height: 14;
            line-height: 14px;
            text-align: center;
            color: #000000;

            i {
                background: #e8e8e8;
                border-radius: 6px;
                line-height: 14px;
                width: 24px;
                height: 24px;
                display: inline-flex;
                justify-content: center;
                align-items: center;
                font-style: normal;
                margin: 0 5px;
            }
        }
    }

    > div {
        @apply mt-1;
        &:first-child {
            @apply mt-0;
        }
    }
    > .show,
    > .outer {
        @apply w-full;
    }
    > .empty-transmit {
        @apply w-full border-none flex justify-center items-center py-5 px-0;
    }
}
</style>
