<script lang="ts" setup>
import { PropType, ref, watch, computed } from 'vue';
import {
    NAT8_MAX,
    NAT16_MAX,
    NAT32_MAX,
    NAT_MIN,
    INT8_MAX,
    INT8_MIN,
    INT16_MAX,
    INT16_MIN,
    INT32_MAX,
    INT32_MIN,
    Nat8CandidType,
    Nat16CandidType,
    Nat32CandidType,
    Int8CandidType,
    Int16CandidType,
    Int32CandidType,
} from '@mora-light/core/types/candid';
import { DataResult, assignRuntime, readRuntime } from '@mora-light/core/types/common';
import { ElInputNumber, ElTooltip } from 'element-plus';

type SupportedCandidType =
    | Nat8CandidType
    | Nat16CandidType
    | Nat32CandidType
    | Int8CandidType
    | Int16CandidType
    | Int32CandidType;

type SupportedCandidValue = number;

type SupportedInputComponentUI = {
    type: 'NumberInputComponent';
    // Supported display style
    style: {
        type: 'nat8' | 'nat16' | 'nat32' | 'int8' | 'int16' | 'int32';
        min?: number;
        max?: number;
        decimal?: undefined;
    };
    label?: string; // Enter the label
    placeholder?: string;
    default?: number;
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

const current = ref<number | undefined>(
    readRuntime<SupportedCandidValue>(props.need)?.ok ??
        ((): SupportedCandidValue | undefined => {
            const defaultValue = `${props.ui.default}`;
            if (!defaultValue) return undefined;
            if (`${parseInt(defaultValue)}` === defaultValue) return parseInt(defaultValue);
            return undefined;
        })(),
);

const maximum = computed<number>(() => {
    switch (props.need.type) {
        case 'nat8':
            return Number(NAT8_MAX);
        case 'nat16':
            return Number(NAT16_MAX);
        case 'nat32':
            return Number(NAT32_MAX);
        case 'int8':
            return Number(INT8_MAX);
        case 'int16':
            return Number(INT16_MAX);
        case 'int32':
            return Number(INT32_MAX);
    }
});
const minimum = computed<number>(() => {
    switch (props.need.type) {
        case 'nat8':
            return Number(NAT_MIN);
        case 'nat16':
            return Number(NAT_MIN);
        case 'nat32':
            return Number(NAT_MIN);
        case 'int8':
            return Number(INT8_MIN);
        case 'int16':
            return Number(INT16_MIN);
        case 'int32':
            return Number(INT32_MIN);
    }
});

const max = computed<number>(() => props.ui.style.max ?? maximum.value);
const min = computed<number>(() => props.ui.style.min ?? minimum.value);

const checked = computed(() => {
    if (current.value === undefined) return false;
    if (current.value > max.value) return false;
    if (current.value < min.value) return false;
    return true;
});

const emit = defineEmits<{
    changed: [DataResult<SupportedCandidType>];
}>();

watch(
    () => current.value,
    () => {
        if (!checked.value) {
            emit('changed', { err: { message: 'wrong input' } });
            return;
        }
        let value: SupportedCandidValue | undefined = current.value;
        if (value === undefined) {
            emit('changed', { err: { message: 'wrong input' } });
            return;
        }
        assignRuntime<SupportedCandidValue>(props.need, { ok: value });
        emit('changed', { ok: props.need });
    },
    { immediate: true },
);

const channelInputLimit = (e: any) => {
    if (e.keyCode === 110) {
        e.returnValue = false;
        return false;
    }
    return true;
};
</script>

<template>
    <div class="running-integer-input-component-content">
        <div class="running-content">
            <div class="label" v-if="props.ui.label">
                {{ props.ui.label }}
            </div>
            <el-input-number
                v-model="current"
                :controls="false"
                :max="Number(max)"
                :min="Number(min)"
                :placeholder="ui.placeholder"
                @keydown="channelInputLimit"
            />
            <div class="error" v-if="!checked">
                <div v-if="current === undefined">
                    <span>input number</span>
                </div>
                <div v-else-if="current > max">
                    <span>too big</span>
                </div>
                <div v-else-if="current < min">
                    <span>too small</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less">
@import '../../input.less';
</style>
