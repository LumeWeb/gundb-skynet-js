/**
 * Gets the file path relative to the root directory of the path, e.g. `bar` in `/foo/bar`.
 *
 * @param file - The input file.
 * @returns - The relative file path.
 */
export declare function getRelativeFilePath(file: File): string;
/**
 * Gets the root directory of the file path, e.g. `foo` in `/foo/bar`.
 *
 * @param file - The input file.
 * @returns - The root directory.
 */
export declare function getRootDirectory(file: File): string;
/**
 * Get the file mime type. In case the type is not provided, try to guess the
 * file type based on the extension.
 *
 * @param file - The file.
 * @returns - The mime type.
 */
export declare function getFileMimeType(file: File): string;
//# sourceMappingURL=file.d.ts.map