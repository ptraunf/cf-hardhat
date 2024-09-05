export interface Context {
    env: any
}
export type FunctionOrValue<T> = T | ((context: Context) => T);
