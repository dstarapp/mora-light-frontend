export const NAT_MIN = '0';
export const NAT8_MAX = '255';
export const NAT16_MAX = '65535';
export const NAT32_MAX = '4294967295';
export const NAT64_MAX = '18446744073709551615';

export const INT8_MAX = '127';
export const INT8_MIN = '-128';
export const INT16_MAX = '32767';
export const INT16_MIN = '-32768';
export const INT32_MAX = '2147483647';
export const INT32_MIN = '-2147483648';
export const INT64_MAX = '9223372036854775807';
export const INT64_MIN = '-9223372036854775808';

export const NAT_REGEX = '^(0|[1-9][0-9]*)$';
export const INT_REGEX = '^(0|[1-9][0-9]*|-[1-9][0-9]*)$';

// ! maybe not exactly correct
export const FLOAT32_REGEX =
    '^(0|[+-]?(0|([1-9][0-9]*))(.[0-9]{0,5}[1-9])?|[+-]?[1-9](.[0-9]{0,5}[1-9])?[eE][+-]?([1-9]|[1-2][0-9]|[3][0-8]))$';
export const FLOAT64_REGEX =
    '^(0|[+-]?(0|([1-9][0-9]*))(.[0-9]{0,14}[1-9])?|[+-]?[1-9](.[0-9]{0,14}[1-9])?[eE][+-]?([1-9]|[1-9][0-9]|[12][0-9][0-9]|30[0-8]))$';
