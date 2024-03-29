<script lang="ts" setup>
import { onBeforeMount, ref, watch, computed, PropType } from 'vue';
import { DataResult, checkAndExecute, same } from '@mora-light/core/types/common';
import { CandidFuncValue, isCanisterId } from '@mora-light/core/types/candid';

const props = defineProps({
    initial: {
        type: Object as PropType<CandidFuncValue>,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const serviceInputRef = ref<HTMLElement>(); // In case of errors, inform the element, you may need to be an animation
const methodInputRef = ref<HTMLElement>(); // In case of errors, inform the element, you may need to be an animation

const service = ref<string>(props.initial.service);
const method = ref<string>(props.initial.method);

const checkedService = computed(() => isCanisterId(service.value));
const checkedMethod = computed(() => !!method.value.trim());

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
    const newService = props.initial.service;
    const newMethod = props.initial.method;

    if (initialed && service.value === newService && method.value === newMethod) return; // If the input results are the same as the value of this component, no need to trigger

    service.value = newService; // Each external change is set up a new value
    method.value = newMethod; // Each external change is set up a new value

    initialed = true;

    changed();
};

watch(
    () => service.value,
    () => changed(), // Internal changes should be triggered upward // External settings will also be triggered
);
watch(
    () => method.value,
    () => changed(), // Internal changes should be triggered upward // External settings will also be triggered
);

const onServiceChanged = () => (service.value = service.value.trim()); // There is no space for the first and tail
// const onMethodChanged = () => (method.value = method.value.trim()); // There is no space for the first and tail

const produce = (): DataResult<CandidFuncValue> => {
    if (!initialed) return { err: { message: `func input has not been initial.` } };

    if (!checkedService.value) {
        return { err: { message: `func service is not valid`, el: serviceInputRef.value } };
    }

    if (!checkedMethod.value) {
        return { err: { message: `func method is not valid`, el: methodInputRef.value } };
    }

    return {
        ok: {
            service: service.value,
            method: method.value.trim(),
        },
    };
};

const emit = defineEmits<{
    changed: [DataResult<CandidFuncValue>];
}>();

const changed = () =>
    checkAndExecute(
        !!serviceInputRef.value && !!methodInputRef.value,
        () => emit('changed', produce()),
        changed,
    );
</script>

<template>
    <div class="func-input-content">
        <div class="service">
            <span> Service </span>
            <div class="input">
                <input
                    type="text"
                    :disabled="props.disabled"
                    :placeholder="'Please enter the canister ID of service'"
                    v-model="service"
                    @input="onServiceChanged"
                    ref="serviceInputRef"
                />
                <span v-if="!checkedService">
                    {{ 'Please enter the canister ID of service' }}
                </span>
            </div>
        </div>
        <div class="method">
            <span> Method </span>
            <div class="input">
                <input
                    type="text"
                    :placeholder="'Please enter Method'"
                    v-model="method"
                    ref="methodInputRef"
                />
                <span v-if="!checkedMethod">
                    {{ 'Please enter Method' }}
                </span>
            </div>
        </div>
    </div>
</template>

<style lang="less" scoped>
.func-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    > div {
        margin-top: 5px;
        &:first-child {
            margin-top: 0px;
        }
        width: 100%;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: flex-start;
        > span {
            width: 80px;
            height: 28px;
            display: flex;
            flex-direction: row;
            justify-content: flex-start;
            align-items: center;
        }
        > div {
            width: 100%;
            > input {
                width: 100%;
                height: 28px;
                border: 1px solid #55555555;
                padding: 5px;
            }
            > span {
                margin-top: 5px;
                margin-left: 5px;
                width: 100%;
                font-size: 12px;
                color: #880000;
            }
        }
    }
}
</style>
