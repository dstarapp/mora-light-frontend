<script lang="ts" setup>
import { computed, onBeforeMount, PropType, ref, watch } from 'vue';
import {
    NAT_REGEX,
    INT_REGEX,
    NAT8_MAX,
    NAT16_MAX,
    NAT32_MAX,
    NAT64_MAX,
    NAT_MIN,
    INT8_MAX,
    INT8_MIN,
    INT16_MAX,
    INT16_MIN,
    INT32_MAX,
    INT32_MIN,
    INT64_MAX,
    INT64_MIN,
    FLOAT32_REGEX,
    FLOAT64_REGEX,
    CandidType,
    CandidValue,
    CandidBigInt,
    CandidPrincipal,
    CandidFunc,
    CandidService,
    CandidFuncValue,
    RecItem,
    checkCandidTypeAndCandidValue,
    copyCandidType,
    getInitialCandidTypeValue,
    CandidValueObject,
} from '@mora-light/core/types/candid';
import BoolInputVue from './basic/BoolInput.vue';
import IntegerInputVue from './basic/IntegerInput.vue';
import FloatInputVue from './basic/FloatInput.vue';
import NullInputVue from './basic/NullInput.vue';
import TextInputVue from './basic/TextInput.vue';
import PrincipalInputVue from './basic/PrincipalInput.vue';
import VecInputVue from './combined/VecInput.vue';
import OptInputVue from './combined/OptInput.vue';
import RecordInputVue from './combined/RecordInput.vue';
import VariantInputVue from './combined/VariantInput.vue';
import TupleInputVue from './combined/TupleInput.vue';
import RecInputVue from './combined/RecInput.vue';
import UnknownInputVue from './basic/UnknownInput.vue';
import EmptyInputVue from './basic/EmptyInput.vue';
import ReservedInputVue from './basic/ReservedInput.vue';
import FuncInputVue from './basic/FuncInput.vue';
import ServiceInputVue from './basic/ServiceInput.vue';
import { checkAndExecute, DataResult, same } from '@mora-light/core/types/common';

const unwrapValue = (type: CandidType, v: CandidValue): CandidValue | BigInt | CandidFuncValue => {
    switch (type.type) {
        case 'nat':
        case 'int':
        case 'nat64':
        case 'int64':
            return BigInt((v as CandidBigInt).value);
        case 'principal':
            return (v as CandidPrincipal).value as string; // principal String
        case 'func':
            return (v as CandidFunc).value as CandidFuncValue; // This is an object Principal and Method properties
        case 'service':
            return (v as CandidService).value as string; // principal String
    }
    return v;
};

const wrapValue = (type: CandidType, v: CandidValue | BigInt | CandidFuncValue): CandidValue => {
    switch (type.type) {
        case 'nat':
        case 'int':
        case 'nat64':
        case 'int64':
            return { type: 'bigint', value: `${v}` } as CandidBigInt;
        case 'principal':
            return { type: 'principal', value: v as string } as CandidPrincipal;
        case 'func':
            return { type: 'func', value: v as CandidFuncValue } as CandidFunc;
        case 'service':
            return { type: 'service', value: v as string } as CandidService;
    }
    return v as CandidValue;
};

const parseDataResult = (
    type: CandidType,
    recItems: RecItem[],
    value: CandidValue,
    el?: HTMLElement,
): DataResult<CandidValue | BigInt> => {
    const r = checkCandidTypeAndCandidValue(type, value, recItems, el);
    if (r.err !== undefined) return { err: r.err };
    else return { ok: unwrapValue(type, value) };
};

const props = defineProps({
    layer: {
        type: Number,
        default: 1, // The top layer is displayed wrong, so it is necessary to record the level
    },
    recItems: {
        type: Array as PropType<RecItem[]>,
        default: [],
    },
    initial: {
        type: Object as PropType<{ type: CandidType; value: CandidValue }>,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const inputRef = ref<HTMLElement>();

let checkedRecItems: RecItem[] = props.recItems;

// The correct data is passed down down
const type = ref<CandidType>(copyCandidType(props.initial.type));
const value = ref<CandidValue>(props.initial.value as CandidValue);

// Receive data that is passed upward
let valueResult: DataResult<CandidValue | BigInt> = parseDataResult(
    type.value,
    props.recItems,
    value.value,
    inputRef.value,
);

const parsedValue = computed(() => {
    const v = (
        props.initial.value !== undefined
            ? props.initial.value
            : getInitialCandidTypeValue(type.value, props.recItems, [])
    ) as CandidValue;
    return unwrapValue(type.value, v);
});

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.recItems, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newCheckedRecItems = props.recItems;
    const newType = copyCandidType(props.initial.type);
    const newValue = (
        props.initial.value !== undefined
            ? props.initial.value
            : getInitialCandidTypeValue(type.value, props.recItems, [])
    ) as CandidValue;

    const newValueResult = parseDataResult(newType, newCheckedRecItems, newValue, inputRef.value);

    if (
        initialed &&
        same(checkedRecItems, newCheckedRecItems) &&
        same(type.value, newType) &&
        same(value.value, newValue) &&
        same(valueResult, newValueResult) // same not support BigInt
    ) {
        return; // If the upcoming value is the same as that of this component, it will not be triggered
    }

    checkedRecItems = newCheckedRecItems;

    type.value = newType;

    value.value = newValue;

    valueResult = newValueResult;

    initialed = true;

    changed();
};

const onValueChanged = (r: DataResult<CandidValue>) => {
    valueResult = r; // bigint and principal Unpacking

    if (r.ok !== undefined) value.value = wrapValue(type.value, r.ok);

    changed(); // Internal changes are triggered upward
};

const produce = (): DataResult<CandidValue> => {
    if (!initialed) return { err: { message: `constant input has not been initial.` } };

    if (valueResult.err !== undefined) return { err: valueResult.err };

    let ok: CandidValue = wrapValue(type.value, valueResult.ok);

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<CandidValue>];
}>();

const changed = () => checkAndExecute(!!inputRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div class="constant-input-content">
        <template v-if="type.type === 'bool'">
            <BoolInputVue
                :trueText="'True'"
                :falseText="'False'"
                :initial="(parsedValue as boolean)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'nat'">
            <IntegerInputVue
                :isBigInt="true"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="''"
                :minValue="'0'"
                :initial="(parsedValue as BigInt)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'int'">
            <IntegerInputVue
                :isBigInt="true"
                :regex="INT_REGEX"
                :error="'Please enter the integer'"
                :placeholder="''"
                :maxValue="''"
                :minValue="''"
                :initial="(parsedValue as BigInt)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'nat8'">
            <IntegerInputVue
                :isBigInt="false"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${NAT8_MAX}`"
                :minValue="`${NAT_MIN}`"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'nat16'">
            <IntegerInputVue
                :isBigInt="false"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${NAT16_MAX}`"
                :minValue="`${NAT_MIN}`"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'nat32'">
            <IntegerInputVue
                :isBigInt="false"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${NAT32_MAX}`"
                :minValue="`${NAT_MIN}`"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'nat64'">
            <IntegerInputVue
                :isBigInt="true"
                :regex="NAT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${NAT64_MAX}`"
                :minValue="`${NAT_MIN}`"
                :initial="(parsedValue as BigInt)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'int8'">
            <IntegerInputVue
                :isBigInt="false"
                :regex="INT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${INT8_MAX}`"
                :minValue="`${INT8_MIN}`"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'int16'">
            <IntegerInputVue
                :isBigInt="false"
                :regex="INT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${INT16_MAX}`"
                :minValue="`${INT16_MIN}`"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'int32'">
            <IntegerInputVue
                :isBigInt="false"
                :regex="INT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${INT32_MAX}`"
                :minValue="`${INT32_MIN}`"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'int64'">
            <IntegerInputVue
                :isBigInt="true"
                :regex="INT_REGEX"
                :error="'Please enter the non-negative integer'"
                :placeholder="''"
                :maxValue="`${INT64_MAX}`"
                :minValue="`${INT64_MIN}`"
                :initial="(parsedValue as BigInt)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'float32'">
            <FloatInputVue
                :regex="FLOAT32_REGEX"
                :error="'Please enter the single precision floating point number'"
                :placeholder="''"
                :decimal="6"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'float64'">
            <FloatInputVue
                :regex="FLOAT64_REGEX"
                :error="'Please enter the dual -precision floating point number'"
                :placeholder="''"
                :decimal="15"
                :initial="(parsedValue as number)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'null'">
            <NullInputVue @changed="onValueChanged" ref="inputRef" />
        </template>
        <template v-else-if="type.type === 'text'">
            <TextInputVue
                :validator="''"
                :placeholder="''"
                :trim="false"
                :maxLength="4096"
                :error="'Please enter the text'"
                :initial="(parsedValue as string)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'principal'">
            <PrincipalInputVue
                :placeholder="''"
                :error="'Please enter principal'"
                :initial="(parsedValue as string)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'blob'">
            <template v-if="true">
                <VecInputVue
                    :layer="props.layer"
                    :recItems="props.recItems"
                    :subtype="{ type: 'nat8' }"
                    :length="undefined"
                    :initial="(parsedValue as number[])"
                    :disabled="props.disabled"
                    @changed="onValueChanged"
                    ref="inputRef"
                />
            </template>
            <template v-else>
                <div class="empty-blob" ref="inputRef">[]</div>
            </template>
        </template>
        <template v-else-if="type.type === 'vec'">
            <template v-if="true">
                <VecInputVue
                    :layer="props.layer"
                    :recItems="props.recItems"
                    :subtype="type.subtype"
                    :length="undefined"
                    :initial="(parsedValue as CandidValue[])"
                    :disabled="props.disabled"
                    @changed="onValueChanged"
                    ref="inputRef"
                />
            </template>
            <template v-else>
                <div class="empty-vec" ref="inputRef">[]</div>
            </template>
        </template>
        <template v-else-if="type.type === 'opt'">
            <template v-if="true">
                <OptInputVue
                    :layer="props.layer"
                    :showNull="true"
                    :recItems="props.recItems"
                    :subtype="type.subtype"
                    :has="undefined"
                    :initial="(parsedValue as CandidValue[])"
                    :disabled="props.disabled"
                    @changed="onValueChanged"
                    ref="inputRef"
                />
            </template>
            <template v-else>
                <div class="empty-opt" ref="inputRef">[]</div>
            </template>
        </template>
        <template v-else-if="type.type === 'record'">
            <template v-if="type.subitems.length">
                <RecordInputVue
                    :layer="props.layer"
                    :recItems="props.recItems"
                    :subitems="type.subitems"
                    :initial="(parsedValue as CandidValueObject)"
                    :disabled="props.disabled"
                    @changed="onValueChanged"
                    ref="inputRef"
                />
            </template>
            <template v-else>
                <div class="empty-record" ref="inputRef">{}</div>
            </template>
        </template>
        <template v-else-if="type.type === 'variant'">
            <template v-if="type.subitems.length">
                <VariantInputVue
                    :layer="props.layer"
                    :showNull="true"
                    :recItems="props.recItems"
                    :subitems="type.subitems"
                    :select="undefined"
                    :initial="(parsedValue as CandidValueObject)"
                    :disabled="props.disabled"
                    @changed="onValueChanged"
                    ref="inputRef"
                />
            </template>
            <template v-else>
                <div class="empty-variant" ref="inputRef">{}</div>
            </template>
        </template>
        <template v-else-if="type.type === 'tuple'">
            <template v-if="type.subitems.length">
                <TupleInputVue
                    :layer="props.layer"
                    :recItems="props.recItems"
                    :subitems="type.subitems"
                    :initial="(parsedValue as CandidValue[])"
                    :disabled="props.disabled"
                    @changed="onValueChanged"
                    ref="inputRef"
                />
            </template>
            <template v-else>
                <div class="empty-tuple" ref="inputRef">[]</div>
            </template>
        </template>
        <template v-else-if="type.type === 'rec'">
            <RecInputVue
                :layer="props.layer"
                :recItems="
                    type.subtype !== undefined
                        ? [...props.recItems, { id: type.id, type: type }]
                        : props.recItems
                "
                :id="type.id"
                :subtype="type.subtype"
                :initial="value"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'unknown'">
            <UnknownInputVue @changed="onValueChanged" ref="inputRef" />
        </template>
        <template v-else-if="type.type === 'empty'">
            <EmptyInputVue @changed="onValueChanged" ref="inputRef" />
        </template>
        <template v-else-if="type.type === 'reserved'">
            <ReservedInputVue @changed="onValueChanged" ref="inputRef" />
        </template>
        <template v-else-if="type.type === 'func'">
            <FuncInputVue
                :initial="(parsedValue as CandidFuncValue)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else-if="type.type === 'service'">
            <ServiceInputVue
                :placeholder="''"
                :error="'Please enter the canister ID of service'"
                :initial="(parsedValue as string)"
                :disabled="props.disabled"
                @changed="onValueChanged"
                ref="inputRef"
            />
        </template>
        <template v-else>
            <div>
                {{ `type ${(type as any).type} is not support.` }}
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.constant-input-content {
    width: 100%;

    > .empty-blob,
    > .empty-vec,
    > .empty-opt,
    > .empty-record,
    > .empty-variant,
    > .empty-tuple {
        height: 28px;
        display: flex;
        justify-content: flex-start;
        align-items: center;
    }
}
</style>
