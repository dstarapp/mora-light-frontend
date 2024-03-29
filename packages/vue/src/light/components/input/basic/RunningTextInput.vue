<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { getInitialCandidTypeValue, TextCandidType } from '@mora-light/core/types/candid';
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
import TextInputVue from '../../constant/basic/TextInput.vue';

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
    initial: {
        type: Object as PropType<TextCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const defaultValueRef = ref<HTMLElement>();

const current = ref<string>(
    readRuntime<string>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as string),
);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(!!props.ui?.default);
const defaultValue = ref<string>(getInitialCandidTypeValue(props.initial, [], []) as string);
const placeholder = ref(props.ui?.placeholder ?? '');
const hasTrim = ref<boolean>(props.ui?.trim === true);
const hasMaxLength = ref<boolean>(props.ui?.maxLength !== undefined);
const maxLength = ref<number>(props.ui?.maxLength ?? 0);
const error = ref(props.ui?.error ?? '');

let currentResult: DataResult<string> = { ok: current.value };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<string> = { ok: defaultValue.value };
let placeholderResult: DataResult<string> = { ok: placeholder.value };
let maxLengthResult: DataResult<number> = { ok: maxLength.value };
let errorResult: DataResult<string> = { ok: error.value };

const wrappedError = computed(() => (error.value ? error.value : 'Please enter the text'));

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
    const newHasDefaultValue = !!props.ui?.default;
    const newDefaultValue = getInitialCandidTypeValue(props.initial, [], []) as string;
    const newPlaceholder = props.ui?.placeholder ?? '';
    const newHasTrim = props.ui?.trim === true;
    const newHasMaxLength = props.ui?.maxLength !== undefined;
    const newMaxLength = props.ui?.maxLength ?? 0;
    const newError = props.ui?.error ?? '';

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newPlaceholderResult = { ok: newPlaceholder };
    const newMaxLengthResult = { ok: newMaxLength };
    const newErrorResult = { ok: newError };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(placeholder.value, newPlaceholder) &&
        same(hasTrim.value, newHasTrim) &&
        same(hasMaxLength.value, newHasMaxLength) &&
        same(maxLength.value, newMaxLength) &&
        same(error.value, newError) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(placeholderResult, newPlaceholderResult) &&
        same(maxLengthResult, newMaxLengthResult) &&
        same(errorResult, newErrorResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value =
        readRuntime<string>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as string);

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    placeholder.value = newPlaceholder;
    hasTrim.value = newHasTrim;
    hasMaxLength.value = newHasMaxLength;
    maxLength.value = newMaxLength;
    error.value = newError;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    placeholderResult = newPlaceholderResult;
    maxLengthResult = newMaxLengthResult;
    errorResult = newErrorResult;

    initialed = true;

    changed();
};

const onCurrentChanged = (r: DataResult<string>) => {
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
const onDefaultValueChanged = (r: DataResult<string>) => {
    defaultValueResult = r;

    if (r.ok !== undefined) {
        const old = current.value;
        if (old && old === defaultValue.value) current.value = r.ok;

        defaultValue.value = r.ok;
    }

    changed();
};

const onPlaceholderChanged = (r: DataResult<string>) => {
    placeholderResult = r;

    if (r.ok !== undefined) placeholder.value = r.ok;

    changed();
};

const onHasTrimOptionChanged = () => {
    hasTrim.value = !hasTrim.value;

    changed();
};

const onHasMaxLengthOptionChanged = () => {
    hasMaxLength.value = !hasMaxLength.value;

    changed();
};
const onMaxLengthChanged = (r: DataResult<string>) => {
    const rr: DataResult<number> = !r.err ? { ok: parseInt(r.ok) } : { err: r.err };

    maxLengthResult = rr;

    if (rr.ok !== undefined) maxLength.value = rr.ok;

    changed();
};

const onErrorChanged = (r: DataResult<string>) => {
    errorResult = r;

    if (r.ok !== undefined) error.value = r.ok;

    changed();
};

const produce = (): DataResult<TextCandidType> => {
    if (!initialed) return { err: { message: `${props.status} text input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (hasDefaultValue.value && defaultValueResult.err !== undefined)
        return { err: defaultValueResult.err };
    if (placeholderResult.err !== undefined) return { err: placeholderResult.err };
    if (hasMaxLength.value && maxLengthResult.err !== undefined)
        return { err: maxLengthResult.err };
    if (errorResult.err !== undefined) return { err: errorResult.err };

    const ok = props.initial;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(
    //     ok,
    //     'default',
    //     defaultValueResult.ok
    //         ? hasTrim.value
    //             ? defaultValueResult.ok.trim()
    //             : defaultValueResult.ok
    //         : undefined,
    //     hasDefaultValue.value,
    // );

    // checkAndAssignValue(ok, 'placeholder', placeholderResult.ok ? placeholderResult.ok : undefined);
    // checkAndAssignValue(ok, 'trim', true, hasTrim.value);
    // checkAndAssignValue(ok, 'maxLength', maxLengthResult.ok, hasMaxLength.value);
    // checkAndAssignValue(ok, 'error', errorResult.ok ? errorResult.ok : undefined);

    // const newTrim = hasTrim.value;
    // const newDefaultValue = hasDefaultValue.value
    //     ? newTrim
    //         ? defaultValue.value.trim()
    //         : defaultValue.value
    //     : undefined;
    // const newMaxLength = hasMaxLength.value ? maxLength.value : 4096;

    // if (newDefaultValue !== undefined) {
    //     if (newDefaultValue.length > newMaxLength)
    //         return {
    //             err: {
    //                 message: 'the length of default value can not greater than max length',
    //                 el: defaultValueRef.value!,
    //             },
    //         };
    // }

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<TextCandidType>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' || !hasDefaultValue.value || !!defaultValueRef.value,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-text-input-content">
        <div class="text-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="text-content">
                    <TextInputVue
                        :validator="''"
                        :placeholder="placeholder"
                        :trim="hasTrim"
                        :maxLength="hasMaxLength ? maxLength : 4096"
                        :error="wrappedError"
                        :initial="current"
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
                                <TextInputVue
                                    :validator="''"
                                    :placeholder="placeholder"
                                    :trim="hasTrim"
                                    :maxLength="hasMaxLength ? maxLength : 4096"
                                    :error="wrappedError"
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
                    <RunningWrappedOptionValueVue
                        :label="'Remove the head and tail space'"
                        :need="false"
                        :initial="hasTrim"
                        @changed="onHasTrimOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasTrim"></div>
                        </template>
                    </RunningWrappedOptionValueVue>
                    <RunningWrappedOptionValueVue
                        :label="'The maximum length'"
                        :need="false"
                        :initial="hasMaxLength"
                        @changed="onHasMaxLengthOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasMaxLength">
                                <TextInputVue
                                    :placeholder="'Please enter the maximum length (maximum 4096)'"
                                    :trim="true"
                                    :validator="'^([0-9]|[1-3]?[1-9][0-9]{1,2}|40[0-8][0-9]|409[0-6])$'"
                                    :maxLength="4096"
                                    :error="'Please enter the maximum length (maximum 4096)'"
                                    :initial="`${maxLength}`"
                                    @changed="onMaxLengthChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                    <RunningWrappedTextInputVue
                        :label="'Error message'"
                        :validator="''"
                        :placeholder="'Please enter the error prompt (optional)'"
                        :trim="true"
                        :maxLength="32"
                        :error="'Please enter the error prompt, Maximum length 32'"
                        :initial="error"
                        @changed="onErrorChanged"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-text-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .text-main {
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
            }
        }
    }
}
</style>
