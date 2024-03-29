<script lang="ts" setup>
import { PropType, computed, ref, watch } from 'vue';
import {
    getInitialCandidTypeValue,
    NatCandidType,
    IntCandidType,
    Nat64CandidType,
    Int64CandidType,
    CandidBigInt,
    NAT64_MAX,
    INT64_MAX,
    NAT_MIN,
    INT64_MIN,
} from '@mora-light/core/types/candid';
import { DataResult, assignRuntime, readRuntime } from '@mora-light/core/types/common';
import { ElInput, ElTooltip } from 'element-plus';

type SupportedCandidType = NatCandidType | IntCandidType | Nat64CandidType | Int64CandidType;

type SupportedCandidValue = CandidBigInt;

type SupportedInputComponentUI = {
    type: 'NumberInputComponent';
    style: {
        type: 'nat' | 'int' | 'nat64' | 'int64';
        min?: string;
        max?: string;
        decimal?: undefined;
    }; // Supported display style
    label?: string; // Enter the label
    placeholder?: string;
    default?: string; // No matter what type, the input of this input component is text, but pay attention to checking the effectiveness
};

const parseValueToString = (value: SupportedCandidValue | undefined): string => {
    if (value === undefined) return '';
    return value.value;
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
const current = ref<string>(
    parseValueToString(
        readRuntime<SupportedCandidValue>(props.need)?.ok ??
            ((): SupportedCandidValue | undefined => {
                const defaultValue = props.ui.default;
                if (!defaultValue) return undefined;
                return { type: 'bigint', value: defaultValue };
            })(),
    ),
);

watch(
    () => current.value,
    () => {
        if (current.value.trim() !== current.value) {
            current.value = current.value.trim();
        }
    },
);

const maximum = computed<string>(() => {
    switch (props.need.type) {
        case 'nat':
            return '';
        case 'int':
            return '';
        case 'nat64':
            return NAT64_MAX;
        case 'int64':
            return INT64_MAX;
    }
});
const minimum = computed<string>(() => {
    switch (props.need.type) {
        case 'nat':
            return NAT_MIN;
        case 'int':
            return '';
        case 'nat64':
            return NAT_MIN;
        case 'int64':
            return INT64_MIN;
    }
});

const max = computed<string>(() => props.ui.style.max ?? maximum.value);
const min = computed<string>(() => props.ui.style.min ?? minimum.value);

const parseBigInt = (value: string): bigint | undefined => {
    try {
        return BigInt(value);
    } catch (e) {}
    return undefined;
};

const checked = computed(() => {
    if (!current.value) return false;

    const value = parseBigInt(current.value);
    if (value === undefined) return false;

    if (max.value && value > BigInt(max.value)) return false;
    if (min.value && value < BigInt(min.value)) return false;

    if (`${value}` !== current.value) return false;

    return true;
});

const isTooBig = computed(() => {
    if (!current.value) return false;
    const value = parseBigInt(current.value);
    if (value === undefined) return false;
    if (max.value && value > BigInt(max.value)) return true;
    return false;
});
const isTooSmall = computed(() => {
    if (!current.value) return false;
    const value = parseBigInt(current.value);
    if (value === undefined) return false;
    if (min.value && value < BigInt(min.value)) return true;
    return false;
});
const isWrongNumber = computed(() => {
    if (!current.value) return false;
    const value = parseBigInt(current.value);
    if (value === undefined) return false;
    if (`${value}` !== current.value) return true;
    return false;
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
        let value: string | undefined = current.value;
        if (value === undefined || !value) {
            emit('changed', { err: { message: 'wrong input' } });
            return;
        }
        assignRuntime<SupportedCandidValue>(props.need, { ok: { type: 'bigint', value } });
        emit('changed', { ok: props.need });
    },
    { immediate: true },
);
</script>

<template>
    <div class="running-bigint-input-component-content">
        <div class="running-content">
            <div class="label" v-if="props.ui.label">
                {{ props.ui.label }}
            </div>
            <el-input v-model="current" :placeholder="props.ui.placeholder" />
            <div class="error" v-if="!checked">
                <div v-if="!current">
                    <span>input number</span>
                </div>
                <div v-else-if="isTooBig">
                    <span>Maximum limit: {{ max }}</span>
                </div>
                <div v-else-if="isTooSmall">
                    <span>Minimum limit: {{ min }}</span>
                </div>
                <div v-else-if="parseBigInt(current) === undefined">
                    <span>wrong number</span>
                </div>
                <div v-else-if="isWrongNumber">
                    <span>wrong number</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less">
@import '../../input.less';
</style>
