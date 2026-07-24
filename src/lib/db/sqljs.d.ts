// Minimal ambient types for sql.js (the package ships no type declarations).
declare module 'sql.js' {
  export interface QueryExecResult {
    columns: string[];
    values: unknown[][];
  }
  export interface Database {
    run(sql: string): void;
    exec(sql: string): QueryExecResult[];
    export(): Uint8Array;
    close(): void;
  }
  export interface SqlJsStatic {
    Database: new (data?: ArrayLike<number> | null) => Database;
  }
  export interface InitSqlJsConfig {
    locateFile?: (file: string) => string;
  }
  const initSqlJs: (config?: InitSqlJsConfig) => Promise<SqlJsStatic>;
  export default initSqlJs;
}
