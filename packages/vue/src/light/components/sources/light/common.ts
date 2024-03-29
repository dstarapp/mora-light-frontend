// import { LightValue } from '../../../../types/core';
// import { ArgumentConstraint } from '../../../../types/parts/sources/arg';
// import { DataSource } from '../../../../types/parts/sources/sources';

// // Summarize the UI status displayed by the plug -in
// export const trimmedLightStatusInfo = (
//     light: LightValue | undefined,
// ): {
//     has: boolean;
//     hasDataComponent: boolean;
//     hasTriggerComponent: boolean;
//     hasShowComponent: boolean;
// } => {
//     if (light === undefined) {
//         return {
//             has: false,
//             hasDataComponent: false,
//             hasTriggerComponent: false,
//             hasShowComponent: false,
//         };
//     }

//     // Do you contain data components
//     const hasDataComponent = (() => {
//         const data = light.data;

//         const checkArgumentConstraint = (arg: ArgumentConstraint): boolean => {
//             switch (arg.constraint.type) {
//                 case 'force':
//                     return checkDataSource(arg.constraint.source);
//                 case 'blob':
//                     if (arg.constraint.constant === 0) return false; // no UI

//                     if (arg.constraint.constant > 0) {
//                         for (let i = 0; i < arg.constraint.items.length; i++) {
//                             const constraint =
//                                 arg.constraint.items[i]?.constraint ?? arg.constraint.default;
//                             if (checkArgumentConstraint(constraint)) return true;
//                         }
//                         return false;
//                     }

//                     if (checkDataSource(arg.constraint.length)) return true;
//                     for (let i = 0; i < arg.constraint.items.length; i++) {
//                         const constraint =
//                             arg.constraint.items[i]?.constraint ?? arg.constraint.default;
//                         if (checkArgumentConstraint(constraint)) return true;
//                     }
//                     if (checkArgumentConstraint(arg.constraint.default)) return true;

//                     return false;
//                 case 'vec':
//                     if (arg.constraint.constant === 0) return false; // no UI

//                     if (arg.constraint.constant > 0) {
//                         for (let i = 0; i < arg.constraint.items.length; i++) {
//                             const constraint =
//                                 arg.constraint.items[i]?.constraint ?? arg.constraint.default;
//                             if (checkArgumentConstraint(constraint)) return true;
//                         }
//                         return false;
//                     }

//                     if (checkDataSource(arg.constraint.length)) return true;
//                     for (let i = 0; i < arg.constraint.items.length; i++) {
//                         const constraint =
//                             arg.constraint.items[i]?.constraint ?? arg.constraint.default;
//                         if (checkArgumentConstraint(constraint)) return true;
//                     }
//                     if (checkArgumentConstraint(arg.constraint.default)) return true;

//                     return false;
//                 case 'opt':
//                     if (arg.constraint.constant === 0) return false; // no UI

//                     if (arg.constraint.constant === 1) {
//                         return checkArgumentConstraint(arg.constraint.value);
//                     }

//                     if (checkDataSource(arg.constraint.has)) return true;
//                     if (checkArgumentConstraint(arg.constraint.value)) return true;

//                     return false;
//                 case 'record':
//                     for (let i = 0; i < arg.constraint.items.length; i++) {
//                         if (checkArgumentConstraint(arg.constraint.items[i])) return true;
//                     }
//                     return false;
//                 case 'variant':
//                     if (arg.constraint.constant) {
//                         for (let i = 0; i < arg.constraint.items.length; i++) {
//                             if (arg.constraint.constant === arg.type.items![i].key) {
//                                 return checkArgumentConstraint(arg.constraint.items[i]);
//                             }
//                         }
//                     }

//                     if (checkDataSource(arg.constraint.select)) return true;
//                     for (let i = 0; i < arg.constraint.items.length; i++) {
//                         if (checkArgumentConstraint(arg.constraint.items[i])) return true;
//                     }

//                     return false;
//                 case 'tuple':
//                     for (let i = 0; i < arg.constraint.items.length; i++) {
//                         if (checkArgumentConstraint(arg.constraint.items[i])) return true;
//                     }
//                     return false;
//             }
//         };

//         const checkDataSource = (source: DataSource): boolean => {
//             switch (source.source) {
//                 case 'combined':
//                     return false; // There is no UI in the combination calculation
//                 case 'canister':
//                     if (checkArgumentConstraint(source.canister.arg)) return true;
//                     switch (source.canister.identity.from) {
//                         case 'anonymous':
//                             return true; // Anonymous identity has no UI
//                         case 'host':
//                             return true; // Host with UI
//                         case 'login':
//                             return true; // Log in with UI
//                         case 'host-login':
//                             return true; // Log in with UI
//                         case 'inner':
//                             return true; // UI
//                         case 'outer':
//                             return true; // UI
//                     }
//                 case 'light':
//                     return checkArgumentConstraint(source.light.arg);
//                 case 'input':
//                     return false; // User input has UI
//                 case 'constant':
//                     return false; // No UI
//                 case 'inner':
//                     return false; // Internal variables have no UI
//                 case 'outer':
//                     return false; // External variables have no UI
//             }
//         };

//         for (let i = 0; i < data.length; i++) if (checkDataSource(data[i])) return true;

//         return false;
//     })();

//     // Whether to contain a trigger component
//     const hasTriggerComponent = (() => {
//         const trigger = light.trigger;
//         if (!trigger) return false;
//         switch (trigger.type) {
//             case 'button':
//                 return true; // The button trigger a UI
//             case 'clock':
//                 return true; // Timing trigger UI
//         }
//     })();

//     // Whether to include display components
//     const hasShowComponent = false;

//     // console.error("trimmedLightStatusInfo", light, {
//     //     has: hasDataComponent || hasTriggerComponent || hasShowComponent,
//     //     hasDataComponent,
//     //     hasTriggerComponent,
//     //     hasShowComponent,
//     // });

//     return {
//         has: hasDataComponent || hasTriggerComponent || hasShowComponent,
//         hasDataComponent,
//         hasTriggerComponent,
//         hasShowComponent,
//     };
// };
