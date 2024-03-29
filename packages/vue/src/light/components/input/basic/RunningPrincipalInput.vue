<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CandidPrincipal,
    getInitialCandidTypeValue,
    PrincipalCandidType,
} from '@mora-light/core/types/candid';
import { ComponentStatus } from '@mora-light/core/types/running';
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
import PrincipalInputVue from '../../constant/basic/PrincipalInput.vue';

const unwrapValue = (v: CandidPrincipal): string => v.value;
const wrapValue = (v: string): CandidPrincipal => {
    return { type: 'principal', value: v };
};

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
        type: Object as PropType<PrincipalCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const defaultValueRef = ref<HTMLElement>();

const current = ref<CandidPrincipal | undefined>(readRuntime<CandidPrincipal>(props.initial)?.ok);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(!!props.ui?.default);
const defaultValue = ref<CandidPrincipal>(
    getInitialCandidTypeValue(props.initial, [], []) as CandidPrincipal,
);
const placeholder = ref(props.ui?.placeholder ?? '');
const error = ref(props.ui?.error ?? '');

let currentResult: DataResult<CandidPrincipal> =
    current.value !== undefined
        ? { ok: current.value }
        : { err: { message: `value can not be undefined` } };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<CandidPrincipal> = { ok: defaultValue.value };
let placeholderResult: DataResult<string> = { ok: placeholder.value };
let errorResult: DataResult<string> = { ok: error.value };

const parsedCurrentValue = computed(() =>
    current.value !== undefined ? unwrapValue(current.value) : '',
);
const parsedDefaultValue = computed(() => unwrapValue(defaultValue.value));
const wrappedError = computed(() => (error.value ? error.value : 'Please enter the Principal ID'));

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
    const newDefaultValue = getInitialCandidTypeValue(props.initial, [], []) as CandidPrincipal;
    const newPlaceholder = props.ui?.placeholder ?? '';
    const newError = props.ui?.error ?? '';

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = newDefaultValue.value
        ? { ok: newDefaultValue }
        : {
              err: {
                  message: 'default principal value can not be empty',
                  el: defaultValueRef.value,
              },
          };
    const newPlaceholderResult = { ok: newPlaceholder };
    const newErrorResult = { ok: newError };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(placeholder.value, newPlaceholder) &&
        same(error.value, newError) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(placeholderResult, newPlaceholderResult) &&
        same(errorResult, newErrorResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value = readRuntime<CandidPrincipal>(props.initial)?.ok;

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    placeholder.value = newPlaceholder;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    placeholderResult = newPlaceholderResult;

    initialed = true;

    changed();
};

const onCurrentChanged = (r: DataResult<string>) => {
    const rr = !r.err ? { ok: wrapValue(r.ok) } : { err: r.err };

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
const onDefaultValueChanged = (r: DataResult<string>) => {
    const rr = !r.err ? { ok: wrapValue(r.ok) } : { err: r.err };

    defaultValueResult = rr;

    if (rr.ok !== undefined) {
        const old = current.value;
        if (old && same(old, defaultValue.value)) current.value = rr.ok;

        defaultValue.value = rr.ok;
    }

    changed();
};

const onPlaceholderChanged = (r: DataResult<string>) => {
    placeholderResult = r;

    if (r.ok !== undefined) placeholder.value = r.ok;

    changed();
};

const onErrorChanged = (r: DataResult<string>) => {
    errorResult = r;

    if (r.ok !== undefined) error.value = r.ok;

    changed();
};

const produce = (): DataResult<PrincipalCandidType> => {
    if (!initialed)
        return { err: { message: `${props.status} principal input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (hasDefaultValue.value && defaultValueResult.err !== undefined)
        return { err: defaultValueResult.err };
    if (placeholderResult.err !== undefined) return { err: placeholderResult.err };
    if (errorResult.err !== undefined) return { err: errorResult.err };

    const ok = props.initial;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    // checkAndAssignValue(ok, 'placeholder', placeholderResult.ok ? placeholderResult.ok : undefined);
    // checkAndAssignValue(ok, 'error', errorResult.ok ? errorResult.ok : undefined);

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<PrincipalCandidType>];
}>();

const changed = () =>
    checkAndExecute(
        props.status !== 'using' || !hasDefaultValue.value || !!defaultValueRef.value,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-principal-input-content">
        <div class="principal-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="principal-content">
                    <PrincipalInputVue
                        :placeholder="placeholder"
                        :error="wrappedError"
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
                                <PrincipalInputVue
                                    :placeholder="placeholder"
                                    :error="wrappedError"
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
.running-principal-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .principal-main {
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
