<script lang="ts" setup>
import { PropType, ref, watch, computed } from 'vue';
import {
    Float32CandidType,
    Float64CandidType,
    Float32Decimal,
    Float64Decimal,
} from '@mora-light/core/types/candid';
import { DataResult, assignRuntime, readRuntime } from '@mora-light/core/types/common';
import { ElInput, ElTooltip } from 'element-plus';

const parseFloatNumber = (num: string): string => {
    let num_str = num.toString();
    if (num_str.indexOf('+') != -1) {
        num_str = num_str.replace('+', '');
    }
    if (num_str.indexOf('E') != -1 || num_str.indexOf('e') != -1) {
        let resValue = '',
            power: Number | string = '',
            result: RegExpExecArray | null = null,
            dotIndex = 0,
            resArr: string[] = [],
            sym = '';
        let numStr = num_str.toString();
        if (numStr[0] == '-') {
            // If it is negative, turn it into a positive process, remove the ‘-’ first, and save ‘-’.
            numStr = numStr.substr(1);
            sym = '-';
        }
        if (numStr.indexOf('E') != -1 || numStr.indexOf('e') != -1) {
            let regExp = new RegExp('^(((\\d+.?\\d+)|(\\d+))[Ee]{1}((-(\\d+))|(\\d+)))$', 'ig');
            result = regExp.exec(numStr);
            if (result != null) {
                resValue = result[2];
                power = result[5];
                result = null;
            }
            if (!resValue && !power) {
                return num;
            }
            dotIndex = resValue.indexOf('.') == -1 ? 0 : resValue.indexOf('.');
            resValue = resValue.replace('.', '');
            resArr = resValue.split('');
            if (Number(power) >= 0) {
                let sub_res = resValue.substring(dotIndex);
                power = Number(power);
                // When the number of power is greater than the number of numbers after the decimal point, add 0 later
                for (var i = 0; i <= (power as number) - sub_res.length; i++) {
                    resArr.push('0');
                }
                if ((power as number) - sub_res.length < 0) {
                    resArr.splice(dotIndex + (power as number), 0, '.');
                }
            } else {
                power = power.replace('-', '');
                power = Number(power);
                // The power number is greater than the INDEX position with a decimal point.
                for (var i = 0; i < (power as number) - dotIndex; i++) {
                    resArr.unshift('0');
                }
                var n = (power as number) - dotIndex >= 0 ? 1 : -((power as number) - dotIndex);
                resArr.splice(n, 0, '.');
            }
        }
        resValue = resArr.join('');

        return sym + resValue;
    } else {
        return num_str;
    }
};

const parseValueToString = (value: SupportedCandidValue | undefined): string => {
    if (value === undefined) return '';
    return `${value}`;
};

type SupportedCandidType = Float32CandidType | Float64CandidType;

type SupportedCandidValue = number;

type SupportedInputComponentUI = {
    type: 'NumberInputComponent';
    // Supported display style
    style:
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

const current = ref<string>(
    parseValueToString(
        readRuntime<SupportedCandidValue>(props.need)?.ok ??
            ((): SupportedCandidValue | undefined => {
                const defaultValue = `${props.ui.default}`;
                if (!defaultValue) return undefined;
                if (`${parseFloat(defaultValue)}` === defaultValue) return parseFloat(defaultValue);
                return undefined;
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

const maxDecimal = computed<number>(() => {
    switch (props.need.type) {
        case 'float32':
            return 6;
        case 'float64':
            return 15;
    }
});
const decimal = computed<number>(() => props.ui.style.decimal ?? maxDecimal.value);

const checked = computed(() => {
    if (current.value === undefined || !current.value) return false;
    const s = parseFloatNumber(current.value);
    const ss = s.split('.');
    if (ss.length >= 2 && ss[1].length > decimal.value) return false;
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
        assignRuntime<SupportedCandidValue>(props.need, { ok: parseFloat(value) });
        emit('changed', { ok: props.need });
    },
    { immediate: true },
);
</script>

<template>
    <div class="running-float-input-component-content">
        <div class="running-content">
            <div class="label" v-if="props.ui.label">
                {{ props.ui.label }}
            </div>
            <el-input v-model="current" :placeholder="ui.placeholder" />
            <div class="error" v-if="!checked">
                <div v-if="current === undefined">
                    <span>input number</span>
                </div>
                <div v-else>
                    <span>max decimal is {{ decimal }}</span>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less">
@import '../../input.less';
</style>
