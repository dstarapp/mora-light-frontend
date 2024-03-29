import type { Principal } from '@dfinity/principal';
import type { ActorMethod } from '@dfinity/agent';

export type CanisterStatus = { 'stopped' : null } |
  { 'stopping' : null } |
  { 'running' : null };
export interface CanisterStatusResult {
  'status' : CanisterStatus,
  'memory_size' : bigint,
  'cycles' : bigint,
  'settings' : DefiniteCAnisterSettings,
  'idle_cycles_burned_per_day' : bigint,
  'module_hash' : [] | [Uint8Array | number[]],
}
export type CorePermission = { 'WorkerFrozen' : null } |
  { 'ManagerPermission' : null } |
  { 'ManagerConfig' : null } |
  { 'ManagerQuery' : null } |
  { 'WorkerLog' : null } |
  { 'ManagerUpgrade' : null } |
  { 'WorkerPermission' : null } |
  { 'ManagerSettings' : null } |
  { 'ManagerLog' : null } |
  { 'WorkerUpdate' : null } |
  { 'ManagerRefresh' : null } |
  { 'WorkerFind' : null } |
  { 'ManagerFind' : null } |
  { 'ManagerInsert' : null } |
  { 'ManagerWasm' : null } |
  { 'WorkerUnfrozen' : null } |
  { 'WorkerInsert' : null } |
  { 'WorkerQuery' : null };
export interface DefiniteCAnisterSettings {
  'freezing_threshold' : bigint,
  'controllers' : Array<Principal>,
  'memory_allocation' : bigint,
  'compute_allocation' : bigint,
}
export interface LightCore {
  'status' : LightCoreStatus,
  'created' : bigint,
  'content' : LightCoreContent,
  'hash' : string,
  'read' : bigint,
  'used' : bigint,
  'user' : Principal,
  'updated' : bigint,
}
export interface LightCoreContent {
  'id' : string,
  'info_json' : string,
  'core_json' : string,
  'experience_json' : string,
}
export type LightCoreStatus = {
    'FrozenByAuditor' : {
      'auditor' : Principal,
      'timestamp' : bigint,
      'reason' : string,
    }
  } |
  { 'Alive' : { 'auditor' : Principal, 'timestamp' : bigint } } |
  { 'FrozenByAuthor' : { 'timestamp' : bigint, 'reason' : string } };
export type LightExecutingQueryResult = { 'value' : LightExecutingQueryValue } |
  { 'none' : null } |
  { 'frozen' : string };
export interface LightExecutingQueryValue {
  'id' : string,
  'info_json' : string,
  'created' : bigint,
  'creator' : Principal,
  'core_json' : string,
  'hash' : string,
  'audited' : bigint,
  'auditor' : Principal,
  'updated' : bigint,
}
export interface Log { 'content' : string, 'time' : bigint, 'level' : LogLevel }
export type LogLevel = { 'Error' : null } |
  { 'Info' : null } |
  { 'Warn' : null } |
  { 'Debug' : null } |
  { 'Trace' : null };
export type MotokoResult = { 'ok' : null } |
  { 'err' : string };
export interface Page { 'page' : number, 'size' : number }
export interface PageData {
  'all' : number,
  'data' : Array<Log>,
  'page' : number,
  'size' : number,
}
export interface WalletReceiveResult { 'accepted' : bigint }
export interface _SERVICE {
  'canister_status' : ActorMethod<[], CanisterStatusResult>,
  'executing_query' : ActorMethod<[string], LightExecutingQueryResult>,
  'light_find' : ActorMethod<[string], [] | [LightCore]>,
  'light_find_hashes' : ActorMethod<[], Array<string>>,
  'light_frozen' : ActorMethod<[string, string, Principal], MotokoResult>,
  'light_insert' : ActorMethod<
    [string, LightCoreContent, Principal, Principal],
    MotokoResult
  >,
  'light_insert_core' : ActorMethod<[LightCore], MotokoResult>,
  'light_read' : ActorMethod<[string], bigint>,
  'light_unfrozen' : ActorMethod<[string, Principal], MotokoResult>,
  'light_used' : ActorMethod<[string], bigint>,
  'logs_delete' : ActorMethod<[number], boolean>,
  'logs_find_by_page' : ActorMethod<[Page], PageData>,
  'permissions_find' : ActorMethod<[], Array<[string, Array<CorePermission>]>>,
  'permissions_grant_all_permissions' : ActorMethod<[Principal], boolean>,
  'permissions_has_all_permissions' : ActorMethod<[Principal], boolean>,
  'permissions_modify' : ActorMethod<
    [Principal, Array<CorePermission>, Array<CorePermission>],
    undefined
  >,
  'permissions_revoke_all_permissions' : ActorMethod<[Principal], boolean>,
  'wallet_balance' : ActorMethod<[], bigint>,
  'wallet_receive' : ActorMethod<[], WalletReceiveResult>,
}
