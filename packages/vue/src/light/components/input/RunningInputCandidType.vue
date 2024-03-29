<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus, RunningLight } from '@mora-light/core/types/running';
import {
    NAT_REGEX,
    INT_REGEX,
    NAT8_MAX,
    NAT16_MAX,
    NAT32_MAX,
    NAT64_MAX,
    NAT_MIN,
    INT8_MAX,
    INT8_MIN,
    INT16_MAX,
    INT16_MIN,
    INT32_MAX,
    INT32_MIN,
    INT64_MAX,
    INT64_MIN,
    CandidType,
    // FLOAT32_REGEX,
    // FLOAT64_REGEX,
} from '@mora-light/core/types/candid';
import { DataResult, same } from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningInputComponentVue from './RunningInputComponent.vue';
import RunningBoolInputVue from './basic/RunningBoolInput.vue';
import RunningIntegerInputVue from './basic/RunningIntegerInput.vue';
import RunningFloatInputVue from './basic/RunningFloatInput.vue';
import RunningNullInputVue from './basic/RunningNullInput.vue';
import RunningTextInputVue from './basic/RunningTextInput.vue';
import RunningPrincipalInputVue from './basic/RunningPrincipalInput.vue';
import RunningBlobInputVue from './combined/RunningBlobInput.vue';
import RunningVecInputVue from './combined/RunningVecInput.vue';
import RunningOptInputVue from './combined/RunningOptInput.vue';
import RunningRecordInputVue from './combined/RunningRecordInput.vue';
import RunningVariantInputVue from './combined/RunningVariantInput.vue';
import RunningTupleInputVue from './combined/RunningTupleInput.vue';
import RunningRecInputVue from './combined/RunningRecInput.vue';
import RunningUnknownInputVue from './basic/RunningUnknownInput.vue';
import RunningEmptyInputVue from './basic/RunningEmptyInput.vue';
import RunningReservedInputVue from './basic/RunningReservedInput.vue';
import RunningFuncInputVue from './basic/RunningFuncInput.vue';
import RunningServiceInputVue from './basic/RunningServiceInput.vue';

const props = defineProps({
    layer: {
        type: Number,
        default: 1, // The top layer is displayed wrong, so it is necessary to record the level
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    runningLight: {
        type: Object as PropType<RunningLight>,
        required: false,
    },
    initial: {
        type: Object as PropType<CandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    mustValidateCurrent: {
        type: Boolean,
        required: true,
    },
});

// The correct data is passed down down
const value = ref<CandidType>(props.initial);

// Receive data that is passed upward
let valueResult: DataResult<CandidType> = { ok: value.value };

// Limit the frequency of upward trigger
const PERIOD = 1500; // Trigger minimum cycle
let lastValueChanged = 0;
let delayId = 0; // Delay trigger

let initialed = false;
onBeforeMount(() => init());
watch(
    () => props.initial,
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newValue = props.initial;
    const newValueResult = { ok: newValue };

    if (initialed && same(value.value, newValue) && same(valueResult, newValueResult)) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    value.value = newValue;

    valueResult = newValueResult;

    initialed = true;

    changed();
};

const onValueChanged = (r: DataResult<CandidType>) => {
    valueResult = r;

    if (r.ok !== undefined) {
        value.value = r.ok;

        // Limit trigger frequency
        clearTimeout(delayId); // Close first
        const now = new Date().getTime();
        const diff = now - lastValueChanged;

        // console.error("diff", diff);

        if ((props.runningLight?.canisters.canisters() ?? 1) && diff < PERIOD) {
            // It's too frequent, to be delayed
            delayId = Number(
                setTimeout(() => {
                    lastValueChanged = new Date().getTime();
                    // console.error("changed delay", diff, lastValueChanged, new Date());
                    changed();
                }, PERIOD - diff),
            );
            return;
        }

        // Time is too long, it will be triggered directly
        lastValueChanged = now;

        // console.error("changed direct", diff, lastValueChanged, new Date());
    }

    changed(); // Internal changes are triggered upward
};

const produce = (): DataResult<CandidType> => {
    if (!initialed) return { err: { message: `constraint input has not been initial.` } };

    if (valueResult.err !== undefined) return { err: valueResult.err };

    return { ok: valueResult.ok };
};

const emit = defineEmits<{
    changed: [DataResult<CandidType>];
}>();

const changed = () => emit('changed', produce());

// const getValidator = (regex: string, s: string): boolean => !!s.match(regex);
// const natValidator = (s: string): boolean => getValidator("^(|0|[1-9][0-9]*)$", s);
// const intValidator = (s: string): boolean => getValidator("^(|0|[1-9][0-9]*|-[1-9][0-9]*)$", s);
// const float32Validator = (s: string): boolean => getValidator(FLOAT32_REGEX, s);
// const float64Validator = (s: string): boolean => getValidator(FLOAT64_REGEX, s);
</script>

<template>
    <div class="running-input-candid-type-content">
        <template v-if="props.ui && props.ui.type && props.ui.type.endsWith('InputComponent')">
            <RunningInputComponentVue
                :need="(props.initial as any)"
                :ui="props.ui"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'bool'">
            <RunningBoolInputVue
                :status="props.status"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'nat'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="true"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="''"
                :minValue="'0'"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'int'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="true"
                :regex="INT_REGEX"
                :error="'Please enter the integer'"
                :placeholder="''"
                :maxValue="''"
                :minValue="''"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'nat8'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="false"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${NAT8_MAX}`"
                :minValue="`${NAT_MIN}`"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'nat16'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="false"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${NAT16_MAX}`"
                :minValue="`${NAT_MIN}`"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'nat32'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="false"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${NAT32_MAX}`"
                :minValue="`${NAT_MIN}`"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'nat64'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="true"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="NAT64_MAX"
                :minValue="`${NAT_MIN}`"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'int8'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="false"
                :regex="INT_REGEX"
                :error="'Please enter the integer'"
                :placeholder="''"
                :maxValue="`${INT8_MAX}`"
                :minValue="`${INT8_MIN}`"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'int16'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="false"
                :regex="INT_REGEX"
                :error="'Please enter the integer'"
                :placeholder="''"
                :maxValue="`${INT16_MAX}`"
                :minValue="`${INT16_MIN}`"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'int32'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="false"
                :regex="INT_REGEX"
                :error="'Please enter the integer'"
                :placeholder="''"
                :maxValue="`${INT32_MAX}`"
                :minValue="`${INT32_MIN}`"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'int64'">
            <RunningIntegerInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :isBigInt="false"
                :regex="INT_REGEX"
                :error="'Please enter the integer'"
                :placeholder="''"
                :maxValue="INT64_MAX"
                :minValue="INT64_MIN"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'float32'">
            <RunningFloatInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :maxDecimal="6"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'float64'">
            <RunningFloatInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :maxDecimal="15"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'null'">
            <RunningNullInputVue
                :status="props.status"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'text'">
            <RunningTextInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'principal'">
            <RunningPrincipalInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'blob'">
            <RunningBlobInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'vec'">
            <RunningVecInputVue
                :layer="props.layer"
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'opt'">
            <RunningOptInputVue
                :layer="props.layer"
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'record'">
            <RunningRecordInputVue
                :layer="props.layer"
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'variant'">
            <RunningVariantInputVue
                :layer="props.layer"
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'tuple'">
            <RunningTupleInputVue
                :layer="props.layer"
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'rec' && initial.subtype !== undefined">
            <RunningRecInputVue
                :layer="props.layer"
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'unknown'">
            <RunningUnknownInputVue
                :status="props.status"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'empty'">
            <RunningEmptyInputVue
                :status="props.status"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'reserved'">
            <RunningReservedInputVue
                :status="props.status"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'func'">
            <RunningFuncInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else-if="initial.type === 'service'">
            <RunningServiceInputVue
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="props.hasLabel"
                :initial="(props.initial as any)"
                @changed="onValueChanged"
            />
        </template>
        <template v-else>
            <div>
                {{ `type ${(initial as any).type} is not support.` }}
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-input-candid-type-content {
    width: 100%;
}
</style>
