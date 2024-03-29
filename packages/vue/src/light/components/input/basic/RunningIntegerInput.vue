<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    CandidBigInt,
    CandidType,
    getInitialCandidTypeValue,
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
import IntegerInputVue from '../../constant/basic/IntegerInput.vue';

const isCandidBigInt = (type: CandidType): boolean => {
    switch (type.type) {
        case 'nat':
        case 'int':
        case 'nat64':
        case 'int64':
            return true;
    }
    return false;
};
const parseValue = (value: string | number | undefined): number | CandidBigInt | undefined => {
    if (!value) return undefined;
    if (isCandidBigInt(props.initial)) return { type: 'bigint', value: `${value}` };
    return parseInt(`${value}`);
};
const unwrapValue = (type: CandidType, v: number | CandidBigInt): number | BigInt => {
    return isCandidBigInt(type) ? BigInt((v as CandidBigInt).value) : (v as number);
};
const wrapValue = (type: CandidType, v: number | BigInt): number | CandidBigInt => {
    return isCandidBigInt(type) ? { type: 'bigint', value: `${v}` } : (v as number);
};

type NumberCandidType =
    | NatCandidType
    | IntCandidType
    | Nat8CandidType
    | Nat16CandidType
    | Nat32CandidType
    | Nat64CandidType
    | Int8CandidType
    | Int16CandidType
    | Int32CandidType
    | Int64CandidType;

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
    isBigInt: {
        type: Boolean,
        required: true,
    },
    regex: {
        type: String,
        required: true,
    },
    error: {
        type: String,
        required: true,
    },
    placeholder: {
        type: String,
        required: true,
    },
    maxValue: {
        type: String,
        required: true,
    },
    minValue: {
        type: String,
        required: true,
    },
    initial: {
        type: Object as PropType<NumberCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const defaultValueRef = ref<HTMLElement>();
const maxValueRef = ref<HTMLElement>();
const minValueRef = ref<HTMLElement>();

const current = ref<number | CandidBigInt | undefined>(
    readRuntime<number | CandidBigInt>(props.initial)?.ok,
);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<number | CandidBigInt>(
    parseValue(props.ui?.default) ??
        (getInitialCandidTypeValue(props.initial, [], []) as number | CandidBigInt),
);
const placeholder = ref(props.ui?.placeholder ?? '');
const hasMaxValue = ref<boolean>(props.ui?.style.max !== undefined);
const maxValue = ref<number | CandidBigInt>(
    parseValue(props.ui?.style.max) ??
        (getInitialCandidTypeValue(props.initial, [], []) as number | CandidBigInt),
);
const hasMinValue = ref<boolean>(props.ui?.style.min !== undefined);
const minValue = ref<number | CandidBigInt>(
    parseValue(props.ui?.style.min) ??
        (getInitialCandidTypeValue(props.initial, [], []) as number | CandidBigInt),
);

let currentResult: DataResult<number | CandidBigInt> =
    current.value !== undefined
        ? { ok: current.value }
        : { err: { message: `value can not be undefined` } };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<number | BigInt> = {
    ok: unwrapValue(props.initial, defaultValue.value),
};
let placeholderResult: DataResult<string> = { ok: placeholder.value };
let maxValueResult: DataResult<number | BigInt> = {
    ok: unwrapValue(props.initial, maxValue.value),
};
let minValueResult: DataResult<number | BigInt> = {
    ok: unwrapValue(props.initial, minValue.value),
};

const parsedCurrentValue = computed(() =>
    current.value !== undefined ? unwrapValue(props.initial, current.value) : '',
);
const parsedCurrentMaxValue = computed<string>(() =>
    hasMaxValue.value
        ? isCandidBigInt(props.initial)
            ? (maxValue.value as CandidBigInt).value
            : `${maxValue.value}`
        : props.maxValue,
);
const parsedCurrentMinValue = computed<string>(() =>
    hasMinValue.value
        ? isCandidBigInt(props.initial)
            ? (minValue.value as CandidBigInt).value
            : `${minValue.value}`
        : props.minValue,
);

const parsedDefaultValue = computed(() => unwrapValue(props.initial, defaultValue.value));
const parsedMaxValue = computed(() => unwrapValue(props.initial, maxValue.value));
const parsedMinValue = computed(() => unwrapValue(props.initial, minValue.value));

const extraError = computed(() => {
    const newDefaultValue = hasDefaultValue.value ? defaultValue.value : undefined;
    const newMaxValue = hasMaxValue.value ? maxValue.value : undefined;
    const newMinValue = hasMinValue.value ? minValue.value : undefined;

    if (newMaxValue !== undefined && newMinValue !== undefined) {
        const max = unwrapValue(props.initial, newMaxValue);
        const min = unwrapValue(props.initial, newMinValue);
        if (min > max) return 'The maximum value cannot be less than the minimum value';
    }
    if (newDefaultValue !== undefined) {
        const value = unwrapValue(props.initial, newDefaultValue);
        if (newMaxValue !== undefined) {
            const max = unwrapValue(props.initial, newMaxValue);
            if (max < value) return 'Defaults cannot be greater than the maximum value';
        }
        if (newMinValue !== undefined) {
            const min = unwrapValue(props.initial, newMinValue);
            if (min > value) return 'Defaults cannot be less than minimum';
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
        (getInitialCandidTypeValue(props.initial, [], []) as number | CandidBigInt);
    const newPlaceholder = props.ui?.placeholder ?? '';
    const newHasMaxValue = props.ui?.style.max !== undefined;
    const newMaxValue =
        parseValue(props.ui?.style.max) ??
        (getInitialCandidTypeValue(props.initial, [], []) as number | CandidBigInt);
    const newHasMinValue = props.ui?.style.min !== undefined;
    const newMinValue =
        parseValue(props.ui?.style.min) ??
        (getInitialCandidTypeValue(props.initial, [], []) as number | CandidBigInt);

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: unwrapValue(props.initial, newDefaultValue) };
    const newPlaceholderResult = { ok: newPlaceholder };
    const newMaxValueResult = { ok: unwrapValue(props.initial, newMaxValue) };
    const newMinValueResult = { ok: unwrapValue(props.initial, newMinValue) };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(placeholder.value, newPlaceholder) &&
        same(hasMaxValue.value, newHasMaxValue) &&
        same(maxValue.value, newMaxValue) &&
        same(hasMinValue.value, newHasMinValue) &&
        same(minValue.value, newMinValue) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(placeholderResult, newPlaceholderResult) &&
        same(maxValueResult, newMaxValueResult) &&
        same(minValueResult, newMinValueResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value = readRuntime<number | CandidBigInt>(props.initial)?.ok;

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    placeholder.value = newPlaceholder;
    hasMaxValue.value = newHasMaxValue;
    maxValue.value = newMaxValue;
    hasMinValue.value = newHasMinValue;
    minValue.value = newMinValue;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    placeholderResult = newPlaceholderResult;
    maxValueResult = newMaxValueResult;
    minValueResult = newMinValueResult;

    initialed = true;

    changed();
};

const onCurrentChanged = (r: DataResult<number | BigInt>) => {
    const rr = !r.err ? { ok: wrapValue(props.initial, r.ok) } : { err: r.err };

    currentResult = rr;

    if (rr.ok !== undefined) current.value = rr.ok;

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
const onDefaultValueChanged = (r: DataResult<number | BigInt>) => {
    defaultValueResult = r;

    if (r.ok !== undefined) {
        const old = current.value;
        if (old !== undefined && same(old, defaultValue.value))
            current.value = wrapValue(props.initial, r.ok);

        defaultValue.value = wrapValue(props.initial, r.ok);
    }

    changed();
};

const onPlaceholderChanged = (r: DataResult<string>) => {
    placeholderResult = r;

    if (r.ok !== undefined) placeholder.value = r.ok;

    changed();
};

const onHasMaxValueOptionChanged = () => {
    hasMaxValue.value = !hasMaxValue.value;

    changed();
};
const onMaxValueChanged = (r: DataResult<number | BigInt>) => {
    maxValueResult = r;

    if (r.ok !== undefined) maxValue.value = wrapValue(props.initial, r.ok);

    changed();
};

const onHasMinValueOptionChanged = () => {
    hasMinValue.value = !hasMinValue.value;

    changed();
};
const onMinValueChanged = (r: DataResult<number | BigInt>) => {
    minValueResult = r;

    if (r.ok !== undefined) minValue.value = wrapValue(props.initial, r.ok);

    changed();
};

const produce = (): DataResult<NumberCandidType> => {
    if (!initialed)
        return { err: { message: `${props.status} integer input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (hasDefaultValue.value && defaultValueResult.err !== undefined)
        return { err: defaultValueResult.err };
    if (placeholderResult.err !== undefined) return { err: placeholderResult.err };
    if (hasMaxValue.value && maxValueResult.err !== undefined) return { err: maxValueResult.err };
    if (hasMinValue.value && minValueResult.err !== undefined) return { err: minValueResult.err };

    const ok = props.initial;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', wrapValue(props.initial, defaultValueResult.ok!), hasDefaultValue.value);

    // checkAndAssignValue(ok, 'placeholder', placeholderResult.ok ? placeholderResult.ok : undefined);
    // checkAndAssignValue(ok, 'maxValue', wrapValue(props.initial, maxValueResult.ok!), hasMaxValue.value);
    // checkAndAssignValue(ok, 'minValue', wrapValue(props.initial, minValueResult.ok!), hasMinValue.value);

    // if (ok.maxValue !== undefined && ok.minValue !== undefined) {
    //     const max = unwrapValue(props.initial, ok.maxValue);
    //     const min = unwrapValue(props.initial, ok.minValue);
    //     if (min > max) {
    //         return {
    //             err: { message: `max value can not less than min value`, el: maxValueRef.value! },
    //         };
    //     }
    // }
    // if (ok.default !== undefined) {
    //     const value = unwrapValue(props.initial, ok.default);
    //     if (ok.maxValue !== undefined) {
    //         const max = unwrapValue(props.initial, ok.maxValue);
    //         if (max < value) {
    //             return {
    //                 err: {
    //                     message: 'default value can not greater than max value',
    //                     el: maxValueRef.value!,
    //                 },
    //             };
    //         }
    //     }
    //     if (ok.minValue !== undefined) {
    //         const min = unwrapValue(props.initial, ok.minValue);
    //         if (min > value) {
    //             return {
    //                 err: {
    //                     message: 'default value can not less than min value',
    //                     el: minValueRef.value!,
    //                 },
    //             };
    //         }
    //     }
    // }

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<NumberCandidType>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' ||
            ((!hasDefaultValue.value || !!defaultValueRef.value) &&
                (!hasMaxValue.value || !!maxValueRef.value) &&
                (!hasMinValue.value || !!minValueRef.value)),
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-integer-input-content">
        <div class="integer-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="integer-content">
                    <IntegerInputVue
                        :isBigInt="props.isBigInt"
                        :regex="props.regex"
                        :error="props.error"
                        :placeholder="placeholder ? placeholder : props.placeholder"
                        :maxValue="parsedCurrentMaxValue"
                        :minValue="parsedCurrentMinValue"
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
                                <IntegerInputVue
                                    :isBigInt="props.isBigInt"
                                    :regex="props.regex"
                                    :error="props.error"
                                    :placeholder="placeholder ? placeholder : props.placeholder"
                                    :maxValue="parsedCurrentMaxValue"
                                    :minValue="parsedCurrentMinValue"
                                    :initial="parsedDefaultValue"
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
                    <RunningWrappedOptionValueVue
                        :label="'Maximum'"
                        :need="false"
                        :initial="hasMaxValue"
                        @changed="onHasMaxValueOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasMaxValue">
                                <IntegerInputVue
                                    :isBigInt="props.isBigInt"
                                    :regex="props.regex"
                                    :error="props.error"
                                    :placeholder="'Maximum value (optional))'"
                                    :maxValue="props.maxValue"
                                    :minValue="props.minValue"
                                    :initial="parsedMaxValue"
                                    @changed="onMaxValueChanged"
                                    ref="maxValueRef"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                    <RunningWrappedOptionValueVue
                        :label="'Minimum'"
                        :need="false"
                        :initial="hasMinValue"
                        @changed="onHasMinValueOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasMinValue">
                                <IntegerInputVue
                                    :isBigInt="props.isBigInt"
                                    :regex="props.regex"
                                    :error="props.error"
                                    :placeholder="'Minimum value (optional))'"
                                    :maxValue="props.maxValue"
                                    :minValue="props.minValue"
                                    :initial="parsedMinValue"
                                    @changed="onMinValueChanged"
                                    ref="minValueRef"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                    <div class="error-info" v-if="extraError">
                        {{ extraError }}
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-integer-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .integer-main {
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
