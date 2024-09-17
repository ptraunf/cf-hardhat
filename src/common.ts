export interface Context {
    env: any
}
export type ResolvableValue<T> = T | ((context: Context) => T);

export type ResolvableCollection<K extends string, V >  = {
    [key in K]?: ResolvableValue<V>;
}
export type ResolvedCollection<K extends string, V> = {
    [key in K]?: V
}

export function resolveCollection<E extends string, V>(unresolved: ResolvableCollection<E, V>, context: Context) : ResolvedCollection<E, V>{
    let resolved : ResolvedCollection<E, V> = {};
    for (const key in unresolved) {
        if (typeof unresolved[key] === 'function') {
            resolved[key] = unresolved[key](context);
        } else {
            resolved[key] = unresolved[key] as V;
        }
    }
    return resolved;
}
