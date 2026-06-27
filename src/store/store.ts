// Run pre-registered Lua script atomically.
// Strategies depend on THIS, never on ioredis.
export interface Store {
    //Register a Lua script once; returns its sha handle name.
    defineScript(name: string, lua: string): void

    runScript(
        name: string,
        key:string[],
        args: (string | number)[]
    ): Promise<number[]>

    close(): Promise<void>
}