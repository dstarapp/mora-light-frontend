<script lang="ts" setup>
import { PropType, computed, ref, watch } from 'vue';
import { ComponentStatus } from '@mora-light/core/types/running';
import { CandidBigInt, CandidPrincipal } from '@mora-light/core/types/candid';
import { TextUI, TextViewConstraint, TextViewSupportedType } from '@mora-light/core/types/transmit';
import { StringResult } from '@mora-light/core/types/common';
import { copyText } from '../../../../../utils/index';

type SupportedCandidValue = CandidBigInt | number | string | CandidPrincipal;

const props = defineProps({
    status: {
        type: String as PropType<ComponentStatus>,
        required: true, // Performance state
    },
    from: {
        type: Object as PropType<TextViewSupportedType>,
        required: true, // The running result type of the light also needs to be used
    },
    constraint: {
        type: Object as PropType<TextViewConstraint>,
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

const value = computed<string>(() => {
    const value = runtime.value;
    const toText = (value: SupportedCandidValue) => {
        if (value === undefined) return '';
        switch (props.from.type) {
            case 'nat':
            case 'int':
                return (value as CandidBigInt).value;
            case 'nat8':
            case 'nat16':
            case 'nat32':
                return `${value}`;
            case 'nat64':
                return (value as CandidBigInt).value;
            case 'int8':
            case 'int16':
            case 'int32':
                return `${value}`;
            case 'int64':
                return (value as CandidBigInt).value;
            case 'float32':
            case 'float64':
                return `${value}`;
            case 'text':
                return `${value}`;
            case 'principal':
                return (value as CandidPrincipal).value;
        }
        return '';
    };
    if (value !== undefined) return toText(value);
    switch (props.status) {
        case 'running':
            return value !== undefined ? toText(value) : '';
        default:
            return 'Text content';
    }
});

watch(
    () => [props.status, props.from, props.constraint, props.runtime, props.callingRefresh],
    () => {
        error.value = props.runtime?.err;
        runtime.value = props.runtime?.ok;
    },
);

const ui = computed<TextUI | undefined>(() => props.constraint.ui);

const customLabel = computed<string>(() => ui.value?.customLabel ?? '');
</script>

<template>
    <div class="running-text-view-content">
        <div class="error" v-if="error !== undefined">
            <i class="iconfont icon-plugin-error"></i>
            <p>{{ error }}</p>
        </div>
        <template v-else>
            <div class="label" v-if="customLabel">
                {{ customLabel }}
            </div>
            <div class="text-content">
                <p :style="ui">{{ value }}</p>
                <i @click="copyText(value)" class="iconfont icon-copy"></i>
            </div>
        </template>
    </div>
</template>

<style lang="less" scoped>
.running-text-view-content {
    @apply relative flex flex-col w-full;

    .label {
        @apply flex w-full font-bold text-lg items-center justify-center mt-4 dark:(text-light-900);
    }

    .text-content {
        @apply w-full mt-6;

        p {
            @apply block text-base text-black m-0 p-0 dark:(text-light-900/80);
        }

        i {
            @apply inline-block cursor-pointer w-9 h-9 border-2 border-gray-300 rounded-lg text-base flex justify-center items-center text-gray-400 mx-auto mt-6 mb-5 transition duration-300 dark:(border-dark-50 text-light-900/50);

            &:hover {
                @apply text-green-500 border-green-500 transition duration-300;
            }
        }
    }

    .error {
        @apply flex flex-col mt-25;

        i {
            @apply text-6xl text-gray-300 dark:(text-light-900/30);
        }

        p {
            @apply mt-3 text-sm text-gray-400 break-all dark:(text-light-900/40);
        }
    }
}
</style>
