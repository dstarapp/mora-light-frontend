import { LoadingTrigger } from './types/loading';
import { ButtonTrigger } from './types/button';
import { ClockTrigger } from './types/clock';

export * from './types/loading';
export * from './types/button';
export * from './types/clock';

export type SupportedTriggerType = // supported type
    'loading' | 'button' | 'clock';

// list
export const TRIGGER_TYPE_LIST: SupportedTriggerType[] = ['loading', 'button', 'clock'];

// trigger mode
export type TriggerMode = LoadingTrigger | ButtonTrigger | ClockTrigger;
