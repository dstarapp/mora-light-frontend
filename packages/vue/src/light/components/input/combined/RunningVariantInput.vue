<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    CandidType,
    CandidTypeSubitem,
    CandidValueObject,
    getInitialCandidTypeValue,
    isSameCandidType,
    VariantCandidType,
} from '@mora-light/core/types/candid';
import { ComponentStatus } from '@mora-light/core/types/running';
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
import VariantInputVue from '../../constant/combined/VariantInput.vue';
import RunningInputCandidTypeVue from '../RunningInputCandidType.vue';

const calcDefaultValue = (
    select: string | undefined,
    subitems: CandidTypeSubitem[],
): CandidValueObject => {
    let r = {};
    if (select) {
        r[select] = null;
    } else {
        for (let i = 0; i < subitems.length; i++) {
            r[subitems[i].key] = getInitialCandidTypeValue(subitems[i].type, [], []);
            break;
        }
    }
    return r;
};

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
        type: Object as PropType<VariantCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const current = ref<CandidValueObject>(
    readRuntime<CandidValueObject>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as CandidValueObject),
);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<CandidValueObject>(
    getInitialCandidTypeValue(props.initial, [], []) as CandidValueObject,
);
const hasSelect = ref(props.ui?.select !== undefined);
const select = ref<CandidValueObject>(calcDefaultValue(props.ui?.select, props.initial.subitems));
const subitems = ref<CandidTypeSubitem[]>(props.initial.subitems);

let currentResult: DataResult<CandidValueObject> = { ok: current.value };
let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<CandidValueObject> = { ok: defaultValue.value };
let selectResult: DataResult<CandidValueObject> = { ok: select.value };
let subitemsResults: DataResult<CandidType>[] = parseDataResultArray(
    subitems.value.map((subitem) => subitem.type),
);

const parsedSelect = computed(() => {
    const keys = Object.keys(select.value);
    return keys.length ? keys[0] : '';
});

const valueType = computed(() => {
    return {
        type: props.initial.type,
        subitems: props.initial.subitems.map((subitem) => {
            return {
                key: subitem.key,
                type: { type: 'null' },
            } as CandidTypeSubitem;
        }),
    };
});

const showSubtype = computed(() => {
    const subitem = subitems.value.find(
        (subitem) => !isSameCandidType(subitem.type, { type: 'null' }),
    );
    if (subitem === undefined) return false; // If the subtype is all null, then no need to enter subtype
    return true;
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
    const newDefaultValue = getInitialCandidTypeValue(props.initial, [], []) as CandidValueObject;
    const newSubitems = props.initial.subitems;
    const newHasSelect = props.ui?.select !== undefined;
    const newSelect = calcDefaultValue(props.ui?.select, props.initial.subitems);

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };
    const newSelectResult = { ok: newSelect };
    const newSubitemsResults = parseDataResultArray(newSubitems.map((subitem) => subitem.type));

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(hasSelect.value, newHasSelect) &&
        same(select.value, newSelect) &&
        same(subitems.value, newSubitems) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult) &&
        same(selectResult, newSelectResult) &&
        same(subitemsResults, newSubitemsResults)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    current.value =
        (() => {
            if (props.ui?.select) {
                for (let i = 0; i < props.initial.subitems.length; i++) {
                    const subitem = props.initial.subitems[i];
                    if (subitem.key === props.ui?.select) {
                        const r = {};
                        r[subitem.key] = getInitialCandidTypeValue(subitem.type, [], []);
                        return r;
                    }
                }
            }
            return undefined;
        })() ??
        readRuntime<CandidValueObject>(props.initial)?.ok ??
        (getInitialCandidTypeValue(props.initial, [], []) as CandidValueObject);

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;
    hasSelect.value = newHasSelect;
    select.value = newSelect;

    subitems.value = newSubitems;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;
    selectResult = newSelectResult;
    subitemsResults = newSubitemsResults;

    initialed = true;

    changed();
};

const onCurrentChanged = (r: DataResult<CandidValueObject>) => {
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
const onDefaultValueChanged = (r: DataResult<CandidValueObject>) => {
    defaultValueResult = r;

    if (r.ok !== undefined) defaultValue.value = r.ok;

    changed();
};

const onHasSelectOptionChanged = () => {
    hasSelect.value = !hasSelect.value;

    changed();
};
const onSelectChanged = (r: DataResult<CandidValueObject>) => {
    selectResult = r;

    if (r.ok !== undefined) {
        select.value = r.ok;

        // Need to set the value directly
        for (let i = 0; i < props.initial.subitems.length; i++) {
            const item = props.initial.subitems[i];
            if (r.ok[item.key] !== undefined) {
                current.value = {};
                current.value[item.key] = getInitialCandidTypeValue(item.type, [], []);
                break;
            }
        }
    }

    changed();
};

const onItemsChanged = (i: number, r: DataResult<CandidType>) => {
    subitemsResults[i] = r;

    if (r.ok !== undefined) subitems.value[i].type = r.ok;

    changed();
};

const produce = (): DataResult<VariantCandidType> => {
    if (!initialed)
        return { err: { message: `${props.status} variant input has not been initial.` } };

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

    const ok: VariantCandidType = props.initial;

    ok.subitems = newSubitems;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    checkAndAssignValue(
        ok,
        'select',
        parsedSelect.value ? parsedSelect.value : undefined,
        hasSelect.value,
    );

    checkAndAssignValue(ok, 'runtime', { ok: current.value }, currentResult.ok !== undefined);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<VariantCandidType>];
}>();

const changed = () =>
    checkAndExecute(
        subitemsResults.length >= subitems.value.length,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="running-variant-input-content">
        <div class="variant-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="variant-content">
                    <template v-if="subitems.length">
                        <VariantInputVue
                            :layer="1"
                            :showNull="false"
                            :recItems="[]"
                            :subitems="subitems"
                            :select="hasSelect ? parsedSelect : undefined"
                            :initial="current"
                            @changed="onCurrentChanged"
                        />
                    </template>
                    <template v-else>
                        <div class="empty-variant">{}</div>
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
                                <VariantInputVue
                                    :layer="1"
                                    :showNull="false"
                                    :recItems="[]"
                                    :subitems="subitems"
                                    :select="hasSelect ? parsedSelect : undefined"
                                    :initial="defaultValue"
                                    @changed="onDefaultValueChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                    <RunningWrappedOptionValueVue
                        class="select-value"
                        :label="'Whether to specify'"
                        :need="false"
                        :initial="hasSelect"
                        @changed="onHasSelectOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasSelect">
                                <VariantInputVue
                                    :layer="1"
                                    :showNull="false"
                                    :recItems="[]"
                                    :subitems="valueType.subitems"
                                    :select="undefined"
                                    :initial="select"
                                    @changed="onSelectChanged"
                                />
                            </div>
                        </template>
                    </RunningWrappedOptionValueVue>
                </div>
            </div>
        </div>
        <div class="variant-sub" v-if="showSubtype && props.status === 'using'">
            <span class="tip"> Subtype </span>
            <div class="items">
                <div class="item" v-for="(subitem, i) in subitems" :key="subitem.key">
                    <template v-if="!hasSelect || !parsedSelect || subitem.key === parsedSelect">
                        <input type="text" disabled v-model="subitem.key" />
                        <RunningInputCandidTypeVue
                            :layer="props.layer + 1"
                            :status="props.status"
                            :mustValidateCurrent="props.mustValidateCurrent"
                            :hasLabel="false"
                            :initial="subitem.type"
                            @changed="(r) => onItemsChanged(i, r)"
                        />
                    </template>
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-variant-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .variant-main {
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
            > .variant-content {
                height: auto;
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
                > span {
                    margin-left: 5px;
                }
                > .empty-variant {
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
    > .variant-sub {
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
                > input {
                    margin-right: 10px;
                    width: 120px;
                    height: 28px;
                    border: 1px solid #77777755;
                    padding-left: 5px;
                }
            }
        }
    }
}
</style>
