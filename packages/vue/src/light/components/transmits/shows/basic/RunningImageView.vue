<script lang="ts" setup>
import { PropType, computed, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    ImageUI,
    ImageViewConstraint,
    ImageViewSupportedType,
} from '@mora-light/core/types/transmit';
import { StringResult } from '@mora-light/core/types/common';
import { ElImage, ElIcon } from 'element-plus';
import { Picture as IconPicture } from '@element-plus/icons-vue';

type SupportedCandidValue = string | number[];

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    from: {
        type: Object as PropType<ImageViewSupportedType>,
        required: true, // The running result type of the light also needs to be used
    },
    constraint: {
        type: Object as PropType<ImageViewConstraint>,
        required: true,
    },
    runtime: {
        type: Object as PropType<StringResult<SupportedCandidValue>>,
        required: false,
    },
    callingRefresh: {
        type: Number,
        required: true,
    },
});

const error = ref<string | undefined>(props.runtime?.err);
const runtime = ref<SupportedCandidValue | undefined>(props.runtime?.ok);

const parseValue = (value: SupportedCandidValue | undefined): string => {
    if (value === undefined) return '';
    if (typeof value === 'string') return value;
    const array = new Uint8Array(value);
    const buffer = Buffer.from(array);
    return `data:image/png;base64,` + buffer.toString('base64');
};

const value = ref<string>(parseValue(runtime.value));

watch(
    () => [props.status, props.from, props.constraint, props.runtime, props.callingRefresh],
    () => {
        error.value = props.runtime?.err;
        runtime.value = props.runtime?.ok;
    },
);

const ui = computed<ImageUI | undefined>(() => props.constraint.ui);

const customLabel = computed<string>(() => ui.value?.customLabel ?? '');

const width = computed<string>(() => ui.value?.width ?? '200px');

const customShape = computed<string>(() => ui.value?.customShape ?? 'square');

const borderRadius = computed<string | number>(() =>
    ui.value?.customShape === 'round' ? '50%' : '10px',
);

const height = computed<string>(() =>
    ui.value?.customShape === 'round' || borderRadius.value !== 0 ? width.value : '133px',
);
</script>

<template>
    <div class="running-image-view-content">
        <div class="error" v-if="error !== undefined">
            <i class="iconfont icon-plugin-error"></i>
            <p>{{ error }}</p>
        </div>
        <template v-else>
            <!-- <div class="label" v-if="customLabel">
                {{ customLabel }}
            </div> -->
            <div class="image-content">
                <el-image
                    class="image"
                    :style="`width: ${width}; height: ${
                        customShape === 'square' ? 'auto' : width
                    }; border-radius: ${borderRadius};`"
                    :src="parseValue(runtime)"
                    :preview-src-list="[parseValue(runtime)]"
                    :initial-index="0"
                    fit="cover"
                    :preview-teleported="true"
                >
                    <template #error>
                        <div class="image-slot-error">
                            <el-icon><icon-picture /></el-icon>
                        </div>
                    </template>
                </el-image>
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-image-view-content {
    @apply relative flex flex-col w-full;
    .error {
        @apply flex flex-col mt-25;

        i {
            @apply text-6xl text-gray-300 dark:(text-light-900/30);
        }

        p {
            @apply mt-3 text-sm text-gray-400 dark:(text-light-900/40);
        }
    }
    > .image-content {
        @apply w-full flex justify-center mt-5;
        font-size: 0;

        .image-slot-error {
            @apply flex justify-center items-center w-full h-full text-3xl;
            background: var(--el-fill-color-light);
            color: var(--el-text-color-secondary);

            .image-slot .el-icon {
                @apply text-3xl;
            }
        }
    }
}
</style>
