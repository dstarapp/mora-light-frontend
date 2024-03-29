<script lang="ts" setup>
const props = defineProps({
    label: {
        type: String,
        required: true,
    },
    need: {
        type: Boolean,
        required: true,
    },
    initial: {
        type: Boolean,
        required: true,
    },
});

const emit = defineEmits<{
    changed: [];
}>();

const onChanged = () => emit('changed');
</script>

<template>
    <div class="running-wrapped-option-value-content">
        <div class="left">
            <span class="label">{{ props.label }}</span>
            <input
                type="checkbox"
                v-if="!props.need"
                :disabled="props.need"
                :checked="props.need || props.initial"
                @change="onChanged"
            />
        </div>
        <slot name="default" class="default"></slot>
    </div>
</template>

<style lang="less" scoped>
.running-wrapped-option-value-content {
    width: 100%;
    display: flex;
    flex-direction: column;
    justify-content: flex-start;
    align-items: flex-start;
    > .left {
        width: 100%;
        height: 28px;
        flex-shrink: 0;
        display: flex;
        flex-direction: row;
        justify-content: flex-start;
        align-items: center;
        padding-right: 10px;
        > .label {
            flex-shrink: 0;
            text-align: right;
            padding-right: 5px;
        }
    }
}
</style>
