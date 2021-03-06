"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.assertUint64 = exports.MAX_REVISION = void 0;
const validation_1 = require("./validation");
/**
 * The maximum allowed value for an entry revision. Setting an entry revision to this value prevents it from being updated further.
 */
exports.MAX_REVISION = BigInt("18446744073709551615"); // max uint64
/**
 * Checks if the provided bigint can fit in a 64-bit unsigned integer.
 *
 * @param int - The provided integer.
 * @throws - Will throw if the int does not fit in 64 bits.
 * @see {@link https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/BigInt/asUintN | MDN Demo}
 */
function assertUint64(int) {
    (0, validation_1.validateBigint)("int", int, "parameter");
    if (int < BigInt(0)) {
        throw new Error(`Argument ${int} must be an unsigned 64-bit integer; was negative`);
    }
    if (int > exports.MAX_REVISION) {
        throw new Error(`Argument ${int} does not fit in a 64-bit unsigned integer; exceeds 2^64-1`);
    }
}
exports.assertUint64 = assertUint64;
