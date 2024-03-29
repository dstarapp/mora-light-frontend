<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import {
    NAT_REGEX,
    NAT32_MAX,
    NAT_MIN,
    CandidType,
    CandidValue,
    getInitialCandidTypeValue,
    VecCandidType,
} from '@mora-light/core/types/candid';
import { ComponentStatus } from '@mora-light/core/types/running';
import { checkAndAssignValue, DataResult, readRuntime, same } from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningWrappedTextInputVue from '../../common/RunningWrappedTextInput.vue';
import RunningWrappedOptionValueVue from '../../common/RunningWrappedOptionValue.vue';
import VecInputVue from '../../constant/combined/VecInput.vue';
import IntegerInputVue from '../../constant/basic/IntegerInput.vue';
import RunningInputCandidTypeVue from '../RunningInputCandidType.vue';

const props = defineProps({
    layer: {
        type: Number,
        required: true,
    },
    mustValidateCurrent: {
        type: Boolean,
        required: true,
    },
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    hasLabel: {
        type: Boolean,
        required: true,
    },
    initial: {
        type: Object as PropType<VecCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const current = ref<CandidValue[]>(
    readRuntime<CandidValue[]>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as CandidValue[]),
);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<CandidValue[]>(
    getInitialCandidTypeValue(props.initial, [], []) as CandidValue[],
);
const hasLength = ref(props.ui?.length !== undefined);
const length = ref(props.ui?.length ?? 0);

const subtype = ref(props.initial.subtype);

let currentResult: DataResult<CandidValue[]> = { ok: current.value };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<CandidValue[]> = { ok: defaultValue.value };
let lengthResult: DataResult<number> = { ok: length.value };
let subtypeResult: DataResult<CandidType> = { ok: subtype.value };

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
    const newDefaultValue = getInitialCandidTypeValue(props.initial, [], []) as CandidValue[];
    const newHasLength = props.ui?.length !== undefined;
    const newLength = props.ui?.length ?? 0;
    const newSubtype = props.initial.subtype;

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newLengthResult = { ok: newLength };
    const newSubtypeResult = { ok: newSubtype };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(hasLength.value, newHasLength) &&
        same(length.value, newLength) &&
        same(subtype.value, newSubtype) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(lengthResult, newLengthResult) &&
        same(subtypeResult, newSubtypeResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value =
        readRuntime<CandidValue[]>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as CandidValue[]);

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    hasLength.value = newHasLength;
    length.value = newLength;
    subtype.value = newSubtype;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    lengthResult = newLengthResult;
    subtypeResult = newSubtypeResult;

    initialed = true;

    changed();
};

const onCurrentChanged = (r: DataResult<CandidValue[]>) => {
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

const onSubtypeChanged = (r: DataResult<CandidType>) => {
    subtypeResult = r;

    if (r.ok !== undefined) subtype.value = r.ok;

    changed();
};

const produce = (): DataResult<VecCandidType> => {
    if (!initialed) return { err: { message: `${props.status} vec input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (defaultValueResult.err !== undefined) return { err: defaultValueResult.err };
    if (lengthResult.err !== undefined) return { err: lengthResult.err };
    if (subtypeResult.err !== undefined) return { err: subtypeResult.err };

    const ok: VecCandidType = props.initial;

    ok.subtype = subtypeResult.ok;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    // checkAndAssignValue(ok, 'length', lengthResult.ok, hasLength.value);

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<VecCandidType>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-vec-input-content">
        <div class="vec-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="vec-content">
                    <template v-if="!hasLength || length">
                        <VecInputVue
                            :layer="1"
                            :recItems="[]"
                            :subtype="subtype"
                            :length="hasLength ? length : undefined"
                            :initial="current"
                            @changed="onCurrentChanged"
                        />
                    </template>
                    <template v-else>
                        <div class="empty-vec">[]</div>
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
                                    :subtype="subtype"
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
        <div class="vec-sub" v-if="props.status === 'using'">
            <span class="tip"> Subtype </span>
            <RunningInputCandidTypeVue
                :layer="props.layer + 1"
                :status="props.status"
                :mustValidateCurrent="props.mustValidateCurrent"
                :hasLabel="false"
                :initial="subtype"
                @changed="onSubtypeChanged"
            />
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-vec-input-content {
    @apply w-full flex flex-col justify-center items-center;
    > .vec-main {
        @apply w-full flex flex-row justify-between items-start;
        > .main-content {
            @apply w-full;
            > .label {
                @apply mb-1 text-xs opacity-70;
            }
            > .vec-content {
                @apply h-auto flex flex-row justify-start items-center;
                > span {
                    @apply ml-1;
                }
                > .empty-vec {
                    @apply h-7 flex items-center;
                }
            }
        }
        > .right {
            @apply flex flex-row hidden justify-center items-center pb-1;
            > .blank {
                @apply w-2 h-full;
            }
            > .input {
                @apply w-55 flex flex-col justify-start items-start flex-shrink-0 border-l border-gray-300 pl-2 dark:(border-dark-100);
                > div {
                    @apply mt-1;
                    &:first-child {
                        @apply mt-0;
                    }
                }
                > .default-value {
                    > .default-component {
                        @apply w-full;
                    }
                }
            }
        }
    }
    > .vec-sub {
        @apply mt-1 w-full flex flex-row justify-start items-start;
        > span {
            @apply w-17 h-7 flex items-center flex-shrink-0;
        }
    }
}
</style>
