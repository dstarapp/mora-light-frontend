<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    CandidType,
    CandidValue,
    getInitialCandidTypeValue,
    OptCandidType,
} from '@mora-light/core/types/candid';
import { checkAndAssignValue, DataResult, readRuntime, same } from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningWrappedTextInputVue from '../../common/RunningWrappedTextInput.vue';
import RunningWrappedOptionValueVue from '../../common/RunningWrappedOptionValue.vue';
import OptInputVue from '../../constant/combined/OptInput.vue';
import BoolInputVue from '../../constant/basic/BoolInput.vue';
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
        type: Object as PropType<OptCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const current = ref<CandidValue[]>(
    readRuntime<CandidValue[]>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as [] | CandidValue[]),
);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<CandidValue[]>(
    getInitialCandidTypeValue(props.initial, [], []) as [] | CandidValue[],
);
const hasHas = ref(props.ui?.has !== undefined);
const has = ref(props.ui?.has ?? false);

const subtype = ref(props.initial.subtype);

let currentResult: DataResult<CandidValue[]> = { ok: current.value };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<CandidValue[]> = { ok: defaultValue.value };
let hasResult: DataResult<boolean> = { ok: has.value };
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
    const newDefaultValue = getInitialCandidTypeValue(props.initial, [], []) as [] | CandidValue[];
    const newHasHas = props.ui?.has !== undefined;
    const newHas = props.ui?.has ?? false;
    const newSubtype = props.initial.subtype;

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newHasResult = { ok: newHas };
    const newSubtypeResult = { ok: newSubtype };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(hasHas.value, newHasHas) &&
        same(has.value, newHas) &&
        same(subtype.value, newSubtype) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(hasResult, newHasResult) &&
        same(subtypeResult, newSubtypeResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value =
        (() => {
            if (props.ui?.has !== undefined) {
                return props.ui?.has ? [getInitialCandidTypeValue(newSubtype, [], [])] : [];
            }
            return undefined;
        })() ??
        readRuntime<CandidValue[]>(props.initial)?.ok ??
        props.ui?.default ??
        [];

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    hasHas.value = newHasHas;
    has.value = newHas;
    subtype.value = newSubtype;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    hasResult = newHasResult;
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

const onHasHasOptionChanged = () => {
    hasHas.value = !hasHas.value;

    changed();
};
const onHasChanged = (r: DataResult<boolean>) => {
    hasResult = r;

    if (r.ok !== undefined) {
        has.value = r.ok;
        current.value = r.ok ? [getInitialCandidTypeValue(subtype.value, [], [])] : []; // Need to set the value directly
    }

    changed();
};

const onSubtypeChanged = (r: DataResult<CandidType>) => {
    subtypeResult = r;

    if (r.ok !== undefined) subtype.value = r.ok;

    changed();
};

const produce = (): DataResult<OptCandidType> => {
    if (!initialed) return { err: { message: `${props.status} opt input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (defaultValueResult.err !== undefined) return { err: defaultValueResult.err };
    if (hasResult.err !== undefined) return { err: hasResult.err };
    if (subtypeResult.err !== undefined) return { err: subtypeResult.err };

    const ok: OptCandidType = props.initial;

    ok.subtype = subtypeResult.ok;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    // checkAndAssignValue(ok, 'has', hasResult.ok, hasHas.value);

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<OptCandidType>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-opt-input-content">
        <div class="opt-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="opt-content">
                    <template v-if="!hasHas || has !== false">
                        <OptInputVue
                            :layer="1"
                            :recItems="[]"
                            :showNull="false"
                            :subtype="subtype"
                            :has="hasHas ? has : undefined"
                            :initial="current"
                            @changed="onCurrentChanged"
                        />
                    </template>
                    <template v-else>
                        <div class="empty-opt">None</div>
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
                        v-if="!hasHas || has !== false"
                        :label="'Defaults'"
                        :need="false"
                        :initial="hasDefaultValue"
                        @changed="onHasDefaultValueOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasDefaultValue">
                                <OptInputVue
                                    :layer="1"
                                    :recItems="[]"
                                    :showNull="false"
                                    :subtype="subtype"
                                    :has="hasHas ? has : undefined"
                                    :initial="defaultValue"
                                    @changed="onDefaultValueChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>

                    <RunningWrappedOptionValueVue
                        :label="'Whether it is valuable'"
                        :need="false"
                        :initial="hasHas"
                        @changed="onHasHasOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasHas">
                                <BoolInputVue
                                    :trueText="'Valued'"
                                    :falseText="'None'"
                                    :initial="has"
                                    @changed="onHasChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                </div>
            </div>
        </div>
        <div class="opt-sub" v-if="props.status === 'using' && (!hasHas || has !== false)">
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
.running-opt-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .opt-main {
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
            > .opt-content {
                height: auto;
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                > span {
                    margin-left: 5px;
                }
                > .empty-opt {
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
    > .opt-sub {
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        > span {
            width: 70px;
            height: 28px;
            display: flex;
            align-items: center;
            flex-shrink: 0;
        }
    }
}
</style>
