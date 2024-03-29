<script lang="ts" setup>
import { PropType, computed, ref, watch } from 'vue';
import { getInitialCandidTypeValue, BoolCandidType } from '@mora-light/core/types/candid';
import { DataResult, assignRuntime, readRuntime } from '@mora-light/core/types/common';
import { ElSwitch, ElTooltip } from 'element-plus';

type SupportedCandidType = BoolCandidType;

type SupportedCandidValue = boolean;

type SupportedInputComponentUI = {
    type: 'SwitchInputComponent';
    style: {
        // Whether to display text
        inlinePrompt?: boolean;
        // Active state text
        activeText?: string;
        // Turn off status text
        inactiveText?: string;
    };
    label?: string; // Enter the label
    default?: boolean; // No matter what type, the input of this input component is text, but pay attention to checking the effectiveness
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
const current = ref<boolean>(
    readRuntime<SupportedCandidValue>(props.need)?.ok ??
        ((): SupportedCandidValue | undefined => {
            const defaultValue = props.ui.default;
            if (defaultValue === undefined) return undefined;
            return defaultValue;
        })() ??
        (getInitialCandidTypeValue(props.need, [], []) as SupportedCandidValue),
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
</script>

<template>
    <div class="running-switch-input-component-content">
        <div class="running-content">
            <div class="label" v-if="props.ui.label">
                {{ props.ui.label }}
            </div>
            <el-switch
                active-color="#35D49A"
                v-model="current"
                :inline-prompt="props.ui.style.inlinePrompt"
                :active-text="props.ui.style.activeText"
                :inactive-text="props.ui.style.inactiveText"
            />
        </div>
    </div>
</template>

<style lang="less">
@import '../input.less';
</style>
