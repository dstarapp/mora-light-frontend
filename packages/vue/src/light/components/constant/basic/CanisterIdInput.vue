<script lang="ts" setup>
import { onBeforeMount, ref, watch, computed } from 'vue';
import { DataResult, checkAndExecute, same } from '@mora-light/core/types/common';
import { isCanisterId } from '@mora-light/core/types/candid';

const props = defineProps({
    placeholder: {
        type: String,
        required: true,
    },
    error: {
        type: String,
        required: true,
    },
    initial: {
        type: String,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const inputRef = ref<HTMLElement>(); // In case of errors, inform the element, you may need to be an animation

const value = ref<string>(props.initial);

const checked = computed(() => isCanisterId(value.value));

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
    const newValue = props.initial;

    if (initialed && value.value === newValue) return; // If the input results are the same as the value of this component, no need to trigger

    value.value = newValue; // Each external change is set up a new value

    initialed = true;

    changed();
};

watch(
    () => value.value,
    () => changed(), // Internal changes should be triggered upward // External settings will also be triggered
);

const onChanged = () => (value.value = value.value.trim()); // There is no space for the first and tails no space for the first and tail

const produce = (): DataResult<string> => {
    if (!initialed) return { err: { message: `canister id input has not been initial.` } };

    if (!checked.value) {
        return { err: { message: `value is not valid`, el: inputRef.value } };
    }

    return { ok: value.value };
};

const emit = defineEmits<{
    changed: [DataResult<string>];
}>();

const changed = () => checkAndExecute(!!inputRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div class="canister-id-input-content">
        <input
            type="text"
            :disabled="props.disabled"
            :placeholder="props.placeholder ? props.placeholder : props.error"
            v-model="value"
            @input="onChanged"
            ref="inputRef"
        />
        <span v-if="!checked">
            {{ props.error ? props.error : 'Please enter the correct canister id' }}
        </span>
    </div>
</template>

<style lang="less" scoped>
.canister-id-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
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
</style>
