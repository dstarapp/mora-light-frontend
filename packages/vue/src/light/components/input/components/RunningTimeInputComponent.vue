<script lang="ts" setup>
import { PropType, computed, ref, watch } from 'vue';
import {
    CandidBigInt,
    getInitialCandidTypeValue,
    Int64CandidType,
} from '@mora-light/core/types/candid';
import { DataResult, assignRuntime, readRuntime } from '@mora-light/core/types/common';
import { ElDatePicker, ElTooltip } from 'element-plus';

type SupportedCandidType = Int64CandidType;

type SupportedCandidValue = CandidBigInt;

type SupportedTimeType = 'year' | 'month' | 'week' | 'day' | 'second';
type SupportedTimeUnit = 's' | 'ms' | 'ns';

type SupportedInputComponentUI = {
    type: 'TimeInputComponent';
    style: {
        // Type for choosing users
        type: SupportedTimeType;
        // Second millisecond  nano
        unit: SupportedTimeUnit;
    };
    label?: string; // Enter the label
    placeholder?: string;
    default?: string; // No matter what type, the input of this input component is text, but pay attention to checking the effectiveness
};

const parseValueToDate = (
    value: SupportedCandidValue | undefined,
    unit: SupportedTimeUnit,
): Date | undefined => {
    if (value === undefined) return undefined;
    let timestamp = parseInt(value.value);
    switch (unit) {
        case 's':
            timestamp *= 1000;
            break;
        case 'ms':
            break;
        case 'ns':
            timestamp /= 1000000;
            break;
    }
    return new Date(timestamp);
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
const current = ref<Date | undefined>(
    parseValueToDate(
        readRuntime<SupportedCandidValue>(props.need)?.ok ??
            ((): SupportedCandidValue | undefined => {
                const defaultValue = props.ui.default;
                if (!defaultValue) return undefined;
                return { type: 'bigint', value: defaultValue };
            })() ??
            (getInitialCandidTypeValue(props.need, [], []) as SupportedCandidValue),
        props.ui.style.unit,
    ),
);

const checked = computed(() => {
    if (current.value === undefined) return false;
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
        let value: Date | undefined = current.value;
        if (value === undefined) {
            emit('changed', { err: { message: 'wrong input' } });
            return;
        }
        let timestamp = value.getTime();
        switch (props.ui.style.unit) {
            case 's':
                timestamp /= 1000;
                break;
            case 'ms':
                break;
            case 'ns':
                timestamp *= 1000000;
                break;
        }
        assignRuntime<SupportedCandidValue>(props.need, {
            ok: { type: 'bigint', value: `${timestamp}` },
        });
        emit('changed', { ok: props.need });
    },
    { immediate: true },
);
</script>

<template>
    <div class="running-dropdown-input-component-content">
        <div class="running-content">
            <div class="label" v-if="props.ui.label">
                {{ props.ui.label }}
            </div>
            <template v-if="props.ui.style.type === 'year'">
                <el-date-picker
                    type="year"
                    format="YYYY"
                    v-model="current"
                    :placeholder="props.ui.placeholder ? props.ui.placeholder : 'Select year'"
                />
            </template>
            <template v-if="props.ui.style.type === 'month'">
                <el-date-picker
                    type="month"
                    format="YYYY/MM"
                    v-model="current"
                    :placeholder="props.ui.placeholder ? props.ui.placeholder : 'Select month'"
                />
            </template>
            <template v-if="props.ui.style.type === 'week'">
                <el-date-picker
                    type="week"
                    format="YYYY/MM/DD"
                    v-model="current"
                    :placeholder="props.ui.placeholder ? props.ui.placeholder : 'Select week'"
                />
            </template>
            <template v-if="props.ui.style.type === 'day'">
                <el-date-picker
                    type="date"
                    format="YYYY/MM/DD"
                    v-model="current"
                    :placeholder="props.ui.placeholder ? props.ui.placeholder : 'Select date'"
                />
            </template>
            <template v-if="props.ui.style.type === 'second'">
                <el-date-picker
                    type="datetime"
                    format="YYYY/MM/DD hh:mm:ss"
                    v-model="current"
                    :placeholder="
                        props.ui.placeholder ? props.ui.placeholder : 'Select date and time'
                    "
                />
            </template>
        </div>
    </div>
</template>

<style lang="less">
@import '../input.less';
</style>
