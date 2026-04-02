type OptionalKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? K : never;
}[keyof T];

type RequiredKeys<T> = {
  [K in keyof T]-?: undefined extends T[K] ? never : K;
}[keyof T];

export function buildObject<T extends object>(
  required: Pick<T, RequiredKeys<T>>,
  optional: Partial<Pick<T, OptionalKeys<T>>>
): T {
  return { ...required, ...optional } as T;
}

export function buildObjectWithNulls<T extends object>(
  required: Pick<T, RequiredKeys<T>>,
  optional: Partial<T>
): T {
  const filtered: Partial<T> = {};
  for (const key of Object.keys(optional) as (keyof T)[]) {
    const value = optional[key];
    if (value !== null && value !== undefined) {
      filtered[key] = value;
    }
  }
  return { ...required, ...filtered } as T;
}