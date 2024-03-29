<script lang="ts" setup>
import { PropType, computed, ref, watch } from 'vue';
import {
    TextCandidType,
    PrincipalCandidType,
    getInitialCandidTypeValue,
    CandidPrincipal,
    isPrincipal,
} from '@mora-light/core/types/candid';
import { DataResult, assignRuntime, readRuntime } from '@mora-light/core/types/common';
import { ElInput, ElTooltip } from 'element-plus';

const parseHex = (value: string): number[] | undefined => {
    const parse = (c: string): number => {
        switch (c) {
            case '0':
                return 0;
            case '1':
                return 1;
            case '2':
                return 2;
            case '3':
                return 3;
            case '4':
                return 4;
            case '5':
                return 5;
            case '6':
                return 6;
            case '7':
                return 7;
            case '8':
                return 8;
            case '9':
                return 9;
            case 'a':
                return 10;
            case 'b':
                return 11;
            case 'c':
                return 12;
            case 'd':
                return 13;
            case 'e':
                return 14;
            case 'f':
                return 15;
            case 'A':
                return 10;
            case 'B':
                return 11;
            case 'C':
                return 12;
            case 'D':
                return 13;
            case 'E':
                return 14;
            case 'F':
                return 15;
            default:
                throw new Error('wrong code: ' + c);
        }
    };

    // 1. Check if the input value is valid first
    if (value.length % 2 !== 0) return undefined; // Must be a number
    for (let i = 0; i < value.length; i++) {
        const c = value.charAt(i);
        try {
            parse(c);
        } catch (e) {
            return undefined; // Other characters do not support
        }
    }
    // 2. The conversion value is converted to the value between 0-255 per 2 characters
    const hex: number[] = [];
    for (let i = 0; i < value.length / 2; i++) {
        const c1 = value.charAt(i * 2);
        const c2 = value.charAt(i * 2 + 1);
        hex.push(parse(c1) * 16 + parse(c2));
    }
    return hex;
};

type SupportedCandidType =
    | TextCandidType
    | PrincipalCandidType
    | { type: 'vec'; subtype: { type: 'nat8' } };

type SupportedCandidValue = string | CandidPrincipal | number[];

// vec nat8 => account id
// The types supported by one line are: text  principal vec nat8
// Multi -line support types are: text
type SupportedInputComponentUI = {
    type: 'TextInputComponent';
    style:
        | {
              type: 'text'; // Single input style
              autosize?: undefined;
              minRows?: undefined;
          }
        | {
              type: 'textarea'; // Multi -line input style
              autosize: boolean;
              minRows: number;
          }; // Supported display style
    label?: string; // Enter the label
    placeholder?: string;
    default?: string; // No matter what type, the input of this input component is text, but pay attention to checking the effectiveness
};

const parseValueToString = (need: SupportedCandidType, value: SupportedCandidValue): string => {
    switch (need.type) {
        case 'text':
            return value as string;
        case 'principal':
            return (value as CandidPrincipal).value;
        case 'vec':
            return (value as number[])
                .map((n) => {
                    const s = n.toString(16);
                    return s.length < 2 ? '0' + s : s;
                })
                .join('');
    }
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
        props.need,
        readRuntime<SupportedCandidValue>(props.need)?.ok ??
            ((): SupportedCandidValue | undefined => {
                const defaultValue = props.ui.default;
                if (!defaultValue) return undefined;
                switch (props.need.type) {
                    case 'text':
                        return defaultValue;
                    case 'principal':
                        if (!isPrincipal(defaultValue)) return undefined;
                        return { type: 'principal', value: defaultValue };
                    case 'vec':
                        const hex = parseHex(defaultValue);
                        if (hex === undefined) return undefined;
                        if (hex.length !== 32) return undefined;
                        return hex;
                }
                return undefined;
            })() ??
            (getInitialCandidTypeValue(props.need, [], []) as SupportedCandidValue),
    ),
);
const checked = computed(() => {
    switch (props.need.type) {
        case 'text':
            return true;
        case 'principal':
            return isPrincipal(current.value);
        case 'vec':
            // must be hex
            const hex = parseHex(current.value);
            return hex !== undefined && hex.length === 32;
    }
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
        let value: SupportedCandidValue | undefined = undefined;
        switch (props.need.type) {
            case 'text':
                value = current.value;
                break;
            case 'principal':
                value = { type: 'principal', value: current.value };
                break;
            case 'vec':
                const hex = parseHex(current.value);
                value = hex;
                break;
        }
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
    <div class="running-text-input-component-content">
        <div class="running-content">
            <div class="label" v-if="props.ui.label">
                {{ props.ui.label }}
            </div>
            <el-input
                resize="none"
                v-model="current"
                :type="props.ui.style.type"
                :autosize="{
                    minRows: props.ui.style.minRows,
                    maxRows: props.ui.style.autosize ? undefined : props.ui.style.minRows,
                }"
                :placeholder="props.ui.placeholder"
            />
            <div class="error" v-if="!checked">
                <div v-if="props.need.type === 'text'">
                    <span>input text</span>
                </div>
                <div v-else-if="props.need.type === 'principal'">
                    <span>input principal id</span>
                </div>
                <div v-else-if="props.need.type === 'vec'">
                    <span>input account id</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less">
@import '../input.less';
</style>
