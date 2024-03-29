<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    NAT_REGEX,
    NAT32_MAX,
    NAT_MIN,
    BlobCandidType,
    getInitialCandidTypeValue,
} from '@mora-light/core/types/candid';
import { checkAndAssignValue, DataResult, readRuntime, same } from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningWrappedTextInputVue from '../../common/RunningWrappedTextInput.vue';
import RunningWrappedOptionValueVue from '../../common/RunningWrappedOptionValue.vue';
import VecInputVue from '../../constant/combined/VecInput.vue';
import IntegerInputVue from '../../constant/basic/IntegerInput.vue';

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
        type: Object as PropType<BlobCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const current = ref<number[]>(
    readRuntime<number[]>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as number[]),
);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<number[]>(getInitialCandidTypeValue(props.initial, [], []) as number[]);
const hasLength = ref(props.ui?.length !== undefined);
const length = ref(props.ui?.length ?? 0);

let currentResult: DataResult<number[]> = { ok: current.value };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<number[]> = { ok: defaultValue.value };
let lengthResult: DataResult<number> = { ok: length.value };

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
    const newDefaultValue = getInitialCandidTypeValue(props.initial, [], []) as number[];
    const newHasLength = props.ui?.length !== undefined;
    const newLength = props.ui?.length ?? 0;

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newLengthResult = { ok: newLength };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(hasLength.value, newHasLength) &&
        same(length.value, newLength) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(lengthResult, newLengthResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value =
        readRuntime<number[]>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as number[]);

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    hasLength.value = newHasLength;
    length.value = newLength;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    lengthResult = newLengthResult;

    initialed = true;

    changed();
};

const onCurrentChanged = (r: DataResult<number[]>) => {
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
const onDefaultValueChanged = (r: DataResult<number[]>) => {
    defaultValueResult = r;

    if (r.ok !== undefined) defaultValue.value = r.ok;

    changed();
};

const onHasLengthOptionChanged = () => {
    hasLength.value = !hasLength.value;

    changed();
};
const onLengthChanged = (r: DataResult<number>) => {
    lengthResult = r;

    if (r.ok !== undefined) length.value = r.ok;

    changed();
};

const produce = (): DataResult<BlobCandidType> => {
    if (!initialed) return { err: { message: `${props.status} blob input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (defaultValueResult.err !== undefined) return { err: defaultValueResult.err };
    if (lengthResult.err !== undefined) return { err: lengthResult.err };

    const ok = props.initial;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    // checkAndAssignValue(ok, 'length', lengthResult.ok, hasLength.value);

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<BlobCandidType>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-blob-input-content">
        <div class="blob-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="blob-content">
                    <template v-if="!hasLength || length">
                        <VecInputVue
                            :layer="1"
                            :recItems="[]"
                            :subtype="{ type: 'nat8' }"
                            :length="hasLength ? length : undefined"
                            :initial="current"
                            @changed="onCurrentChanged"
                        />
                    </template>
                    <template v-else>
                        <div class="empty-blob">[]</div>
                    </template>
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
                        class="default-value"
                        :label="'Defaults'"
                        :need="false"
                        :initial="hasDefaultValue"
                        @changed="onHasDefaultValueOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasDefaultValue">
                                <VecInputVue
                                    :layer="1"
                                    :recItems="[]"
                                    :subtype="{ type: 'nat8' }"
                                    :length="hasLength ? length : undefined"
                                    :initial="defaultValue"
                                    @changed="onDefaultValueChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>

                    <RunningWrappedOptionValueVue
                        :label="'Specified length'"
                        :need="false"
                        :initial="hasLength"
                        @changed="onHasLengthOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasLength">
                                <IntegerInputVue
                                    :isBigInt="false"
                                    :regex="NAT_REGEX"
                                    :error="'Please enter the non-negative integer'"
                                    :placeholder="''"
                                    :maxValue="`${NAT32_MAX}`"
                                    :minValue="`${NAT_MIN}`"
                                    :initial="length"
                                    @changed="onLengthChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-blob-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .blob-main {
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
            > .blob-content {
                height: auto;
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                > span {
                    margin-left: 5px;
                }
                > .empty-blob {
                    height: 28px;
                    display: flex;
                    align-items: center;
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
                > .default-value {
                    > .default-component {
                        width: 100%;
                    }
                }
            }
        }
    }
}
</style>
