<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import { ComponentStatus, ValueItem } from '@mora-light/core/types/running';
import { CandidType } from '@mora-light/core/types/candid';
import {
    checkAndAssignValue,
    checkAndExecute,
    DataResult,
    ExportedOuter,
    same,
} from '@mora-light/core/types/common';

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    outerValues: {
        type: Array as PropType<ValueItem[]>,
        required: true,
    },
    type: {
        type: Object as PropType<CandidType>,
        required: true,
    },
    initial: {
        type: Object as PropType<ExportedOuter>,
        required: true,
    },
});

const outerNameRef = ref<HTMLElement>();

let checkedOuterValues: ValueItem[] = [...props.outerValues];
let checkedType: CandidType = props.type;
let checkedExportedOuter: ExportedOuter = props.initial;

const outerName = ref(props.initial?.name ?? '');

const validateOuterName = computed<boolean>(
    () =>
        !props.outerValues
            .map((value) => value.name)
            .includes(
                outerName.value.trim(), // trimmed
            ),
);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.outerValues, props.type, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedOuterValues = [...props.outerValues];
    const newCheckedType = props.type;
    const newCheckedExportedOuter = props.initial;

    const newOuterName = props.initial?.name ?? '';

    if (
        initialed &&
        same(checkedOuterValues, newCheckedOuterValues) &&
        same(checkedType, newCheckedType) &&
        same(checkedExportedOuter, newCheckedExportedOuter) &&
        same(outerName.value, newOuterName)
    ) {
        return;
    }

    checkedOuterValues = newCheckedOuterValues;
    checkedType = newCheckedType;
    checkedExportedOuter = newCheckedExportedOuter;

    outerName.value = newOuterName;

    initialed = true;

    changed();
};

const onOuterNameChanged = () => {
    const value = outerName.value.trim();

    if (value === '') outerName.value = value; // trimmed

    changed();
};

const produce = (): DataResult<ExportedOuter> => {
    if (!initialed)
        return { err: { message: `${props.status} export candid type has not been initial.` } };

    if (!validateOuterName.value) {
        return {
            err: {
                message: 'outer variable name is not valid.',
                el: outerNameRef.value,
            },
        };
    }

    const ok: ExportedOuter = props.initial;

    const name = outerName.value.trim();
    checkAndAssignValue(ok, 'name', name, !!name);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<ExportedOuter>];
}>();

const changed = () =>
    checkAndExecute(!!outerNameRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div class="running-exported-candid-type-content">
        <div class="tip">
            <div class="type">
                <span>Export Candid Type</span>
                <!-- How to provide a component to choose candid type-->
                <!-- <ChooseCandidTypeVue :disabled="true" :initial="type" /> -->
            </div>
        </div>
        <div class="right">
            <div class="blank"></div>
            <div class="input">
                <span>{{ props.initial.tip }}</span>
                <input
                    class="outer-name-input"
                    v-model="outerName"
                    placeholder="Export Name"
                    maxlength="32"
                    @input="onOuterNameChanged"
                    ref="outerNameRef"
                />
                <span class="outer-name-error" v-if="!validateOuterName">
                    {{ 'Export name is repeated.' }}
                </span>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.running-exported-candid-type-content {
    width: 100%;
    display: flex;
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-start;
    > .tip {
        width: 100%;
        > .type {
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
    > .right {
        display: flex;
        flex-direction: row;
        justify-content: center;
        align-items: center;
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
            > span {
                height: 28px;
                display: flex;
                justify-content: flex-start;
                align-items: center;
            }
            > .outer-name-input {
                margin-top: 5px;
                width: 100%;
                height: 28px;
                border: 1px solid #77777755;
                padding: 0 5px;
            }
            > .outer-name-error {
                margin-top: 5px;
                flex-shrink: 0;
                font-size: 14px;
                color: #880000;
            }
        }
    }
}
</style>
