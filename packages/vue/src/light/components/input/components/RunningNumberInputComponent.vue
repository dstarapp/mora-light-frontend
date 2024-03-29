<script lang="ts" setup>
import { PropType } from 'vue';
import {
    CandidType,
    Float32CandidType,
    Float32Decimal,
    Float64CandidType,
    Float64Decimal,
    Int16CandidType,
    Int32CandidType,
    Int64CandidType,
    Int8CandidType,
    IntCandidType,
    Nat16CandidType,
    Nat32CandidType,
    Nat64CandidType,
    Nat8CandidType,
    NatCandidType,
} from '@mora-light/core/types/candid';
import { DataResult } from '@mora-light/core/types/common';
import RunningBigIntInputComponentVue from './numbers/RunningBigIntInputComponent.vue';
import RunningIntegerInputComponentVue from './numbers/RunningIntegerInputComponent.vue';
import RunningFloatInputComponentVue from './numbers/RunningFloatInputComponent.vue';

type SupportedCandidType =
    | NatCandidType
    | IntCandidType
    | Nat64CandidType
    | Int64CandidType
    | Float32CandidType
    | Float64CandidType
    | Nat8CandidType
    | Nat16CandidType
    | Nat32CandidType
    | Int8CandidType
    | Int16CandidType
    | Int32CandidType;

type SupportedInputComponentUI = {
    type: 'NumberInputComponent';
    // Supported display style
    style:
        | {
              type: 'nat' | 'int' | 'nat64' | 'int64';
              min?: string;
              max?: string;
              decimal?: undefined;
          }
        | {
              type: 'nat8' | 'nat16' | 'nat32' | 'int8' | 'int16' | 'int32';
              min?: number;
              max?: number;
              decimal?: undefined;
          }
        | {
              type: 'float32';
              min?: undefined;
              max?: undefined;
              decimal?: Float32Decimal;
          }
        | {
              type: 'float64';
              min?: undefined;
              max?: undefined;
              decimal?: Float64Decimal;
          };
    label?: string; // Enter the label
    placeholder?: string;
    default?: string | number; // The default value of the corresponding type
};

const props = defineProps({
    need: {
        type: Object as PropType<SupportedCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<SupportedInputComponentUI>,
        required: true,
    },
});

const emit = defineEmits<{
    changed: [DataResult<SupportedCandidType>];
}>();

const onChanged = (r: DataResult<SupportedCandidType>) => emit('changed', r);
</script>

<template>
    <div class="running-number-input-component-content">
        <template v-if="['nat', 'int', 'nat64', 'int64'].includes(props.ui.style.type)">
            <RunningBigIntInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
        <template
            v-else-if="
                ['nat8', 'nat16', 'nat32', 'int8', 'int16', 'int32'].includes(props.ui.style.type)
            "
        >
            <RunningIntegerInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
        <template v-else-if="['float32', 'float64'].includes(props.ui.style.type)">
            <RunningFloatInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
    </div>
</template>

<style lang="less">
@import '../input.less';
</style>
