<script lang="ts" setup>
import { computed, PropType, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import {
    UnionTransmitShowView,
    OptUI,
    OptViewConstraint,
    OptViewSupportedType,
} from '@mora-light/core/types/transmit';
import { CandidValue } from '@mora-light/core/types/candid';
import { deepClone, StringResult } from '@mora-light/core/types/common';
import { assignRuntime } from '@mora-light/core/types/common';
import RunningWrappedViewVue from '../RunningWrappedView.vue';

type SupportedCandidValue = CandidValue[];

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    from: {
        type: Object as PropType<OptViewSupportedType>,
        required: true, // The running result type of the light also needs to be used
    },
    constraint: {
        type: Object as PropType<OptViewConstraint>,
        required: true,
    },
    subtype: {
        type: Object as PropType<UnionTransmitShowView>,
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
    for (let i = 0; i < value.value.length; i++) {
        const view = deepClone(props.subtype);
        assignRuntime(view, { ok: value.value[i] });
        views.push(view);
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

const ui = computed<OptUI | undefined>(() => props.constraint.ui);

const customLabel = computed<string>(() => ui.value?.customLabel ?? '');
</script>

<template>
    <div class="running-opt-view-content">
        <div class="error" v-if="error !== undefined">
            {{ error }}
        </div>
        <template v-else>
            <div class="label" v-if="customLabel">
                {{ customLabel }}
            </div>
            <div class="opt-content" v-if="value !== undefined">
                <div class="opt-content-empty" v-if="valueViews.length === 0">
                    <i class="iconfont icon-no"></i>
                    <p>No Result</p>
                </div>
                <div class="opt-content-inner" v-else>
                    <template v-for="(view, i) in valueViews" :key="i">
                        <RunningWrappedViewVue
                            :status="props.status"
                            :from="props.from.subtype"
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
.running-opt-view-content {
    @apply w-full;
    .label {
        @apply flex font-bold text-lg items-center justify-center mt-4 dark:(text-light-900 mt-1);
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
    > .opt-content {
        @apply w-full mt-6 flex items-center justify-center;

        .opt-content-empty {
            @apply flex flex-col mt-4;
            p {
                @apply text-base text-gray-300 mt-4 dark:(text-light-900/50);
            }

            i {
                @apply text-6xl text-gray-200 dark:(text-light-900/50);
            }
        }

        .opt-content-inner {
            @apply w-full flex;

            .running-wrapped-view-content {
                @apply w-auto;
                .running-record-view-content {
                    @apply border-b border-dotted border-gray-200 mb-2 pb-2 dark:(border-dark-100);

                    .running-text-view-content {
                        @apply border-b-transparent mb-0 pb-0;
                    }
                }

                .running-text-view-content {
                    @apply border-b border-dotted border-gray-200 mb-2 pb-2 dark:(border-dark-100);

                    .text-content {
                        @apply mt-0 relative flex items-center pl-4 mb-0;

                        i {
                            @apply hidden;
                        }

                        p {
                            @apply !text-left;
                        }

                        &::before {
                            content: '';
                            @apply w-6px h-6px bg-green-500 inline-block rounded-full absolute left-0;
                        }
                    }
                }

                .running-image-view-content {
                    .image-content {
                        @apply my-3;
                    }
                }

                &:last-child {
                    .running-record-view-content {
                        @apply border-b-transparent;
                    }
                }
            }

            &.row {
                @apply flex-row w-auto;
                > * {
                    @apply w-auto;
                }

                .running-wrapped-view-content {
                    @apply w-auto;

                    .running-record-view-content {
                        @apply border-b-transparent pb-0;
                    }
                }
            }

            &.column {
                @apply flex-col;
            }
        }
    }
}
</style>
