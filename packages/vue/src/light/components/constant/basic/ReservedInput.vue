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

const produce = (): DataResult<null> => {
    if (!initialed) return { err: { message: `reserved input has not been initial.` } };

    return { ok: null };
};

const emit = defineEmits<{
    changed: [DataResult<null>];
}>();

const changed = () => checkAndExecute(!!inputRef.value, () => emit('changed', produce()), changed);
</script>

<template>
    <div class="reserved-input-content">
        <span ref="inputRef">
            {{ `null` }}
        </span>
    </div>
</template>

<style lang="less" scoped>
.reserved-input-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    > span {
        width: 100%;
        height: 28px;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
    }
}
</style>
