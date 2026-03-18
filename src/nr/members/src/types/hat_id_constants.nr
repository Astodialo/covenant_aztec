// Precomputed powers of 2 for arithmetic-based bit manipulation on Field
// Used for hat_id operations (32 domain bits + 10 levels * 16 bits = 192 bits max)

// Thresholds for level detection (minimum value for each level)
// Level 0: domain only (value < 2^16)
// Level 1: 2^16 to 2^32-1
// Level 2: 2^32 to 2^48-1
// ...
// Level 10: 2^176 to 2^192-1
pub global LEVEL_THRESHOLDS: [Field; 12] = [
    1,                      // Level 0 minimum (any value < 2^16)
    65536,                 // Level 1 minimum (2^16)
    4294967296,            // Level 2 minimum (2^32)
    281474976710656,       // Level 3 minimum (2^48)
    18446744073709551616,  // Level 4 minimum (2^64)
    1208925819614629174706176, // Level 5 minimum (2^80)
    79228162514264337593543950336, // Level 6 minimum (2^96)
    5192296858534827628530496329220096, // Level 7 minimum (2^112)
    340282366920938463463374607431768211456, // Level 8 minimum (2^128)
    22300745198530623141535718272648361505980416, // Level 9 minimum (2^144)
    146150163733090291820368483271628301965593254912, // Level 10 minimum (2^160)
    95780971304118053647396689196894323976171195136475136, // Domain minimum (2^176)
];

// Shift factors: 2^(level * 16) for building hat IDs at each level
// Level 1: newHat * 2^16 (65536) -> bits 16-31
// Level 2: newHat * 2^32 -> bits 32-47
// ...
// Level 10: newHat * 2^160
pub global SHIFT_FACTORS: [Field; 11] = [
    1,                      // Level 0 (unused)
    65536,                 // Level 1: 2^16
    4294967296,            // Level 2: 2^32
    281474976710656,       // Level 3: 2^48
    18446744073709551616,  // Level 4: 2^64
    1208925819614629174706176, // Level 5: 2^80
    79228162514264337593543950336, // Level 6: 2^96
    5192296858534827628530496329220096, // Level 7: 2^112
    340282366920938463463374607431768211456, // Level 8: 2^128
    22300745198530623141535718272648361505980416, // Level 9: 2^144
    146150163733090291820368483271628301965593254912, // Level 10: 2^160
];
