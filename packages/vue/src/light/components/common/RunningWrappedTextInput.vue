<script lang="ts" setup>
import { DataResult } from '@mora-light/core/types/common';
import TextInputVue from '../constant/basic/TextInput.vue';

const props = defineProps({
    label: {
        type: String,
        required: true,
    },
    validator: {
        type: [String, Function],
        required: true,
    },
    placeholder: {
        type: String,
        required: true,
    },
    trim: {
        type: Boolean,
        required: true,
    },
    maxLength: {
        type: Number,
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
});

let result: DataResult<string> = { ok: props.initial };

const onChanged = (r: DataResult<string>) => {
    result = r;

    changed();
};

const produce = (): DataResult<string> => result;

const emit = defineEmits<{
    changed: [DataResult<string>];
}>();

const changed = () => emit('changed', produce());
</script>

<template>
    <div class="running-wrapped-text-input-content">
        <div class="label" v-if="label">{{ label }}</div>
        <TextInputVue
            :placeholder="placeholder"
            :trim="trim"
            :validator="validator"
            :maxLength="maxLength"
            :error="error"
            :initial="initial"
            @changed="onChanged"
        />
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-text-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    > .label {
        width: 100%;
        height: 28px;
        flex-shrink: 0;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        text-align: right;
        padding-right: 10px;
    }
}
</style>
