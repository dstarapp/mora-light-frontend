<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    CandidType,
    CandidTypeSubitem,
    CandidValue,
    getInitialCandidTypeValue,
    TupleCandidType,
} from '@mora-light/core/types/candid';
import {
    checkAndAssignValue,
    checkAndExecute,
    DataResult,
    readRuntime,
    same,
    parseDataResultArray,
} from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningWrappedTextInputVue from '../../common/RunningWrappedTextInput.vue';
import RunningWrappedOptionValueVue from '../../common/RunningWrappedOptionValue.vue';
import TupleInputVue from '../../constant/combined/TupleInput.vue';
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
        type: Object as PropType<TupleCandidType>,
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
const subitems = ref<CandidTypeSubitem[]>(props.initial.subitems);

let currentResult: DataResult<CandidValue[]> = { ok: current.value };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<CandidValue[]> = { ok: defaultValue.value };
let subitemsResults: DataResult<CandidType>[] = parseDataResultArray(
    subitems.value.map((subitem) => subitem.type),
);

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
    const newSubitems = props.initial.subitems;

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newSubitemsResults = parseDataResultArray(newSubitems.map((subitem) => subitem.type));

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(subitems.value, newSubitems) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(subitemsResults, newSubitemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value =
        readRuntime<CandidValue[]>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as CandidValue[]);

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;

    subitems.value = newSubitems;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    subitemsResults = newSubitemsResults;

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
const onDefaultValueChanged = (r: DataResult<CandidValue[]>) => {
    defaultValueResult = r;

    if (r.ok !== undefined) defaultValue.value = r.ok;

    changed();
};

const onItemsChanged = (i: number, r: DataResult<CandidType>) => {
    subitemsResults[i] = r;

    if (r.ok !== undefined) subitems.value[i].type = r.ok;

    changed();
};

const produce = (): DataResult<TupleCandidType> => {
    if (!initialed)
        return { err: { message: `${props.status} tuple input has not been initial.` } };

    if (props.mustValidateCurrent && currentResult.err !== undefined)
        return { err: currentResult.err };
    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (defaultValueResult.err !== undefined) return { err: defaultValueResult.err };
    for (let i = 0; i < subitemsResults.length; i++) {
        const err = subitemsResults[i].err;
        if (err) return { err };
    }

    const newSubitems: CandidTypeSubitem[] = [];
    for (let i = 0; i < subitems.value.length; i++) {
        newSubitems[i] = { key: subitems.value[i].key, type: subitemsResults[i].ok! };
    }

    const ok: TupleCandidType = props.initial;

    ok.subitems = newSubitems;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<TupleCandidType>];
}>();

const changed = () =>
    checkAndExecute(
        subitemsResults.length >= subitems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-tuple-input-content">
        <div class="tuple-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="tuple-content">
                    <template v-if="subitems.length">
                        <TupleInputVue
                            :layer="1"
                            :recItems="[]"
                            :subitems="subitems"
                            :initial="current"
                            @changed="onCurrentChanged"
                        />
                    </template>
                    <template v-else>
                        <div class="empty-tuple">[]</div>
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
                                <TupleInputVue
                                    :layer="1"
                                    :recItems="[]"
                                    :subitems="subitems"
                                    :initial="defaultValue"
                                    @changed="onDefaultValueChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                </div>
            </div>
        </div>
        <div class="tuple-sub" v-if="props.status === 'using'">
            <span class="tip"> Subtype </span>
            <div class="items">
                <div class="item" v-for="(subitem, i) in subitems" :key="subitem.key">
                    <span>{{ `${i}` }}</span>
                    <span class="colon">:</span>
                    <RunningInputCandidTypeVue
                        :layer="props.layer + 1"
                        :status="props.status"
                        :mustValidateCurrent="props.mustValidateCurrent"
                        :hasLabel="false"
                        :initial="subitem.type"
                        @changed="(r) => onItemsChanged(i, r)"
                    />
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-tuple-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .tuple-main {
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
            > .tuple-content {
                height: auto;
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                > span {
                    margin-left: 5px;
                }
                > .empty-tuple {
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
    > .tuple-sub {
        margin-top: 5px;
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
        > .items {
            width: 100%;
            > .item {
                margin-top: 5px;
                &:first-child {
                    margin-top: 0px;
                }
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: flex-start;
                > span {
                    width: 20px;
                    height: 28px;
                    flex-shrink: 0;
                    display: flex;
                    flex-direction: row;
                    justify-content: center;
                    align-items: flex-start;
                    padding-top: 1px;
                    font-size: 12px;
                }
                > .colon {
                    width: 15px;
                    flex-shrink: 0;
                    justify-content: flex-start;
                }
            }
        }
    }
}
</style>
