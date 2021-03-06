"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validationError = exports.throwValidationError = exports.validateUint8ArrayLen = exports.validateUint8Array = exports.validateHexString = exports.validateStringLen = exports.validateString = exports.validateSkylinkString = exports.validateNumber = exports.validateOptionalObject = exports.validateObject = exports.validateBoolean = exports.validateBigint = void 0;
const parse_1 = require("../skylink/parse");
const string_1 = require("./string");
/**
 * Validates the given value as a bigint.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid bigint.
 */
function validateBigint(name, value, valueKind) {
    if (typeof value !== "bigint") {
        throwValidationError(name, value, valueKind, "type 'bigint'");
    }
}
exports.validateBigint = validateBigint;
/**
 * Validates the given value as a boolean.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid boolean.
 */
function validateBoolean(name, value, valueKind) {
    if (typeof value !== "boolean") {
        throwValidationError(name, value, valueKind, "type 'boolean'");
    }
}
exports.validateBoolean = validateBoolean;
/**
 * Validates the given value as an object.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid object.
 */
function validateObject(name, value, valueKind) {
    if (typeof value !== "object") {
        throwValidationError(name, value, valueKind, "type 'object'");
    }
    if (value === null) {
        throwValidationError(name, value, valueKind, "non-null");
    }
}
exports.validateObject = validateObject;
/**
 * Validates the given value as an optional object.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param model - A model object that contains all possible fields. 'value' does not need to have all fields, but it may not have any fields not contained in 'model'.
 * @throws - Will throw if not a valid optional object.
 */
function validateOptionalObject(name, value, valueKind, model) {
    if (!value) {
        // This is okay, the object is optional.
        return;
    }
    validateObject(name, value, valueKind);
    // Check if all given properties of value also exist in the model.
    for (const property in value) {
        if (!(property in model)) {
            throw new Error(`Object ${valueKind} '${name}' contains unexpected property '${property}'`);
        }
    }
}
exports.validateOptionalObject = validateOptionalObject;
/**
 * Validates the given value as a number.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid number.
 */
function validateNumber(name, value, valueKind) {
    if (typeof value !== "number") {
        throwValidationError(name, value, valueKind, "type 'number'");
    }
}
exports.validateNumber = validateNumber;
/**
 * Validates the given value as a skylink string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @returns - The validated and parsed skylink.
 * @throws - Will throw if not a valid skylink string.
 */
function validateSkylinkString(name, value, valueKind) {
    validateString(name, value, valueKind);
    const parsedSkylink = (0, parse_1.parseSkylink)(value);
    if (parsedSkylink === null) {
        throw validationError(name, value, valueKind, `valid skylink of type 'string'`);
    }
    return parsedSkylink;
}
exports.validateSkylinkString = validateSkylinkString;
/**
 * Validates the given value as a string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid string.
 */
function validateString(name, value, valueKind) {
    if (typeof value !== "string") {
        throwValidationError(name, value, valueKind, "type 'string'");
    }
}
exports.validateString = validateString;
/**
 * Validates the given value as a string of the given length.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param len - The length to check.
 * @throws - Will throw if not a valid string of the given length.
 */
function validateStringLen(name, value, valueKind, len) {
    validateString(name, value, valueKind);
    const actualLen = value.length;
    if (actualLen !== len) {
        throwValidationError(name, value, valueKind, `type 'string' of length ${len}, was length ${actualLen}`);
    }
}
exports.validateStringLen = validateStringLen;
/**
 * Validates the given value as a hex-encoded string.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid hex-encoded string.
 */
function validateHexString(name, value, valueKind) {
    validateString(name, value, valueKind);
    if (!(0, string_1.isHexString)(value)) {
        throwValidationError(name, value, valueKind, "a hex-encoded string");
    }
}
exports.validateHexString = validateHexString;
/**
 * Validates the given value as a uint8array.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @throws - Will throw if not a valid uint8array.
 */
function validateUint8Array(name, value, valueKind) {
    if (!(value instanceof Uint8Array)) {
        throwValidationError(name, value, valueKind, "type 'Uint8Array'");
    }
}
exports.validateUint8Array = validateUint8Array;
/**
 * Validates the given value as a uint8array of the given length.
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param len - The length to check.
 * @throws - Will throw if not a valid uint8array of the given length.
 */
function validateUint8ArrayLen(name, value, valueKind, len) {
    validateUint8Array(name, value, valueKind);
    const actualLen = value.length;
    if (actualLen !== len) {
        throwValidationError(name, value, valueKind, `type 'Uint8Array' of length ${len}, was length ${actualLen}`);
    }
}
exports.validateUint8ArrayLen = validateUint8ArrayLen;
/**
 * Throws an error for the given value
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param expected - The expected aspect of the value that could not be validated (e.g. "type 'string'" or "non-null").
 * @throws - Will always throw.
 */
function throwValidationError(name, value, valueKind, expected) {
    throw validationError(name, value, valueKind, expected);
}
exports.throwValidationError = throwValidationError;
/**
 * Returns an error for the given value
 *
 * @param name - The name of the value.
 * @param value - The actual value.
 * @param valueKind - The kind of value that is being checked (e.g. "parameter", "response field", etc.)
 * @param expected - The expected aspect of the value that could not be validated (e.g. "type 'string'" or "non-null").
 * @returns - The validation error.
 */
function validationError(name, value, valueKind, expected) {
    let actualValue;
    if (value === undefined) {
        actualValue = "type 'undefined'";
    }
    else if (value === null) {
        actualValue = "type 'null'";
    }
    else {
        actualValue = `type '${typeof value}', value '${value}'`;
    }
    return new Error(`Expected ${valueKind} '${name}' to be ${expected}, was ${actualValue}`);
}
exports.validationError = validationError;
