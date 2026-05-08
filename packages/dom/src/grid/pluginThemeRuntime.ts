import type { GridPluginExtension, ThemeExtensionPayload, ThemeOptions } from "@onegrid/core";

export function mergePluginThemeExtensions(
  base: ThemeOptions | undefined,
  extensions: readonly GridPluginExtension<ThemeExtensionPayload>[]
): ThemeOptions | undefined {
  return extensions.reduce<ThemeOptions | undefined>(
    (theme, extension) => mergeThemeOptions(theme, extension.payload?.theme),
    base
  );
}

function mergeThemeOptions(
  base: ThemeOptions | undefined,
  extension: ThemeOptions | undefined
): ThemeOptions | undefined {
  if (extension === undefined) {
    return base;
  }

  const variables = {
    ...(base?.variables ?? {}),
    ...(extension.variables ?? {})
  };

  return {
    ...(base ?? {}),
    ...extension,
    ...(Object.keys(variables).length === 0 ? {} : { variables: Object.freeze(variables) })
  };
}
