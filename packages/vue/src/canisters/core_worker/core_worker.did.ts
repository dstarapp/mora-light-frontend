export const idlFactory = ({ IDL }: any) => {
  const CanisterStatus = IDL.Variant({
    'stopped' : IDL.Null,
    'stopping' : IDL.Null,
    'running' : IDL.Null,
  });
  const DefiniteCAnisterSettings = IDL.Record({
    'freezing_threshold' : IDL.Nat,
    'controllers' : IDL.Vec(IDL.Principal),
    'memory_allocation' : IDL.Nat,
    'compute_allocation' : IDL.Nat,
  });
  const CanisterStatusResult = IDL.Record({
    'status' : CanisterStatus,
    'memory_size' : IDL.Nat,
    'cycles' : IDL.Nat,
    'settings' : DefiniteCAnisterSettings,
    'idle_cycles_burned_per_day' : IDL.Nat,
    'module_hash' : IDL.Opt(IDL.Vec(IDL.Nat8)),
  });
  const LightExecutingQueryValue = IDL.Record({
    'id' : IDL.Text,
    'info_json' : IDL.Text,
    'created' : IDL.Nat64,
    'creator' : IDL.Principal,
    'core_json' : IDL.Text,
    'hash' : IDL.Text,
    'audited' : IDL.Nat64,
    'auditor' : IDL.Principal,
    'updated' : IDL.Nat64,
  });
  const LightExecutingQueryResult = IDL.Variant({
    'value' : LightExecutingQueryValue,
    'none' : IDL.Null,
    'frozen' : IDL.Text,
  });
  const LightCoreStatus = IDL.Variant({
    'FrozenByAuditor' : IDL.Record({
      'auditor' : IDL.Principal,
      'timestamp' : IDL.Nat64,
      'reason' : IDL.Text,
    }),
    'Alive' : IDL.Record({
      'auditor' : IDL.Principal,
      'timestamp' : IDL.Nat64,
    }),
    'FrozenByAuthor' : IDL.Record({
      'timestamp' : IDL.Nat64,
      'reason' : IDL.Text,
    }),
  });
  const LightCoreContent = IDL.Record({
    'id' : IDL.Text,
    'info_json' : IDL.Text,
    'core_json' : IDL.Text,
    'experience_json' : IDL.Text,
  });
  const LightCore = IDL.Record({
    'status' : LightCoreStatus,
    'created' : IDL.Nat64,
    'content' : LightCoreContent,
    'hash' : IDL.Text,
    'read' : IDL.Nat64,
    'used' : IDL.Nat64,
    'user' : IDL.Principal,
    'updated' : IDL.Nat64,
  });
  const MotokoResult = IDL.Variant({ 'ok' : IDL.Null, 'err' : IDL.Text });
  const Page = IDL.Record({ 'page' : IDL.Nat32, 'size' : IDL.Nat32 });
  const LogLevel = IDL.Variant({
    'Error' : IDL.Null,
    'Info' : IDL.Null,
    'Warn' : IDL.Null,
    'Debug' : IDL.Null,
    'Trace' : IDL.Null,
  });
  const Log = IDL.Record({
    'content' : IDL.Text,
    'time' : IDL.Nat64,
    'level' : LogLevel,
  });
  const PageData = IDL.Record({
    'all' : IDL.Nat32,
    'data' : IDL.Vec(Log),
    'page' : IDL.Nat32,
    'size' : IDL.Nat32,
  });
  const CorePermission = IDL.Variant({
    'WorkerFrozen' : IDL.Null,
    'ManagerPermission' : IDL.Null,
    'ManagerConfig' : IDL.Null,
    'ManagerQuery' : IDL.Null,
    'WorkerLog' : IDL.Null,
    'ManagerUpgrade' : IDL.Null,
    'WorkerPermission' : IDL.Null,
    'ManagerSettings' : IDL.Null,
    'ManagerLog' : IDL.Null,
    'WorkerUpdate' : IDL.Null,
    'ManagerRefresh' : IDL.Null,
    'WorkerFind' : IDL.Null,
    'ManagerFind' : IDL.Null,
    'ManagerInsert' : IDL.Null,
    'ManagerWasm' : IDL.Null,
    'WorkerUnfrozen' : IDL.Null,
    'WorkerInsert' : IDL.Null,
    'WorkerQuery' : IDL.Null,
  });
  const WalletReceiveResult = IDL.Record({ 'accepted' : IDL.Nat64 });
  return IDL.Service({
    'canister_status' : IDL.Func([], [CanisterStatusResult], []),
    'executing_query' : IDL.Func(
        [IDL.Text],
        [LightExecutingQueryResult],
        ['query'],
      ),
    'light_find' : IDL.Func([IDL.Text], [IDL.Opt(LightCore)], ['query']),
    'light_find_hashes' : IDL.Func([], [IDL.Vec(IDL.Text)], ['query']),
    'light_frozen' : IDL.Func(
        [IDL.Text, IDL.Text, IDL.Principal],
        [MotokoResult],
        [],
      ),
    'light_insert' : IDL.Func(
        [IDL.Text, LightCoreContent, IDL.Principal, IDL.Principal],
        [MotokoResult],
        [],
      ),
    'light_insert_core' : IDL.Func([LightCore], [MotokoResult], []),
    'light_read' : IDL.Func([IDL.Text], [IDL.Nat64], []),
    'light_unfrozen' : IDL.Func([IDL.Text, IDL.Principal], [MotokoResult], []),
    'light_used' : IDL.Func([IDL.Text], [IDL.Nat64], []),
    'logs_delete' : IDL.Func([IDL.Nat32], [IDL.Bool], []),
    'logs_find_by_page' : IDL.Func([Page], [PageData], ['query']),
    'permissions_find' : IDL.Func(
        [],
        [IDL.Vec(IDL.Tuple(IDL.Text, IDL.Vec(CorePermission)))],
        ['query'],
      ),
    'permissions_grant_all_permissions' : IDL.Func(
        [IDL.Principal],
        [IDL.Bool],
        [],
      ),
    'permissions_has_all_permissions' : IDL.Func(
        [IDL.Principal],
        [IDL.Bool],
        ['query'],
      ),
    'permissions_modify' : IDL.Func(
        [IDL.Principal, IDL.Vec(CorePermission), IDL.Vec(CorePermission)],
        [],
        [],
      ),
    'permissions_revoke_all_permissions' : IDL.Func(
        [IDL.Principal],
        [IDL.Bool],
        [],
      ),
    'wallet_balance' : IDL.Func([], [IDL.Nat], ['query']),
    'wallet_receive' : IDL.Func([], [WalletReceiveResult], []),
  });
};
export const init = ({ IDL }: any) => { return []; };
