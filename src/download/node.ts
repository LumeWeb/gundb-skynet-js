import fs from "fs";

import { SkynetClient } from "../client/node";
import {
  CustomDownloadOptions,
  defaultDownloadOptions,
  defaultDownloadHnsOptions,
  CustomHnsDownloadOptions,
  GetMetadataResponse,
  getDownloadHeaders,
} from "./index";

/**
 * Initiates a download of the content of the skylink to the given file.
 *
 * @param this - SkynetClient
 * @param skylinkUrl - 46-character skylink, or a valid skylink URL. Can be followed by a path. Note that the skylink will not be encoded, so if your path might contain special characters, consider using `customOptions.path`.
 * @param path - Path to create the local file at.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The metadata in JSON format. Each field will be empty if no metadata was found.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path custom option is not a string.
 */
export async function downloadFileToPath(
  this: SkynetClient,
  skylinkUrl: string,
  path: string,
  customOptions?: CustomDownloadOptions
): Promise<GetMetadataResponse> {
  const opts = { ...defaultDownloadOptions, ...this.customOptions, ...customOptions };

  const url = this.getSkylinkUrl(skylinkUrl, opts);

  const writer = fs.createWriteStream(path);

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
    responseType: "stream",
  });

  /* istanbul ignore next */
  if (typeof response.data === "undefined") {
    throw new Error(
      "Did not get 'data' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }

  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  return getDownloadHeaders(response);
}

/**
 * Initiates a download of the content of the skylink to the given file.
 *
 * @param this - SkynetClient
 * @param domain - Handshake domain.
 * @param path - Path to create the local file at.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @param [customOptions.endpointPath="/"] - The relative URL path of the portal endpoint to contact.
 * @returns - The metadata in JSON format. Each field will be empty if no metadata was found.
 * @throws - Will throw if the skylinkUrl does not contain a skylink or if the path custom option is not a string.
 */
export async function downloadFileHnsToPath(
  this: SkynetClient,
  domain: string,
  path: string,
  customOptions?: CustomHnsDownloadOptions
): Promise<GetMetadataResponse> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  const url = this.getHnsUrl(domain, opts);

  return this.downloadFileToPathRequest(url, path, opts);
}

/**
 * Makes a request to download a file to a path from Skynet.
 *
 * @param this - SkynetClient
 * @param url - URL.
 * @param path - Path to create the local file at.
 * @param [customOptions] - Additional settings that can optionally be set.
 * @returns - The metadata in JSON format. Each field will be empty if no metadata was found.
 * @throws - Will throw if the request does not succeed or the response is missing data.
 */
export async function downloadFileToPathRequest(
  this: SkynetClient,
  url: string,
  path: string,
  customOptions?: CustomDownloadOptions
): Promise<GetMetadataResponse> {
  const opts = { ...defaultDownloadHnsOptions, ...this.customOptions, ...customOptions };

  const writer = fs.createWriteStream(path);

  const response = await this.executeRequest({
    ...opts,
    method: "get",
    url,
    responseType: "stream",
  });

  /* istanbul ignore next */
  if (typeof response.data === "undefined") {
    throw new Error(
      "Did not get 'data' in response despite a successful request. Please try again and report this issue to the devs if it persists."
    );
  }

  await new Promise((resolve, reject) => {
    response.data.pipe(writer);
    writer.on("finish", resolve);
    writer.on("error", reject);
  });

  return getDownloadHeaders(response);
}