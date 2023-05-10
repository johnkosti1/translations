export type Key<Prefix extends string | null, Key extends string> = Prefix extends null ? Key : `${Prefix}.${Key}`
export type StringKeys<T> = string & keyof T
export type SimpleType = string | ((...args: any[]) => any)
export type ResolvedValue<V, K extends string> = V extends SimpleType ? [K, V] : GetFlatTuples<V, K>

export type GetFlatTuples<T, P extends string | null = null> = {
  [K in StringKeys<T>]: ResolvedValue<T[K], Key<P, K>>
}[StringKeys<T>]

export type IdenticalFlat<A, B> = A extends B ? (B extends A ? A : never) : never
export type ValueOf<K, T> =  K extends keyof T ? T[K] : never
export type AreTypesEqual<A, B> = Exclude<A, B> extends never ? (Exclude<B, A> extends never ? A : never) : never
export type ValidKeys<T> = {
  [K in keyof T]: T[K] extends never ? never : K
}[keyof T]

export type DeeplyIdentical<A, B> = IdenticalFlat<{
  [K in keyof A]: A[K] extends SimpleType ? IdenticalFlat<A[K], ValueOf<K, B>> : DeeplyIdentical<A[K], ValueOf<K, B>>
}, {
  [K in keyof B]: B[K] extends SimpleType ? IdenticalFlat<B[K], ValueOf<K, A>> : DeeplyIdentical<B[K], ValueOf<K, A>>
}>

export type ValidObject<T> = AreTypesEqual<keyof T, ValidKeys<T>> extends never ? never : T

export type DeeplyValidObject<T> = ValidObject<{
  [K in keyof T]: T[K] extends SimpleType ? T[K] : ValidObject<DeeplyValidObject<T[K]>>
}>

export type Same<A, B> = DeeplyValidObject<DeeplyIdentical<A, B>>

export type TranslationsDictionary<T extends object, D extends string> =  { [K in D]: T} & Record<string, Same<T, { [K in keyof T]: T[K] }>>
export type DynamicTranslation<C = any> = (a: C) => string

export type First<T> = T extends [any, any] ? T[0] : never
export type Second<T> = T extends [any, any] ? T[1] : never
export type ParameterOf<T, K> = T extends [K, any] ? (T[1] extends DynamicTranslation ? Parameters<T[1]>[0] : never) : never
export type ReturnTypeOf<T, K> = T extends [K, any] ? (T[1] extends DynamicTranslation ? ReturnType<T[1]> : never) : never

function memoize<F extends (arg: any) => any>(fn: F) {
  const cache = new Map<Parameters<F>[0], ReturnType<F>>();

  const memoizedFunction = (...args: Parameters<F>): ReturnType<F> => {
    const [arg] = args

    if (cache.has(arg)) {
      return cache.get(arg)
    }

    const value = fn(arg)
    cache.set(arg, value)

    return value
  }

  Object.assign(memoizedFunction, {
    displayName: fn.name,
  })

  return memoizedFunction as F
}

function isPlainObject(input: unknown): input is object {
  return input !== null && typeof input === 'object' && !Array.isArray(input)
}

function deeplyMerge(a: object, b: object) {
  const c = {}
  const uniqueKeys = new Set([Object.keys(a), Object.keys(b)].flat())

  uniqueKeys.forEach(key => {
    if (a.hasOwnProperty(key) && !b.hasOwnProperty(key)) {
      c[key] = a[key]
    } else if (!a.hasOwnProperty(key) && b.hasOwnProperty(key)) {
      c[key] = b[key]
    } else if (isPlainObject(a[key]) && isPlainObject(b[key])) {
      c[key] = deeplyMerge(a[key], b[key])
    } else {
      c[key] = b[key]
    }
  })

  return c
}

type DeeplyReadonly<T> = {
  readonly [K in keyof T]:  T[K] extends SimpleType ? T[K] : DeeplyReadonly<T[K]>
}

export function translations<T extends Readonly<object>>(object: T): DeeplyReadonly<T> {
  return object
}

export function __library_name__<D extends string, T extends object>(dictionary: TranslationsDictionary<T, D>, fallbackLocale: D) {
  type S = GetFlatTuples<T>;
  type Keys = S extends [any, any] ? S[0] : never
  type StringKeys = First<Extract<S, [any, string]>>
  type FunctionKeys = First<Exclude<S, [any, string]>>
  type Locale = keyof typeof dictionary
  const fallbackTranslations = dictionary[fallbackLocale]

  const getTranslator = memoize(function createTranslator(locale: string) {
    const translations = deeplyMerge(fallbackTranslations, dictionary[locale] ?? {})

    const getTranslation = memoize(function getTranslation<K extends Keys, B extends Extract<S, [K, any]>>(key: K): B[1] {
      const pieces = key.split('.')
      let current: object | B[1] = translations

      for (let i = 0, l = pieces.length; i < l; ++i) {
        current = current[pieces[i]]
      }

      return current as B[1]
    })

    function translate<K extends StringKeys, B extends Extract<S, [K, any]>>(key: K, locale?: Locale): Second<B>
    function translate<K extends FunctionKeys, B extends Extract<S, [K, any]>>(key: K, context: ParameterOf<B, K>, locale?: Locale): ReturnTypeOf<B, K>
    function translate(key: Keys, ...args: [any?, Locale?]): string {
      const translation = getTranslation(key)
      const isFunction = typeof translation === 'function'
      const context = isFunction ? args[0] : void 0
      const locale = isFunction ? args[1] : args[0]

      if (locale != null) {
        return getTranslator(locale)(key, context)
      }

      return typeof translation === 'function' ? translation(context) : translation
    }

    return translate
  })

  return getTranslator
}
