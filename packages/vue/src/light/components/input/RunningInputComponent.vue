<script lang="ts" setup>
import { PropType } from 'vue';
import { CandidType } from '@mora-light/core/types/candid';
import { DataResult } from '@mora-light/core/types/common';
import RunningTextInputComponentVue from './components/RunningTextInputComponent.vue';
import RunningNumberInputComponentVue from './components/RunningNumberInputComponent.vue';
import RunningSwitchInputComponentVue from './components/RunningSwitchInputComponent.vue';
import RunningDropdownInputComponentVue from './components/RunningDropdownInputComponent.vue';
import RunningTimeInputComponentVue from './components/RunningTimeInputComponent.vue';

const props = defineProps({
    need: {
        type: Object as PropType<CandidType>,
        required: true,
    },
    ui: {
        type: Object as PropType<Record<string, any>>,
        required: true,
    },
});

const emit = defineEmits<{
    changed: [DataResult<CandidType>];
}>();

const onChanged = (r: DataResult<CandidType>) => emit('changed', r);
</script>

<template>
    <div class="running-input-component-content">
        <template v-if="props.ui.type === 'TextInputComponent'">
            <RunningTextInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
        <template v-if="props.ui.type === 'NumberInputComponent'">
            <RunningNumberInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
        <template v-if="props.ui.type === 'SwitchInputComponent'">
            <RunningSwitchInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
        <template v-if="props.ui.type === 'DropdownInputComponent'">
            <RunningDropdownInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
        <template v-if="props.ui.type === 'TimeInputComponent'">
            <RunningTimeInputComponentVue
                :need="(props.need as any)"
                :ui="(props.ui as any)"
                @changed="onChanged"
            />
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-input-component-content {
    @apply w-full;
}
</style>

<style lang="less">
.running-bigint-input-component-content,
.running-text-input-component-content,
.running-dropdown-input-component-content,
.running-switch-input-component-content,
.running-number-input-component-content,
.running-float-input-component-content,
.running-integer-input-component-content {
    @apply w-full;

    .running-content {
        @apply flex flex-col relative;

        .label {
            @apply text-left text-sm text-black w-full flex-shrink-0 mr-5 pb-2 dark:(text-light-900/80);
        }

        .el-switch {
            @apply h-6;
        }

        .el-textarea {
            @apply rounded-lg border border-gray-200 transition duration-300 dark:(border-dark-100 !bg-dark-400);

            &:hover {
                @apply border-green-500 transition duration-300;
            }

            .el-textarea__inner {
                @apply p-2 text-black text-left text-sm dark:(text-light-900);
            }
        }

        .el-input {
            @apply border-none rounded-lg;

            &.is-disabled {
                .el-input__wrapper {
                    box-shadow: none;
                }
            }

            .el-input__wrapper {
                @apply px-2 py-1 rounded-lg border border-gray-200 transition duration-300 dark:(border-dark-100 !bg-dark-400);

                .el-input__inner {
                    @apply text-black text-left text-sm dark:(text-light-900);
                }

                &.is-focus {
                    @apply border-green-500 transition duration-300;
                }
            }
        }

        .el-select {
            @apply w-full;
            width: 100%;

            .el-input {
                .el-input__wrapper {
                    @apply border border-gray-200 dark:(border-dark-100 !bg-dark-400);
                    &:hover {
                        @apply border-green-500 transition duration-300;
                    }
                    .el-input__suffix {
                        .el-input__suffix-inner {
                            .el-select__caret {
                                @apply dark:(text-light-900/60);
                            }
                        }
                    }
                }

                &.is-focus {
                    @apply border-green-500 transition duration-300;
                }
            }
        }

        .el-date-editor {
            @apply w-full h-full;
        }

        .error {
            @apply absolute right-0 -bottom-4 text-xs text-red-400;

            div {
                span {
                    font-size: 12px;
                    color: #e95f5f !important;
                }
            }
        }
    }
}
</style>
