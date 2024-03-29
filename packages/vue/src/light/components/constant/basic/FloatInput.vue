<script lang="ts" setup>
import { onBeforeMount, ref, watch, computed } from 'vue';
import { DataResult, checkAndExecute, same } from '@mora-light/core/types/common';

const props = defineProps({
    regex: {
        type: String,
        required: true,
    },
    error: {
        type: String,
        required: true,
    },
    placeholder: {
        type: String,
        required: true,
    },
    decimal: {
        type: Number,
        required: true,
    },
    initial: {
        type: [Number, String], // Number or String
        required: true,
    },
    disabled: {
        type: Boolean,
        default: false,
    },
});

const inputRef = ref<HTMLElement>(); // In case of errors, inform the element, you may need to be an animation inform the element, you may need to be an animation

const value = ref<string>(`${props.initial}`); // Internal string

const parsed = computed<Number | undefined>(() => {
    if (!value.value.match(props.regex)) return undefined;

    const v = value.value;

    return parseFloat(v);
});

const checked = computed(() => {
    if (!value.value.match(props.regex)) return false;
    // The scope of the inspection below
    const v = parsed.value;
    if (v === undefined) return false;

    const vv = `${v}`;
    const index = vv.indexOf('.');
    if (index >= 0 && vv.split(/e|E/)[0].length - index - 1 > props.decimal) {
        return false;
    }
    return true;
});

const parsedError = computed(() => `${props.error}, Maximum accuracy: ${props.decimal}`);

let initialed = false;
onBeforeMount(() => init());
watch(
    () => [props.placeholder, props.regex, props.error, props.initial],
    (nv, ov) => {
        if (same(nv, ov)) return;
        init();
    },
);
const init = () => {
    const newValue = `${props.initial}`;

    if (initialed && value.value === newValue) return; // If the input results are the same as the value of this component, no need to trigger

    // console.error(
    //     "number input",
    //     props.initial,
    //     props.placeholder,
    //     props.regex,
    //     props.decimal,
    // );

    value.value = newValue; // External changes, set directly // ! There may be bugs in the form of floating-point number indexes here

    initialed = true;

    changed();
};

watch(
    () => value.value,
    () => changed(), // Internal changes should be triggered upward
);

const onChanged = () => {
    let v = value.value.trim(); // There is no space for the first and tail
    if (v !== value.value) value.value = v;
};

const produce = (): DataResult<Number | BigInt> => {
    if (!initialed) return { err: { message: `float input has not been initial.` } };

    const ok = parsed.value;
    if (!checked.value || ok === undefined) {
        return { err: { message: `value is not a valid number`, el: inputRef.value } };
    }

    return { ok };
};

const emit = defineEmits<{
    changed: [DataResult<Number | BigInt>];
}>();

const changed = () => checkAndExecute(!!inputRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div class="float-input-content">
        <input
            type="text"
            :disabled="props.disabled"
            :placeholder="props.placeholder ? props.placeholder : parsedError"
            v-model="value"
            @input="onChanged"
            ref="inputRef"
        />
        <div class="tip" v-if="!checked">
            <p>
                {{
                    parsedError
                        ? parsedError
                        : 'Please enter the number that meets the requirements'
                }}
            </p>
        </div>
    </div>
</template>

<style lang="less" scoped>
.float-input-content {
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
