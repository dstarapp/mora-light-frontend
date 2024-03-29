<script lang="ts" setup>
import { onBeforeMount, ref } from 'vue';
import { DataResult, checkAndExecute } from '@mora-light/core/types/common';

const inputRef = ref<HTMLElement>();

let initialed = false;
onBeforeMount(() => init());
const init = () => {
    initialed = true;

    changed();
};

const produce = (): DataResult<string> => {
    if (!initialed) return { err: { message: `unknown input has not been initial.` } };

    return { err: { message: `unknown type has no value`, el: inputRef.value } };
};

const emit = defineEmits<{
    changed: [DataResult<string>];
}>();

const changed = () => checkAndExecute(!!inputRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div class="unknown-input-content">
        <span ref="inputRef">
            {{ `The UNKNOWN type is not worth it` }}
        </span>
    </div>
</template>

<style lang="less" scoped>
.unknown-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    > span {
        width: 100%;
        height: 28px;
        display: flex;
        align-items: center;
        font-size: 12px;
        color: #880000;
    }
}
</style>
