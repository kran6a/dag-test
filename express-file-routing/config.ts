const config = {
    VALID_FILE_EXTENSIONS: [".ts", ".mts", ".js", ".mjs"],
    IGNORED_FILE_EXTENSIONS: [".spec"],
    IGNORE_PREFIX_CHAR: "_",
    DEFAULT_METHOD_EXPORTS: [
        "all",
        "get",
        "post",
        "put",
        "patch",
        "delete",
        "head",
        "connect",
        "options",
        "trace"
    ]
}

export default config