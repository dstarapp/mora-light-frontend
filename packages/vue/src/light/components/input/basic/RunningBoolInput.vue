<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { BoolCandidType, getInitialCandidTypeValue } from '@mora-light/core/types/candid';
import { checkAndAssignValue, DataResult, readRuntime, same } from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningWrappedTextInputVue from '../../common/RunningWrappedTextInput.vue';
import RunningWrappedOptionValueVue from '../../common/RunningWrappedOptionValue.vue';
import BoolInputVue from '../../constant/basic/BoolInput.vue';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    initial: {
        type: Object as PropType<BoolCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const current = ref<boolean>(
    readRuntime<boolean>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as boolean),
);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<boolean>(
    props.ui?.default ?? (getInitialCandidTypeValue(props.initial, [], []) as boolean),
);
const trueText = ref(props.ui?.style.activeText ?? '');
const falseText = ref(props.ui?.style.inactiveText ?? '');

let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<boolean> = { ok: defaultValue.value };
let trueTextResult: DataResult<string> = { ok: trueText.value };
let falseTextResult: DataResult<string> = { ok: falseText.value };

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
        props.ui?.default ?? (getInitialCandidTypeValue(props.initial, [], []) as boolean);
    const newTrueText = props.ui?.style.activeText ?? '';
    const newFalseText = props.ui?.style.inactiveText ?? '';

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newTrueTextResult = { ok: newTrueText };
    const newFalseTextResult = { ok: newFalseText };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(trueText.value, newTrueText) &&
        same(falseText.value, newFalseText) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(trueTextResult, newTrueTextResult) &&
        same(falseTextResult, newFalseTextResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value =
        readRuntime<boolean>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as boolean);

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    trueText.value = newTrueText;
    falseText.value = newFalseText;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    trueTextResult = newTrueTextResult;
    falseTextResult = newFalseTextResult;

    initialed = true;

    changed();
};

const onCurrentChanged = () => {
    current.value = !current.value;

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
const onDefaultValueChanged = (r: DataResult<boolean>) => {
    defaultValueResult = r;

    if (r.ok !== undefined) defaultValue.value = r.ok;

    changed();
};

const onTrueTextChanged = (r: DataResult<string>) => {
    trueTextResult = r;

    if (r.ok !== undefined) trueText.value = r.ok;

    changed();
};

const onFalseTextChanged = (r: DataResult<string>) => {
    falseTextResult = r;

    if (r.ok !== undefined) falseText.value = r.ok;

    changed();
};

const produce = (): DataResult<BoolCandidType> => {
    if (!initialed) return { err: { message: `${props.status} bool input has not been initial.` } };

    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (defaultValueResult.err !== undefined) return { err: defaultValueResult.err };

    const ok = props.initial;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    // checkAndAssignValue(ok, 'trueText', trueTextResult.ok ? trueTextResult.ok : undefined);
    // checkAndAssignValue(ok, 'falseText', falseTextResult.ok ? falseTextResult.ok : undefined);

    checkAndAssignValue(ok, 'runtime', { ok: current.value });

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<BoolCandidType>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-bool-input-content">
        <div class="bool-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="bool-content">
                    <input type="checkbox" :checked="current" @change="onCurrentChanged" />
                    <span>
                        {{
                            current
                                ? trueText
                                    ? trueText
                                    : 'true'
                                : falseText
                                ? falseText
                                : 'false'
                        }}
                    </span>
                </div>
            </div>
            <div class="right" v-if="props.status === 'using'">
                <div class="blank"></div>
                <div class="input">
                    <RunningWrappedTextInputVue
                        v-if="props.hasLabel"
                        :label="'Label'"
                        :validator="''"
                        :placeholder="'Please enter the tag (optional)'"
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
                                <BoolInputVue
                                    :trueText="trueText"
                                    :falseText="falseText"
                                    :initial="defaultValue"
                                    @changed="onDefaultValueChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>

                    <RunningWrappedTextInputVue
                        :label="'true text'"
                        :validator="''"
                        :placeholder="'Please enter true text (optional)'"
                        :trim="true"
                        :maxLength="32"
                        :error="'Maximum length 32 length 32'"
                        :initial="trueText"
                        @changed="onTrueTextChanged"
                    />
                    <RunningWrappedTextInputVue
                        :label="'false text'"
                        :validator="''"
                        :placeholder="'Please enter false text (optional)'"
                        :trim="true"
                        :maxLength="32"
                        :error="'Maximum length 32'"
                        :initial="falseText"
                        @changed="onFalseTextChanged"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-bool-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .bool-main {
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
            > .bool-content {
                height: 28px;
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                > input {
                    cursor: pointer;
                }
                > span {
                    margin-left: 5px;
                    font-size: 14px;
                    color: #333;
                }
            }
        }
        > .right {
            display: flex;
            display: none;
            flex-direction: row;
            justify-content: center;
            align-items: center;
            padding-bottom: 5px;
            display: none;
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
