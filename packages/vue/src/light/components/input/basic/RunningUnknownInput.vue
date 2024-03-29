<script lang="ts" setup>
import { onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { UnknownCandidType } from '@mora-light/core/types/candid';
import { checkAndAssignValue, DataResult, same } from '@mora-light/core/types/common';
import { InputUI } from '@mora-light/core/types/source';
import RunningWrappedTextInputVue from '../../common/RunningWrappedTextInput.vue';
// import RunningWrappedOptionValueVue from "../../common/RunningWrappedOptionValue.vue";

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
        type: Object as PropType<UnknownCandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<InputUI>,
        required: false,
    },
});

const current = ref<null>(null);

const label = ref(props.ui?.label ?? '');
const hasDefaultValue = ref<boolean>(props.ui?.default !== undefined);
const defaultValue = ref<null>(null);

let labelResult: DataResult<string> = { ok: label.value };
let defaultValueResult: DataResult<null> = { ok: defaultValue.value };

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
    const newDefaultValue = null;

    const newLabelResult = { ok: newLabel };
    const newDefaultValueResult = { ok: newDefaultValue };

    if (
        initialed &&
        same(label.value, newLabel) &&
        same(hasDefaultValue.value, newHasDefaultValue) &&
        same(defaultValue.value, newDefaultValue) &&
        same(labelResult, newLabelResult) &&
        same(defaultValueResult, newDefaultValueResult)
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    label.value = newLabel;
    hasDefaultValue.value = newHasDefaultValue;
    defaultValue.value = newDefaultValue;

    labelResult = newLabelResult;
    defaultValueResult = newDefaultValueResult;

    initialed = true;

    changed();
};

const onLabelChanged = (r: DataResult<string>) => {
    labelResult = r;

    if (r.ok !== undefined) label.value = r.ok;

    changed();
};

// const onHasDefaultValueOptionChanged = () => {
//     hasDefaultValue.value = !hasDefaultValue.value;

//     changed();
// };
// const onDefaultValueChanged = (r: DataResult<null>) => {
//     defaultValueResult = r;

//     if (r.ok !== undefined) defaultValue.value = r.ok;

//     changed();
// };

const produce = (): DataResult<UnknownCandidType> => {
    if (!initialed)
        return { err: { message: `${props.status} unknown input has not been initial.` } };

    if (labelResult.err !== undefined) return { err: labelResult.err };
    if (defaultValueResult.err !== undefined) return { err: defaultValueResult.err };

    const ok = props.initial;

    // checkAndAssignValue(ok, 'label', labelResult.ok ? labelResult.ok : undefined, props.hasLabel);
    // checkAndAssignValue(ok, 'default', defaultValueResult.ok, hasDefaultValue.value);

    checkAndAssignValue(ok, 'runtime', { ok: current.value });

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<UnknownCandidType>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-unknown-input-content">
        <div class="unknown-main">
            <div class="main-content">
                <div class="label" v-if="label">
                    {{ label }}
                </div>
                <div class="unknown-content">
                    <span> null </span>
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
                    <!-- <RunningWrappedOptionValueVue
                        :label="'Defaults'"
                        :need="false"
                        :initial="hasDefaultValue"
                        @changed="onHasDefaultValueOptionChanged"
                    >
                        <template #default>
                            <div class="default-component" v-show="hasDefaultValue"> null </div>
                        </template>
                    </RunningWrappedOptionValueVue> -->
                </div>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-unknown-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    > .unknown-main {
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
            > .unknown-content {
                height: 28px;
                display: flex;
                flex-direction: row;
                justify-content: flex-start;
                align-items: center;
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
