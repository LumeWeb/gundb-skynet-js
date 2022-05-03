"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getNextRevisionFromEntry = exports.getOrCreateRegistryEntry = exports.getNextRegistryEntry = exports.getOrCreateRawBytesRegistryEntry = exports.getRawBytes = exports.deleteEntryData = exports.setEntryData = exports.getEntryData = exports.setDataLink = exports.deleteJSON = exports.setJSON = exports.getJSON = void 0;
const tweetnacl_1 = require("tweetnacl");
const download_1 = require("./download");
const registry_1 = require("./registry");
const skydb_v2_1 = require("./skydb_v2");
const format_1 = require("./skylink/format");
const sia_1 = require("./skylink/sia");
const upload_1 = require("./upload");
const array_1 = require("./utils/array");
const encoding_1 = require("./utils/encoding");
const number_1 = require("./utils/number");
const options_1 = require("./utils/options");
const string_1 = require("./utils/string");
const url_1 = require("./utils/url");
const validation_1 = require("./utils/validation");
const JSON_RESPONSE_VERSION = 2;
// ====
// JSON
// ====
/**
 * Gets the JSON object corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.getJSON` is recommended.
 */
async function getJSON(publicKey, dataKey, customOptions) {
    (0, registry_1.validatePublicKey)("publicKey", publicKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", skydb_v2_1.DEFAULT_GET_JSON_OPTIONS);
    const opts = {
        ...skydb_v2_1.DEFAULT_GET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    // Lookup the registry entry.
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, getEntryOpts);
    if (entry === null) {
        return { data: null, dataLink: null };
    }
    // Determine the data link.
    // TODO: Can this still be an entry link which hasn't yet resolved to a data link?
    const { rawDataLink, dataLink } = parseDataLink(entry.data, true);
    // If a cached data link is provided and the data link hasn't changed, return.
    if ((0, skydb_v2_1.checkCachedDataLink)(rawDataLink, opts.cachedDataLink)) {
        return { data: null, dataLink };
    }
    // Download the data in the returned data link.
    const downloadOpts = (0, options_1.extractOptions)(opts, download_1.DEFAULT_DOWNLOAD_OPTIONS);
    const { data } = await this.getFileContent(dataLink, downloadOpts);
    if (typeof data !== "object" || data === null) {
        throw new Error(`File data for the entry at data key '${dataKey}' is not JSON.`);
    }
    if (!(data["_data"] && data["_v"])) {
        // Legacy data prior to skynet-js v4, return as-is.
        return { data, dataLink };
    }
    const actualData = data["_data"];
    if (typeof actualData !== "object" || data === null) {
        throw new Error(`File data '_data' for the entry at data key '${dataKey}' is not JSON.`);
    }
    return { data: actualData, dataLink };
}
exports.getJSON = getJSON;
/**
 * Sets a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param json - The JSON data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned JSON and corresponding data link.
 * @throws - Will throw if the input keys are not valid strings.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.setJSON` is recommended.
 */
async function setJSON(privateKey, dataKey, json, customOptions) {
    (0, validation_1.validateHexString)("privateKey", privateKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateObject)("json", json, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", skydb_v2_1.DEFAULT_SET_JSON_OPTIONS);
    const opts = {
        ...skydb_v2_1.DEFAULT_SET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    const { publicKey: publicKeyArray } = tweetnacl_1.sign.keyPair.fromSecretKey((0, string_1.hexToUint8Array)(privateKey));
    const [entry, dataLink] = await getOrCreateRegistryEntry(this, (0, string_1.toHexString)(publicKeyArray), dataKey, json, opts);
    // Update the registry.
    const setEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);
    return { data: json, dataLink: (0, format_1.formatSkylink)(dataLink) };
}
exports.setJSON = setJSON;
/**
 * Deletes a JSON object at the registry entry corresponding to the publicKey and dataKey.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.deleteJSON` is recommended.
 */
async function deleteJSON(privateKey, dataKey, customOptions) {
    // Validation is done below in `db.setEntryData`.
    const opts = {
        ...skydb_v2_1.DEFAULT_SET_ENTRY_DATA_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    await this.db.setEntryData(privateKey, dataKey, skydb_v2_1.DELETION_ENTRY_DATA, { ...opts, allowDeletionEntryData: true });
}
exports.deleteJSON = deleteJSON;
// ==========
// Entry Data
// ==========
/**
 * Sets the datalink for the entry at the given private key and data key.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param dataLink - The data link to set at the entry.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @throws - Will throw if the input keys are not valid strings.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.setDataLink` is recommended.
 */
async function setDataLink(privateKey, dataKey, dataLink, customOptions) {
    const parsedSkylink = (0, validation_1.validateSkylinkString)("dataLink", dataLink, "parameter");
    // Rest of validation is done below in `db.setEntryData`.
    const data = (0, sia_1.decodeSkylink)(parsedSkylink);
    await this.db.setEntryData(privateKey, dataKey, data, customOptions);
}
exports.setDataLink = setDataLink;
/**
 * Gets the raw registry entry data at the given public key and data key.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The data key.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.getEntryData` is recommended.
 */
async function getEntryData(publicKey, dataKey, customOptions) {
    (0, registry_1.validatePublicKey)("publicKey", publicKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const opts = {
        ...registry_1.DEFAULT_GET_ENTRY_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, opts);
    if (entry === null) {
        return { data: null };
    }
    return { data: entry.data };
}
exports.getEntryData = getEntryData;
/**
 * Sets the raw entry data at the given private key and data key.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param data - The raw entry data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The entry data.
 * @throws - Will throw if the length of the data is > 70 bytes.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.setEntryData` is recommended.
 */
async function setEntryData(privateKey, dataKey, data, customOptions) {
    (0, validation_1.validateHexString)("privateKey", privateKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateUint8Array)("data", data, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", skydb_v2_1.DEFAULT_SET_ENTRY_DATA_OPTIONS);
    const opts = {
        ...skydb_v2_1.DEFAULT_SET_ENTRY_DATA_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    (0, skydb_v2_1.validateEntryData)(data, opts.allowDeletionEntryData);
    const { publicKey: publicKeyArray } = tweetnacl_1.sign.keyPair.fromSecretKey((0, string_1.hexToUint8Array)(privateKey));
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entry = await getNextRegistryEntry(this, (0, string_1.toHexString)(publicKeyArray), dataKey, data, getEntryOpts);
    const setEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_SET_ENTRY_OPTIONS);
    await this.registry.setEntry(privateKey, entry, setEntryOpts);
    return { data: entry.data };
}
exports.setEntryData = setEntryData;
/**
 * Deletes the entry data at the given private key and data key. Trying to
 * access the data again with e.g. getEntryData will result in null.
 *
 * @param this - SkynetClient
 * @param privateKey - The user private key.
 * @param dataKey - The data key.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - An empty promise.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.deleteEntryData` is recommended.
 */
async function deleteEntryData(privateKey, dataKey, customOptions) {
    // Validation is done below in `db.setEntryData`.
    await this.db.setEntryData(privateKey, dataKey, skydb_v2_1.DELETION_ENTRY_DATA, {
        ...customOptions,
        allowDeletionEntryData: true,
    });
}
exports.deleteEntryData = deleteEntryData;
// =========
// Raw Bytes
// =========
/**
 * Gets the raw bytes corresponding to the publicKey and dataKey. The caller is responsible for setting any metadata in the bytes.
 *
 * @param this - SkynetClient
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The returned bytes.
 * @throws - Will throw if the returned signature does not match the returned entry, or if the skylink in the entry is invalid.
 * @deprecated - Use of this method may result in data race bugs. Reworking your application to use `client.dbV2.getRawBytes` is recommended.
 */
async function getRawBytes(publicKey, dataKey, 
// TODO: Take a new options type?
customOptions) {
    (0, registry_1.validatePublicKey)("publicKey", publicKey, "parameter");
    (0, validation_1.validateString)("dataKey", dataKey, "parameter");
    (0, validation_1.validateOptionalObject)("customOptions", customOptions, "parameter", skydb_v2_1.DEFAULT_GET_JSON_OPTIONS);
    const opts = {
        ...skydb_v2_1.DEFAULT_GET_JSON_OPTIONS,
        ...this.customOptions,
        ...customOptions,
    };
    // Lookup the registry entry.
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entry = await getSkyDBRegistryEntry(this, publicKey, dataKey, getEntryOpts);
    if (entry === null) {
        return { data: null, dataLink: null };
    }
    // Determine the data link.
    // TODO: Can this still be an entry link which hasn't yet resolved to a data link?
    const { rawDataLink, dataLink } = parseDataLink(entry.data, false);
    // If a cached data link is provided and the data link hasn't changed, return.
    if ((0, skydb_v2_1.checkCachedDataLink)(rawDataLink, opts.cachedDataLink)) {
        return { data: null, dataLink };
    }
    // Download the data in the returned data link.
    const downloadOpts = {
        ...(0, options_1.extractOptions)(opts, download_1.DEFAULT_DOWNLOAD_OPTIONS),
        responseType: "arraybuffer",
    };
    const { data: buffer } = await this.getFileContent(dataLink, downloadOpts);
    return { data: new Uint8Array(buffer), dataLink };
}
exports.getRawBytes = getRawBytes;
/* istanbul ignore next */
/**
 * Gets the registry entry for the given raw bytes or creates the entry if it doesn't exist.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param data - The raw byte data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
async function getOrCreateRawBytesRegistryEntry(client, publicKey, dataKey, data, customOptions) {
    // Not publicly available, don't validate input.
    const opts = {
        ...skydb_v2_1.DEFAULT_SET_JSON_OPTIONS,
        ...client.customOptions,
        ...customOptions,
    };
    // Create the data to upload to acquire its skylink.
    let dataKeyHex = dataKey;
    if (!opts.hashedDataKeyHex) {
        dataKeyHex = (0, string_1.toHexString)((0, string_1.stringToUint8ArrayUtf8)(dataKey));
    }
    const file = new File([data], `dk:${dataKeyHex}`, { type: "application/octet-stream" });
    // Start file upload, do not block.
    const uploadOpts = (0, options_1.extractOptions)(opts, upload_1.DEFAULT_UPLOAD_OPTIONS);
    const skyfilePromise = client.uploadFile(file, uploadOpts);
    // Fetch the current value to find out the revision.
    //
    // Start getEntry, do not block.
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entryPromise = client.registry.getEntry(publicKey, dataKey, getEntryOpts);
    // Block until both getEntry and uploadFile are finished.
    const [signedEntry, skyfile] = await Promise.all([entryPromise, skyfilePromise]);
    const revision = getNextRevisionFromEntry(signedEntry.entry);
    // Build the registry entry.
    const dataLink = (0, string_1.trimUriPrefix)(skyfile.skylink, url_1.URI_SKYNET_PREFIX);
    const rawDataLink = (0, encoding_1.decodeSkylinkBase64)(dataLink);
    (0, validation_1.validateUint8ArrayLen)("rawDataLink", rawDataLink, "skylink byte array", sia_1.RAW_SKYLINK_SIZE);
    const entry = {
        dataKey,
        data: rawDataLink,
        revision,
    };
    return entry;
}
exports.getOrCreateRawBytesRegistryEntry = getOrCreateRawBytesRegistryEntry;
// =======
// Helpers
// =======
/**
 * Gets the next entry for the given public key and data key, setting the data to be the given data and the revision number accordingly.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param data - The data to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
async function getNextRegistryEntry(client, publicKey, dataKey, data, customOptions) {
    // Not publicly available, don't validate input.
    const opts = {
        ...registry_1.DEFAULT_GET_ENTRY_OPTIONS,
        ...client.customOptions,
        ...customOptions,
    };
    // Get the latest entry.
    // TODO: Can remove this once we start caching the latest revision.
    const signedEntry = await client.registry.getEntry(publicKey, dataKey, opts);
    const revision = getNextRevisionFromEntry(signedEntry.entry);
    // Build the registry entry.
    const entry = {
        dataKey,
        data,
        revision,
    };
    return entry;
}
exports.getNextRegistryEntry = getNextRegistryEntry;
/**
 * Gets the registry entry and data link or creates the entry if it doesn't exist.
 *
 * @param client - The Skynet client.
 * @param publicKey - The user public key.
 * @param dataKey - The dat akey.
 * @param json - The JSON to set.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The registry entry and corresponding data link.
 * @throws - Will throw if the revision is already the maximum value.
 */
async function getOrCreateRegistryEntry(client, publicKey, dataKey, json, customOptions) {
    // Not publicly available, don't validate input.
    const opts = {
        ...skydb_v2_1.DEFAULT_SET_JSON_OPTIONS,
        ...client.customOptions,
        ...customOptions,
    };
    // Set the hidden _data and _v fields.
    const fullData = { _data: json, _v: JSON_RESPONSE_VERSION };
    // Create the data to upload to acquire its skylink.
    let dataKeyHex = dataKey;
    if (!opts.hashedDataKeyHex) {
        dataKeyHex = (0, string_1.toHexString)((0, string_1.stringToUint8ArrayUtf8)(dataKey));
    }
    const file = new File([JSON.stringify(fullData)], `dk:${dataKeyHex}`, { type: "application/json" });
    // Start file upload, do not block.
    const uploadOpts = (0, options_1.extractOptions)(opts, upload_1.DEFAULT_UPLOAD_OPTIONS);
    const skyfilePromise = client.uploadFile(file, uploadOpts);
    // Fetch the current value to find out the revision.
    //
    // Start getEntry, do not block.
    const getEntryOpts = (0, options_1.extractOptions)(opts, registry_1.DEFAULT_GET_ENTRY_OPTIONS);
    const entryPromise = client.registry.getEntry(publicKey, dataKey, getEntryOpts);
    // Block until both getEntry and uploadFile are finished.
    const [signedEntry, skyfile] = await Promise.all([entryPromise, skyfilePromise]);
    const revision = getNextRevisionFromEntry(signedEntry.entry);
    // Build the registry entry.
    const dataLink = (0, string_1.trimUriPrefix)(skyfile.skylink, url_1.URI_SKYNET_PREFIX);
    const data = (0, encoding_1.decodeSkylinkBase64)(dataLink);
    (0, validation_1.validateUint8ArrayLen)("data", data, "skylink byte array", sia_1.RAW_SKYLINK_SIZE);
    const entry = {
        dataKey,
        data,
        revision,
    };
    return [entry, (0, format_1.formatSkylink)(dataLink)];
}
exports.getOrCreateRegistryEntry = getOrCreateRegistryEntry;
/**
 * Gets the next revision from a returned entry (or 0 if the entry was not found).
 *
 * @param entry - The returned registry entry.
 * @returns - The revision.
 * @throws - Will throw if the next revision would be beyond the maximum allowed value.
 */
function getNextRevisionFromEntry(entry) {
    let revision;
    if (entry === null) {
        revision = BigInt(0);
    }
    else {
        revision = entry.revision + BigInt(1);
    }
    // Throw if the revision is already the maximum value.
    if (revision > number_1.MAX_REVISION) {
        throw new Error("Current entry already has maximum allowed revision, could not update the entry");
    }
    return revision;
}
exports.getNextRevisionFromEntry = getNextRevisionFromEntry;
/**
 * Gets the registry entry, returning null if the entry contains an empty skylink (the deletion sentinel).
 *
 * @param client - The Skynet Client
 * @param publicKey - The user public key.
 * @param dataKey - The key of the data to fetch for the given user.
 * @param opts - Additional settings.
 * @returns - The registry entry, or null if not found or deleted.
 */
async function getSkyDBRegistryEntry(client, publicKey, dataKey, opts) {
    const { entry } = await client.registry.getEntry(publicKey, dataKey, opts);
    if (entry === null || (0, array_1.areEqualUint8Arrays)(entry.data, sia_1.EMPTY_SKYLINK)) {
        return null;
    }
    return entry;
}
/**
 * Parses a data link out of the given registry entry data.
 *
 * @param data - The raw registry entry data.
 * @param legacy - Whether to check for possible legacy skylink data, encoded as base64.
 * @returns - The raw, unformatted data link and the formatted data link.
 * @throws - Will throw if the data is not of the expected length for a skylink.
 */
function parseDataLink(data, legacy) {
    let rawDataLink = "";
    if (legacy && data.length === sia_1.BASE64_ENCODED_SKYLINK_SIZE) {
        // Legacy data, convert to string for backwards compatibility.
        rawDataLink = (0, string_1.uint8ArrayToStringUtf8)(data);
    }
    else if (data.length === sia_1.RAW_SKYLINK_SIZE) {
        // Convert the bytes to a base64 skylink.
        rawDataLink = (0, encoding_1.encodeSkylinkBase64)(data);
    }
    else {
        (0, validation_1.throwValidationError)("entry.data", data, "returned entry data", `length ${sia_1.RAW_SKYLINK_SIZE} bytes`);
    }
    return { rawDataLink, dataLink: (0, format_1.formatSkylink)(rawDataLink) };
}
