<script lang="ts" setup>
import { computed, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    UnionTransmitShowView,
    VariantUI,
    VariantViewConstraint,
    VariantViewSupportedType,
    CombinedShowViewSubitem,
} from '@mora-light/core/types/transmit';
import { CandidValueObject } from '@mora-light/core/types/candid';
import { deepClone, StringResult } from '@mora-light/core/types/common';
import { assignRuntime } from '@mora-light/core/types/common';
import RunningWrappedViewVue from '../RunningWrappedView.vue';

type SupportedCandidValue = CandidValueObject;

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    from: {
        type: Object as PropType<VariantViewSupportedType>,
        required: true, // The running result type of the light also needs to be used
    },
    constraint: {
        type: Object as PropType<VariantViewConstraint>,
        required: true,
    },
    subitems: {
        type: Array as PropType<CombinedShowViewSubitem[]>,
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

const value = computed<SupportedCandidValue | undefined>(() => {
    const value = runtime.value;
    if (value === undefined) return undefined;
    return value;
});

const valueViews = computed<UnionTransmitShowView[]>(() => {
    if (value.value === undefined) return [];
    const views: UnionTransmitShowView[] = [];
    const keys = Object.keys(value.value);
    if (keys.length === 0) return [];
    for (let i = 0; i < props.subitems.length; i++) {
        const subitem = props.subitems[i];
        if (subitem.key !== keys[0]) continue;
        const view = deepClone(subitem.view);
        assignRuntime(view, { ok: value.value[subitem.key] });
        views.push(view);
        break;
    }
    return views;
});

watch(
    () => [props.status, props.from, props.constraint, props.runtime, props.callingRefresh],
    () => {
        error.value = props.runtime?.err;
        runtime.value = props.runtime?.ok;
    },
);

const ui = computed<VariantUI | undefined>(() => props.constraint.ui);

const customLabel = computed<string>(() => ui.value?.customLabel ?? '');
</script>

<template>
    <div class="running-variant-view-content">
        <div class="error" v-if="error !== undefined">
            <i class="iconfont icon-plugin-error"></i>
            <p>{{ error }}</p>
        </div>
        <template v-else>
            <div class="label" v-if="customLabel">
                {{ customLabel }}
            </div>

            <div class="variant-content" v-if="value !== undefined">
                <div class="variant-content-empty" v-if="valueViews.length === 0">
                    <i class="iconfont icon-no"></i>
                    <p>No Result</p>
                </div>
                <div class="variant-content-inner" v-else>
                    <template v-for="(view, i) in valueViews" :key="i">
                        <RunningWrappedViewVue
                            :status="props.status"
                            :from="props.from.subitems[i].type"
                            :view="view"
                            :callingRefresh="props.callingRefresh"
                        />
                    </template>
                </div>
            </div>
        </template>
    </div>
</template>

<style lang="less">
.running-variant-view-content {
    @apply w-full;
    .label {
        @apply flex w-full font-bold text-lg items-center justify-center mt-4 dark:(text-light-900);
    }
    .error {
        @apply flex flex-col mt-25;

        i {
            @apply text-6xl text-gray-300 dark:(text-light-900/30);
        }

        p {
            @apply mt-3 text-sm text-gray-400 dark:(text-light-900/40);
        }
    }

    > .variant-content {
        @apply w-full mt-6 flex justify-center items-center;

        .variant-content-empty {
            @apply flex flex-col mt-4;

            i {
                @apply text-6xl text-gray-200 dark:(text-light-900/30);
            }

            p {
                @apply text-base text-gray-400 pt-3 dark:(text-light-900/60);
            }
        }

        .variant-content-inner {
            @apply w-full flex;

            .running-wrapped-view-content {
                @apply my-2;
                .running-text-view-content {
                    .text-content {
                        @apply mt-0;
                        i {
                            @apply hidden;
                        }
                    }
                }
                .running-bool-view-content {
                    .bool-content {
                        .el-result {
                            @apply pt-0;
                            .el-result__icon {
                                svg {
                                    @apply w-6 h-6;
                                }
                            }
                            .el-result__title {
                                @apply mt-1;
                                p {
                                    @apply text-sm;
                                }
                            }
                        }
                    }
                }
            }

            .running-bool-view-content {
                .bool-content {
                    @apply mt-0;
                    .el-result {
                        @apply pt-5;
                    }
                }
            }

            &.row {
                flex-direction: row;
            }

            &.column {
                flex-direction: column;
            }
        }
    }
}
</style>
