<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    Float32CandidType,
    Float64CandidType,
    getInitialCandidTypeValue,
    Float64Decimal,
} from '@mora-light/core/types/candid';
import {
    checkAndAssignValue,
    checkAndExecute,
    DataResult,
    readRuntime,
    same,
} from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningWrappedTextInputVue from '../../common/RunningWrappedTextInput.vue';
import RunningWrappedOptionValueVue from '../../common/RunningWrappedOptionValue.vue';
import FloatInputVue from '../../constant/basic/FloatInput.vue';

const parseValue = (value: string | number | undefined): number | undefined => {
    if (!value) return undefined;
    return parseFloat(`${value}`);
};

type FloatCandidType = Float32CandidType | Float64CandidType;

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    mustValidateCurrent: {
        type: Boolean,
        required: true,
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    maxDecimal: {
        type: Number as PropType<6 | 15>,
        required: true,
    },
    initial: {
        type: Object as PropType<FloatCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const defaultValueRef = ref<HTMLElement>();
const decimalRef = ref<HTMLElement>();

const current = ref<number | undefined>(readRuntime<number>(props.initial)?.ok);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<number>(
    parseValue(props.ui?.default) ?? (getInitialCandidTypeValue(props.initial, [], []) as number),
);
const placeholder = ref(props.ui?.placeholder ?? '');
const decimal = ref(props.ui?.style.decimal ?? 15);

let currentResult: DataResult<number> =
    current.value !== undefined
        ? { ok: current.value }
        : { err: { message: `value can not be undefined` } };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<number> = { ok: defaultValue.value };
let placeholderResult: DataResult<string> = { ok: placeholder.value };
let decimalResult: DataResult<number> = { ok: decimal.value };

const parsedCurrentValue = computed(() => current.value ?? '');
const parsedCurrentRegex = computed<string>(() => {
    if (props.maxDecimal === 6) {
        // 32-bit floating point number
        switch (decimal.value) {
            case 0:
                return '^(0|[+-]?(0|([1-9][0-9]*))|[+-]?[1-9][eE][+-]?([1-9]|[1-2][0-9]|[3][0-8]))$';
            case 1:
                return '^(0|[+-]?(0|([1-9][0-9]*))(.[1-9])?|[+-]?[1-9](.[1-9])?[eE][+-]?([1-9]|[1-2][0-9]|[3][0-8]))$';
        }
        return `^(0|[+-]?(0|([1-9][0-9]*))(.[0-9]{0,${
            decimal.value - 1
        }}[1-9])?|[+-]?[1-9](.[0-9]{0,${
            decimal.value - 1
        }}[1-9])?[eE][+-]?([1-9]|[1-2][0-9]|[3][0-8]))$`;
    }
    switch (decimal.value) {
        case 0:
            return '^(0|[+-]?(0|([1-9][0-9]*))|[+-]?[1-9][eE][+-]?([1-9]|[1-9][0-9]|[12][0-9][0-9]|30[0-8]))$';
        case 1:
            return '^(0|[+-]?(0|([1-9][0-9]*))(.[1-9])?|[+-]?[1-9](.[1-9])?[eE][+-]?([1-9]|[1-9][0-9]|[12][0-9][0-9]|30[0-8]))$';
    }
    return `^(0|[+-]?(0|([1-9][0-9]*))(.[0-9]{0,${decimal.value - 1}}[1-9])?|[+-]?[1-9](.[0-9]{0,${
        decimal.value - 1
    }}[1-9])?[eE][+-]?([1-9]|[1-9][0-9]|[12][0-9][0-9]|30[0-8]))$`;
});
const parsedCurrentError = computed<string>(
    () => `Please enter ${props.maxDecimal === 6 ? 'Single' : 'Double'} Floating point number`,
);

const extraError = computed(() => {
    const newDefaultValue = hasDefaultValue.value ? defaultValue.value : undefined;
    const newDecimal = decimal.value;

    if (newDefaultValue !== undefined) {
        const value = `${defaultValueResult.ok}`;
        const index = value.indexOf('.');
        if (index >= 0 && value.split(/e|E/)[0].length - index - 1 > newDecimal) {
            return 'The accuracy of Defaults cannot be greater than the limit accuracy';
        }
    }
    return '';
});

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
    const newLabel = props.ui?.label ?? '';
    const newHasDefaultValue = props.ui?.default !== undefined;
    const newDefaultValue =
        parseValue(props.ui?.default) ??
        (getInitialCandidTypeValue(props.initial, [], []) as number);
    const newPlaceholder = props.ui?.placeholder ?? '';
    const newDecimal = props.ui?.style.decimal ?? 15;

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newPlaceholderResult = { ok: newPlaceholder };
    const newDecimalResult = { ok: newDecimal };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(placeholder.value, newPlaceholder) &&
        same(decimal.value, newDecimal) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(placeholderResult, newPlaceholderResult) &&
        same(decimalResult, newDecimalResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value = readRuntime<number>(props.initial)?.ok;

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    placeholder.value = newPlaceholder;
    decimal.value = newDecimal;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    placeholderResult = newPlaceholderResult;
    decimalResult = newDecimalResult;

    initialed = true;

    changed();
};

const onCurrentChanged = (r: DataResult<number>) => {
    currentResult = r;

    if (r.ok !== undefined) current.value = r.ok;

    changed();
};

const onLabelChanged = (r: DataResult<string>) => {
    labelResult = r;

    if (r.ok !== undefined) label.value = r.ok;

    changed();
};

const onHasDefaultValueOptionChanged = () => {
    hasDefaultValue.value = !hasDefaultValue.value;

    changed();
};
const onDefaultValueChanged = (r: DataResult<number>) => {
    defaultValueResult = r;

    if (r.ok !== undefined) {
        const old = current.value;
        if (old === defaultValue.value) current.value = r.ok;

        defaultValue.value = r.ok;
    }

    changed();
};

const onPlaceholderChanged = (r: DataResult<string>) => {
    placeholderResult = r;

    if (r.ok !== undefined) placeholder.value = r.ok;

    changed();
};
const onDecimalChanged = (r: DataResult<string>) => {
    const rr = !r.err ? { ok: parseInt(r.ok) as Float64Decimal } : { err: r.err };

    decimalResult = rr;

    if (rr.ok !== undefined) decimal.value = rr.ok;

    changed();
};

const produce = (): DataResult<FloatCandidType> => {
    if (!initialed)
        return { err: { message: `${props.status} float input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (defaultValueResult.err !== undefined) return { err: defaultValueResult.err };
    if (placeholderResult.err !== undefined) return { err: placeholderResult.err };
    if (decimalResult.err !== undefined) return { err: decimalResult.err };

    const ok: FloatCandidType = props.initial;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    // checkAndAssignValue(ok, 'placeholder', placeholderResult.ok ? placeholderResult.ok : undefined);
    // checkAndAssignValue(ok, 'decimal', decimalResult.ok !== 15 ? decimalResult.ok : undefined);

    // if (decimalResult.ok !== undefined) {
    //     if (hasDefaultValue.value) {
    //         const value = `${defaultValueResult.ok}`;
    //         const index = value.indexOf('.');
    //         if (index >= 0 && value.split(/e|E/)[0].length - index - 1 > (ok.decimal ?? 15)) {
    //             return {
    //                 err: {
    //                     message: "default value's decimal can not greater than decimal value",
    //                     el: decimalRef.value!,
    //                 },
    //             };
    //         }
    //     }
    // }

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<FloatCandidType>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' ||
            ((!hasDefaultValue.value || !!defaultValueRef.value) && !!decimalRef.value),
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-float-input-content">
        <div class="float-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="float-content">
                    <FloatInputVue
                        :regex="parsedCurrentRegex"
                        :error="parsedCurrentError"
                        :placeholder="placeholder"
                        :decimal="decimal"
                        :initial="parsedCurrentValue"
                        @changed="onCurrentChanged"
                    />
                </div>
            </div>
            <div class="right" v-if="props.status === 'using'">
                <div class="blank"></div>
                <div class="input">
                    <RunningWrappedTextInputVue
                        v-if="props.hasLabel"
                        :label="'Label'"
                        :validator="''"
                        :placeholder="'Please enter label (optional)'"
                        :trim="true"
                        :maxLength="32"
                        :error="'Maximum length 32'"
                        :initial="label"
                        @changed="onLabelChanged"
                    />
                    <RunningWrappedOptionValueVue
                        :label="'Defaults'"
                        :need="false"
                        :initial="hasDefaultValue"
                        @changed="onHasDefaultValueOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasDefaultValue">
                                <FloatInputVue
                                    :regex="parsedCurrentRegex"
                                    :error="parsedCurrentError"
                                    :placeholder="placeholder"
                                    :decimal="decimal"
                                    :initial="defaultValue"
                                    @changed="onDefaultValueChanged"
                                    ref="defaultValueRef"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>

                    <RunningWrappedTextInputVue
                        :label="'Placeholder'"
                        :validator="''"
                        :placeholder="'Placeholder content (optional)'"
                        :trim="true"
                        :maxLength="32"
                        :error="'Maximum length 32'"
                        :initial="placeholder"
                        @changed="onPlaceholderChanged"
                    />
                    <RunningWrappedTextInputVue
                        :label="'Accuracy'"
                        :validator="props.maxDecimal === 6 ? '^([0-6])$' : '^([0-9]|1[0-5])$'"
                        :placeholder="`Please enter accuracy value (default ${props.maxDecimal})`"
                        :trim="true"
                        :maxLength="2"
                        :error="`Please enter accuracy value, scope:[0, ${props.maxDecimal}]`"
                        :initial="`${decimal}`"
                        @changed="onDecimalChanged"
                        ref="decimalRef"
                    />
                    <div class="error-info" v-if="extraError">
                        {{ extraError }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-float-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .float-main {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
        > .main-content {
            width: 100%;
            > .label {
                margin-bottom: 3px;
                font-size: 12px;
                opacity: 0.7;
            }
        }
        > .right {
            display: flex;
            display: none;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            padding-bottom: 5px;
            > .blank {
                width: 10px;
                height: 100%;
            }
            > .input {
                width: 220px;
                flex-shrink: 0;
                border-left: 1px solid #ccc;
                padding-left: 10px;
                display: flex;
                flex-direction: column;
                justify-content: flex-start;
                align-items: flex-start;
                > div {
                    margin-top: 5px;
                    &:first-child {
                        margin-top: 0px;
                    }
                }
                > .error-info {
                    font-size: 12px;
                    color: #880000;
                }
            }
        }
    }
}
</style>
