<script lang="ts" setup>
import { PropType, computed, ref, watch } from 'vue';
import {
    CandidValueObject,
    getInitialCandidTypeValue,
    VariantCandidType,
} from '@mora-light/core/types/candid';
import { DataResult, assignRuntime, readRuntime } from '@mora-light/core/types/common';
import { ElSelect, ElOption, ElTooltip } from 'element-plus';

type SupportedCandidType = VariantCandidType;

type SupportedCandidValue = CandidValueObject;

type SupportedInputComponentUI = {
    type: 'DropdownInputComponent';
    style: {
        clearable?: boolean;
    };
    label?: string; // Enter the label
    placeholder?: string;
    default?: string; // No matter what type, the input of this input component is text, but pay attention to checking the effectiveness
};

const parseValueToString = (value: SupportedCandidValue): string => {
    const keys = Object.keys(value);
    if (keys.length) return keys[0];
    return '';
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
                const value: Record<string, null> = {};
                value[defaultValue] = null;
                return value;
            })() ??
            (getInitialCandidTypeValue(props.need, [], []) as SupportedCandidValue),
    ),
);

const checked = computed(() => {
    if (current.value === undefined) return false;
    if (props.need.subitems.length === 0) return true;
    const item = props.need.subitems.find((i) => i.key === current.value);
    if (!item) return false;
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
        let value: string | undefined = current.value;
        if (value === undefined) {
            emit('changed', { err: { message: 'wrong input' } });
            return;
        }
        const value2: Record<string, null> = {};
        value2[current.value] = null;
        assignRuntime<SupportedCandidValue>(props.need, { ok: value2 });
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
            <el-select v-model="current" :clearable="props.ui.style.clearable">
                <el-option
                    v-for="subitem in props.need.subitems"
                    :key="subitem.key"
                    :label="subitem.key"
                    :value="subitem.key"
                />
            </el-select>
        </div>
    </div>
</template>

<style lang="less">
@import '../input.less';
</style>
