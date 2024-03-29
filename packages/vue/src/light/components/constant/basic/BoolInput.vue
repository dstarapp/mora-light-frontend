<script lang="ts" setup>
import { onBeforeMount, ref, watch } from 'vue';
import { DataResult, same } from '@mora-light/core/types/common';

const props = defineProps({
    trueText: {
        type: String,
        default: 'true',
    },
    falseText: {
        type: String,
        default: 'false',
    },
    initial: {
        type: Boolean,
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const value = ref<boolean>(props.initial); // Internal value control

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
    const newValue = !!props.initial;

    if (initialed && value.value === newValue) return; // If the input results are the same as the value of this component, no need to trigger

    value.value = newValue; // Each external change is set up a new value

    initialed = true;

    changed();
};

watch(
    () => value.value,
    () => changed(), // Internal changes should be triggered upward // The external settings may also be triggered, mainly because the superior wants to call the product again
);

const onChanged = () => (value.value = !value.value);

const produce = (): DataResult<boolean> => {
    if (!initialed) return { err: { message: `bool input has not been initial.` } };

    return { ok: value.value };
};

const emit = defineEmits<{
    changed: [DataResult<boolean>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="bool-input-content">
        <input type="checkbox" :checked="value" :disabled="props.disabled" @change="onChanged" />
        <span>
            {{ value ? (trueText ? trueText : 'true') : falseText ? falseText : 'false' }}
        </span>
    </div>
</template>

<style lang="less" scoped>
.bool-input-content {
    width: 100%;
    height: 28px;
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
    align-items: center;

    > span {
        margin-left: 5px;
        font-size: 14px;
        color: #999;
    }
}
</style>
