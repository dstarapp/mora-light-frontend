<script lang="ts" setup>
import { onBeforeMount, ref, watch, computed } from 'vue';
import { DataResult, checkAndExecute, same } from '@mora-light/core/types/common';
import { isPrincipal } from '@mora-light/core/types/candid';

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

const checked = computed(() => isPrincipal(value.value));

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

const onChanged = () => (value.value = value.value.trim()); // There is no space for the first and tail

const produce = (): DataResult<string> => {
    if (!initialed) return { err: { message: `principal input has not been initial.` } };

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
    <div class="principal-input-content">
        <input
            type="text"
            :disabled="props.disabled"
            :placeholder="props.placeholder ? props.placeholder : props.error"
            v-model="value"
            @input="onChanged"
            ref="inputRef"
        />
        <div class="tip" v-if="!checked">
            <p>
                {{
                    props.error
                        ? props.error
                        : 'Please enter the requirements of the required requirements'
                }}
            </p>
        </div>
    </div>
</template>

<style lang="less" scoped>
.principal-input-content {
    width: 100%;
    height: 100%;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    align-items: space-between;
    padding-bottom: 12px;
    position: relative;

    > input {
        display: flex;
        width: 100%;
        padding: 0 10px;
        height: 44px;
        line-height: 44px;
        border-radius: 8px;
        transition: 0.3s;
        border: 1px solid #dcdfe6;
        font-size: 14px;

        &:focus {
            border-color: #34d399;
            transition: 0.3s;
        }
    }

    ::placeholder {
        color: #999;
    }

    .tip {
        display: flex;
        flex: 1;
        margin-top: 5px;
        width: 100%;
        position: absolute;
        right: 0;
        bottom: -3px;

        p {
            width: 100%;
            text-align: right;
            height: 12px;
            font-size: 12px;
            color: #e95f5f;
            line-height: 12px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }
    }
}
</style>
