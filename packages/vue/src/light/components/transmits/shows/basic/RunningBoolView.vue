<script lang="ts" setup>
import { computed, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { BoolUI, BoolViewConstraint, BoolViewSupportedType } from '@mora-light/core/types/transmit';
import { StringResult } from '@mora-light/core/types/common';
import { ElResult } from 'element-plus';

type SupportedCandidValue = boolean;

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    from: {
        type: Object as PropType<BoolViewSupportedType>,
        required: true, // The running result type of the light also needs to be used
    },
    constraint: {
        type: Object as PropType<BoolViewConstraint>,
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

const value = computed<boolean | undefined>(() => {
    const value = runtime.value;
    if (value === undefined) return undefined;
    return value;
});

watch(
    () => [props.status, props.from, props.constraint, props.runtime, props.callingRefresh],
    () => {
        error.value = props.runtime?.err;
        runtime.value = props.runtime?.ok;
    },
);

const ui = computed<BoolUI | undefined>(() => props.constraint.ui);

const customLabel = computed<string>(() => ui.value?.customLabel ?? '');

const customTrueText = computed<string>(() => ui.value?.customTrueText ?? 'Success');

const customFalseText = computed<string>(() => ui.value?.customFalseText ?? 'Failed');
</script>

<template>
    <div class="running-bool-view-content">
        <div class="error" v-if="error !== undefined">
            <i class="iconfont icon-plugin-error"></i>
            <p>{{ error }}</p>
        </div>
        <template v-else>
            <!-- <div class="label" v-if="customLabel">
                {{ customLabel }}
            </div> -->
            <div class="bool-content" v-if="value !== undefined">
                <el-result
                    :icon="value ? 'success' : 'error'"
                    :title="value ? customTrueText : customFalseText"
                >
                </el-result>
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-bool-view-content {
    @apply w-full;

    .error {
        @apply flex flex-col mt-25;

        i {
            @apply text-6xl text-gray-300 dark:(text-light-900/30);
        }

        p {
            @apply mt-3 text-sm text-gray-400 dark:(text-light-900/40);
        }
    }

    > .bool-content {
        @apply w-full mt-6;

        :deep(.el-result) {
            .el-result__icon {
                svg {
                    @apply w-22 h-22;
                }
            }

            .icon-success {
                color: #84d645;
            }

            .icon-error {
                color: #ff8585;
            }

            .el-result__title {
                @apply mt-2;
                p {
                    @apply text-base text-center text-black dark:(text-light-900);
                }
            }
        }
    }
}
</style>
