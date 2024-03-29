// type CheckedResult<T> = {
//     result: DataResult<T>;
//     innerValues: ValueItem[];
//     outerValues: ValueItem[] | undefined;
// };

// // Internal variables and external variables are wrong if it is not determined or there is conflict

// // Check whether the initial value is OK
// export const checkDataSource = (
//     source: DataSource,
//     canExportValues: boolean,
//     innerValues: ValueItem[],
//     outerValues: ValueItem[] | undefined, // UNDEFINED indicates that external variables are not checked // There is no need to check the external variable when the plug -in
//     el?: HTMLElement,
// ): CheckedResult<DataSource> => {
//     innerValues = [...innerValues];
//     outerValues = outerValues !== undefined ? [...outerValues] : undefined;

//     switch (source.source) {
//         case 'combined':
//             const combinedResult = checkArgumentConstraint(
//                 source.combined.arg,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (combinedResult.result.err !== undefined) {
//                 return { ...combinedResult, result: { err: combinedResult.result.err } };
//             }
//             innerValues = combinedResult.innerValues;
//             outerValues = combinedResult.outerValues;
//             break;
//         case 'canister':
//             // Check whether the basic information exists
//             const basicCanisterResult = checkCanisterDataSource(source, el);
//             if (basicCanisterResult.err !== undefined) {
//                 return { result: basicCanisterResult, innerValues, outerValues };
//             }

//             const canisterResult = checkArgumentConstraint(
//                 source.canister.arg,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (canisterResult.result.err !== undefined) {
//                 return { ...canisterResult, result: { err: canisterResult.result.err } };
//             }
//             innerValues = canisterResult.innerValues;
//             outerValues = canisterResult.outerValues;

//             const canisterIdentityResult = checkCanisterIdentity(
//                 source.canister.identity,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (canisterIdentityResult.result.err !== undefined) {
//                 return {
//                     ...canisterIdentityResult,
//                     result: { err: canisterIdentityResult.result.err },
//                 };
//             }
//             innerValues = canisterIdentityResult.innerValues;
//             outerValues = canisterIdentityResult.outerValues;
//             break;
//         case 'light':
//             // Check whether the basic information exists
//             const basicLightResult = checkLightDataSource(source, el);
//             if (basicLightResult.err !== undefined) {
//                 return { result: basicLightResult, innerValues, outerValues };
//             }

//             const lightResult = checkArgumentConstraint(
//                 source.light.arg,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (lightResult.result.err !== undefined) {
//                 return { ...lightResult, result: { err: lightResult.result.err } };
//             }
//             innerValues = lightResult.innerValues;
//             outerValues = lightResult.outerValues;
//             break;
//         case 'input': // User input does not need to be checked
//         case 'constant': // Normally, no inspection
//             break;
//         case 'inner':
//             // Check whether the external variables introduced in the same
//             const innerName = source.inner.name;
//             const inner = innerValues.find((value) => value.name === innerName); // If not, you can't find it
//             if (
//                 !inner || // No internal variables without corresponding internal variables
//                 !isCandidType(inner) || // The introduced external variable is not a candid type
//                 !isSameCandidType(inner.type as CandidType, source.inner.result) // If the type introduced variable type is inconsistent
//             ) {
//                 return {
//                     result: { err: { message: `inner data source must has right name`, el } },
//                     innerValues,
//                     outerValues,
//                 };
//             }
//             break;
//         case 'outer':
//             // Introduce external variables and give tailor parameters. There is no need to check here
//             break;
//     }

//     if (!canExportValues && source.exported !== undefined) {
//         return {
//             result: { err: { message: `can not export values`, el } },
//             innerValues,
//             outerValues,
//         };
//     }

//     // Add subsequent export variables
//     innerValues = [...innerValues, ...findInnerValueItemsByExported(source)];
//     outerValues =
//         outerValues === undefined
//             ? undefined
//             : [...outerValues, ...findOuterValueItemsByExported(source)];

//     return {
//         result: { ok: source },
//         innerValues,
//         outerValues,
//     };
// };

// const checkCanisterDataSource = (
//     source: DataSourceCanister,
//     el?: HTMLElement,
// ): DataResult<DataSourceCanister> => {
//     const canister = source.canister;
//     // 1. canister id
//     if (!canister.canister_id || !isCanisterId(canister.canister_id)) {
//         return { err: { message: `canister id must be valid`, el } };
//     }
//     // 2. candid
//     if (!canister.candid.did || !canister.candid.javascript) {
//         return { err: { message: `canister candid must be valid`, el } };
//     }
//     // 3. method
//     if (!canister.method.name) {
//         return { err: { message: `canister method must be valid`, el } };
//     }
//     return { ok: source };
// };
// const checkLightDataSource = (
//     source: DataSourceLight,
//     el?: HTMLElement,
// ): DataResult<DataSourceLight> => {
//     const light = source.light;
//     // 1. canister id
//     if (!light.info.key) {
//         return { err: { message: `light key must be valid`, el } };
//     }
//     return { ok: source };
// };

// // Check whether the initial value is OK
// export const checkArgumentConstraint = (
//     arg: ArgumentConstraint,
//     canExportValues: boolean,
//     innerValues: ValueItem[],
//     outerValues: ValueItem[] | undefined, // UNDEFINED indicates that external variables are not checked // There is no need to check the external variable when the plug -in
//     el?: HTMLElement,
// ): CheckedResult<ArgumentConstraint> => {
//     innerValues = [...innerValues];
//     outerValues = outerValues !== undefined ? [...outerValues] : undefined;

//     switch (arg.constraint.type) {
//         case 'force':
//             const forceResult = checkDataSource(
//                 arg.constraint.source,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (forceResult.result.err !== undefined) {
//                 return { ...forceResult, result: { err: forceResult.result.err } };
//             }
//             innerValues = forceResult.innerValues;
//             outerValues = forceResult.outerValues;
//             break;
//         case 'blob':
//             const blobLengthResult = checkDataSource(
//                 arg.constraint.length,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (blobLengthResult.result.err !== undefined) {
//                 return { ...blobLengthResult, result: { err: blobLengthResult.result.err } };
//             }
//             innerValues = blobLengthResult.innerValues;
//             outerValues = blobLengthResult.outerValues;

//             if (arg.constraint.constant > 0) {
//                 for (let i = 0; i < arg.constraint.constant; i++) {
//                     const constraint = arg.constraint.items[i]?.constraint;
//                     if (constraint !== undefined) {
//                         const r = checkArgumentConstraint(
//                             constraint,
//                             canExportValues,
//                             innerValues,
//                             outerValues,
//                             el,
//                         );
//                         if (r.result.err !== undefined) return r;
//                         innerValues = r.innerValues;
//                         outerValues = r.outerValues;
//                     }
//                 }
//             } else {
//                 // Other situations are not allowed to be exported
//                 const mustEmpty: ValueItem[] = [];
//                 for (let i = 0; i < arg.constraint.items.length; i++) {
//                     const constraint = arg.constraint.items[i]?.constraint;
//                     if (constraint !== undefined) {
//                         findInnerValueItemsByArgumentConstraint(constraint, mustEmpty);
//                         findOuterValueItemsByArgumentConstraint(constraint, mustEmpty, mustEmpty);
//                     }
//                 }
//                 findInnerValueItemsByArgumentConstraint(arg.constraint.default, mustEmpty);
//                 findOuterValueItemsByArgumentConstraint(
//                     arg.constraint.default,
//                     mustEmpty,
//                     mustEmpty,
//                 );
//                 if (mustEmpty.length) {
//                     return {
//                         result: { err: { message: `can not export values`, el } },
//                         innerValues,
//                         outerValues,
//                     };
//                 }
//             }
//             break;
//         case 'vec':
//             const vecLengthResult = checkDataSource(
//                 arg.constraint.length,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (vecLengthResult.result.err !== undefined) {
//                 return { ...vecLengthResult, result: { err: vecLengthResult.result.err } };
//             }
//             innerValues = vecLengthResult.innerValues;
//             outerValues = vecLengthResult.outerValues;

//             if (arg.constraint.constant > 0) {
//                 for (let i = 0; i < arg.constraint.constant; i++) {
//                     const constraint = arg.constraint.items[i]?.constraint;
//                     if (constraint !== undefined) {
//                         const r = checkArgumentConstraint(
//                             constraint,
//                             canExportValues,
//                             innerValues,
//                             outerValues,
//                             el,
//                         );
//                         if (r.result.err !== undefined) return r;
//                         innerValues = r.innerValues;
//                         outerValues = r.outerValues;
//                     }
//                 }
//             } else {
//                 // Other situations are not allowed to be exported
//                 const mustEmpty: ValueItem[] = [];
//                 for (let i = 0; i < arg.constraint.items.length; i++) {
//                     const constraint = arg.constraint.items[i]?.constraint;
//                     if (constraint !== undefined) {
//                         findInnerValueItemsByArgumentConstraint(constraint, mustEmpty);
//                         findOuterValueItemsByArgumentConstraint(constraint, mustEmpty, mustEmpty);
//                     }
//                 }
//                 findInnerValueItemsByArgumentConstraint(arg.constraint.default, mustEmpty);
//                 findOuterValueItemsByArgumentConstraint(
//                     arg.constraint.default,
//                     mustEmpty,
//                     mustEmpty,
//                 );
//                 if (mustEmpty.length) {
//                     return {
//                         result: { err: { message: `can not export values`, el } },
//                         innerValues,
//                         outerValues,
//                     };
//                 }
//             }
//             break;
//         case 'opt':
//             const optHasResult = checkDataSource(
//                 arg.constraint.has,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (optHasResult.result.err !== undefined) {
//                 return { ...optHasResult, result: { err: optHasResult.result.err } };
//             }
//             innerValues = optHasResult.innerValues;
//             outerValues = optHasResult.outerValues;

//             if (arg.constraint.constant === 1) {
//                 const r = checkArgumentConstraint(
//                     arg.constraint.value,
//                     canExportValues,
//                     innerValues,
//                     outerValues,
//                     el,
//                 );
//                 if (r.result.err !== undefined) return r;
//                 innerValues = r.innerValues;
//                 outerValues = r.outerValues;
//             } else {
//                 // Other situations are not allowed to be exported
//                 const mustEmpty: ValueItem[] = [];
//                 findInnerValueItemsByArgumentConstraint(arg.constraint.value, mustEmpty);
//                 findOuterValueItemsByArgumentConstraint(arg.constraint.value, mustEmpty, mustEmpty);
//                 if (mustEmpty.length) {
//                     return {
//                         result: { err: { message: `can not export values`, el } },
//                         innerValues,
//                         outerValues,
//                     };
//                 }
//             }
//             break;
//         case 'record':
//             for (let i = 0; i < arg.constraint.items.length; i++) {
//                 const constraint = arg.constraint.items[i];
//                 const r = checkArgumentConstraint(
//                     constraint,
//                     canExportValues,
//                     innerValues,
//                     outerValues,
//                     el,
//                 );
//                 if (r.result.err !== undefined) return r;
//                 innerValues = r.innerValues;
//                 outerValues = r.outerValues;
//             }
//             break;
//         case 'variant':
//             const variantSelectResult = checkDataSource(
//                 arg.constraint.select,
//                 canExportValues,
//                 innerValues,
//                 outerValues,
//                 el,
//             );
//             if (variantSelectResult.result.err !== undefined) {
//                 return { ...variantSelectResult, result: { err: variantSelectResult.result.err } };
//             }
//             innerValues = variantSelectResult.innerValues;
//             outerValues = variantSelectResult.outerValues;

//             if (arg.constraint.constant) {
//                 for (let i = 0; i < arg.constraint.items.length; i++) {
//                     if (arg.constraint.constant === arg.type.items![i].key) {
//                         // If it is a constant, just check the corresponding one
//                         const constraint = arg.constraint.items[i];
//                         const r = checkArgumentConstraint(
//                             constraint,
//                             canExportValues,
//                             innerValues,
//                             outerValues,
//                             el,
//                         );
//                         if (r.result.err !== undefined) return r;
//                         innerValues = r.innerValues;
//                         outerValues = r.outerValues;
//                         break;
//                     }
//                 }
//             }
//             // Other situations are not allowed to be exported
//             const mustEmpty: ValueItem[] = [];
//             for (let i = 0; i < arg.constraint.items.length; i++) {
//                 const constraint = arg.constraint.items[i];
//                 if (constraint !== undefined) {
//                     findInnerValueItemsByArgumentConstraint(constraint, mustEmpty);
//                     findOuterValueItemsByArgumentConstraint(constraint, mustEmpty, mustEmpty);
//                 }
//             }
//             if (mustEmpty.length) {
//                 return {
//                     result: { err: { message: `can not export values`, el } },
//                     innerValues,
//                     outerValues,
//                 };
//             }
//             break;
//         case 'tuple':
//             for (let i = 0; i < arg.constraint.items.length; i++) {
//                 const constraint = arg.constraint.items[i];
//                 const r = checkArgumentConstraint(
//                     constraint,
//                     canExportValues,
//                     innerValues,
//                     outerValues,
//                     el,
//                 );
//                 if (r.result.err !== undefined) return r;
//                 innerValues = r.innerValues;
//                 outerValues = r.outerValues;
//             }
//             break;
//     }

//     return {
//         result: { ok: arg },
//         innerValues,
//         outerValues,
//     };
// };

// // Check whether the initial value is OK
// export const checkCanisterIdentity = (
//     identity: CanisterIdentity,
//     canExportValues: boolean,
//     innerValues: ValueItem[],
//     outerValues: ValueItem[] | undefined, // UNDEFINED indicates that external variables are not checked // There is no need to check the external variable when the plug -in
//     el?: HTMLElement,
// ): CheckedResult<CanisterIdentity> => {
//     // If Identity is introduced, determine whether it is introduced correctly
//     if (identity.from === 'inner') {
//         const name = identity.name;
//         const inner = innerValues.find((value) => value.name === name); // If not, you can't find it
//         if (!inner || !isCustomIdentityType(inner)) {
//             // No corresponding internal variables or introduced variable types are inconsistent
//             return {
//                 result: { err: { message: `inner identity must has right name`, el } },
//                 innerValues,
//                 outerValues,
//             };
//         }
//     } else if (outerValues && identity.from === 'outer') {
//         const name = identity.name?.trim();
//         const outer = outerValues.find((value) => value.name === name); // If not, you can't find it
//         if (!outer || !isCustomIdentityType(outer)) {
//             // There is no corresponding external variable or the type of variables introduced is inconsistent
//             return {
//                 result: { err: { message: `outer identity must has right name`, el } },
//                 innerValues,
//                 outerValues,
//             };
//         }
//         if (!['login', 'host-login'].includes(identity.detail ?? '')) {
//             // No external variable details that are specified to be introduced
//             return {
//                 result: { err: { message: `outer identity detail must be valid`, el } },
//                 innerValues,
//                 outerValues,
//             };
//         }
//     }

//     // If Identity is exported, make up for
//     if (identity.exported) {
//         if (!canExportValues) {
//             return {
//                 result: { err: { message: `can not export values`, el } },
//                 innerValues,
//                 outerValues,
//             };
//         }
//         switch (identity.from) {
//             case 'login':
//             case 'host-login':
//             case 'inner':
//                 switch (identity.exported.target) {
//                     case 'inner':
//                         const innerName = identity.exported.name;
//                         if (innerValues.find((value) => value.name === innerName)) {
//                             return {
//                                 result: {
//                                     err: { message: `inner name ${innerName} already exists`, el },
//                                 },
//                                 innerValues,
//                                 outerValues,
//                             };
//                         }
//                         if (identity.from === 'inner') {
//                             const chosen = innerValues
//                                 .filter((value) => value.name === identity.name)
//                                 .filter((value) =>
//                                     isCustomIdentityType(value),
//                                 ) as CustomIdentityValueItem[];
//                             if (chosen.length) {
//                                 const item = chosen[0];
//                                 const detail = item.detail;
//                                 innerValues.push({
//                                     name: innerName,
//                                     type: { type: 'identity' },
//                                     detail,
//                                     extra: { constant: false }, // Uncertain when created
//                                 });
//                             }
//                         } else {
//                             const detail = identity.from;
//                             innerValues.push({
//                                 name: innerName,
//                                 type: { type: 'identity' },
//                                 detail,
//                                 extra: { constant: false }, // Uncertain when created
//                             });
//                         }
//                         break;
//                     case 'outer':
//                         if (outerValues) {
//                             const outerName = identity.exported.name?.trim();
//                             if (outerName) {
//                                 if (outerValues.find((value) => value.name === outerName)) {
//                                     return {
//                                         result: {
//                                             err: {
//                                                 message: `outer name ${outerName} already exists`,
//                                                 el,
//                                             },
//                                         },
//                                         innerValues,
//                                         outerValues,
//                                     };
//                                 }
//                                 if (identity.from === 'inner') {
//                                     let chosen = outerValues
//                                         .filter((value) => value.name === identity.name)
//                                         .filter((value) =>
//                                             isCustomIdentityType(value),
//                                         ) as CustomIdentityValueItem[];
//                                     if (chosen.length) {
//                                         const item = chosen[0];
//                                         const detail = item.detail;
//                                         outerValues.push({
//                                             name: outerName,
//                                             type: { type: 'identity' },
//                                             detail,
//                                             extra: { constant: false }, // Uncertain when created
//                                         });
//                                     }
//                                 } else {
//                                     const detail = identity.from;
//                                     outerValues.push({
//                                         name: outerName,
//                                         type: { type: 'identity' },
//                                         detail,
//                                         extra: { constant: false }, // Uncertain when created
//                                     });
//                                 }
//                             }
//                         }
//                         break;
//                 }
//         }
//     }

//     return {
//         result: { ok: identity },
//         innerValues,
//         outerValues,
//     };
// };

// // Check whether the initial value is OK
// export const checkArgumentConstraintValue = (
//     arg: ArgumentConstraint,
//     canExportValues: boolean,
//     innerValues: ValueItem[],
//     outerValues: ValueItem[] | undefined, // UNDEFINED indicates that external variables are not checked // There is no need to check the external variable when the plug -in
//     el?: HTMLElement,
// ): CheckedResult<ArgumentConstraintValue> => {
//     if (arg.constraint.type === 'force') {
//         const r = checkDataSource(
//             arg.constraint.source,
//             canExportValues,
//             innerValues,
//             outerValues,
//             el,
//         );
//         return { ...r, result: !r.result.err ? { ok: arg.constraint } : { err: r.result.err } };
//     }

//     const r = checkArgumentConstraint(arg, canExportValues, innerValues, outerValues, el);
//     return { ...r, result: !r.result.err ? { ok: arg.constraint } : { err: r.result.err } };
// };

// // Check whether the initial value is OK
// export const checkCanisterId = (canister_id: string, el?: HTMLElement): DataResult<string> => {
//     return isCanisterId(canister_id)
//         ? { ok: canister_id }
//         : { err: { message: `canister id can not be empty`, el } };
// };
// export const checkCanisterCandid = (
//     candid: CanisterCandid,
//     el?: HTMLElement,
// ): DataResult<CanisterCandid> => {
//     return candid.did
//         ? { ok: candid }
//         : { err: { message: `canister candid can not be empty`, el } };
// };
// export const checkCanisterMethod = (
//     method: CanisterMethod,
//     el?: HTMLElement,
// ): DataResult<CanisterMethod> => {
//     return method.name
//         ? { ok: method }
//         : { err: { message: `canister method can not be empty`, el } };
// };
// // Check whether the initial value is OK
// export const checkTransmit = (
//     transmit: DataTransmit,
//     from: CandidType,
//     innerValues: ValueItem[],
//     outerValues: ValueItem[] | undefined, // UNDEFINED indicates that external variables are not checked // There is no need to check the external variable when the plug -in
//     el?: HTMLElement,
// ): CheckedResult<DataTransmit> => {
//     innerValues = [...innerValues];
//     outerValues = outerValues !== undefined ? [...outerValues] : undefined;

//     switch (transmit.transmit) {
//         case 'outer':
//             if (outerValues) {
//                 // Check whether the name is repeated
//                 const outerName = transmit.exported.name?.trim();
//                 if (outerName) {
//                     if (outerValues.find((value) => value.name === outerName)) {
//                         return {
//                             result: {
//                                 err: {
//                                     message: `outer name ${outerName} already exists`,
//                                     el,
//                                 },
//                             },
//                             innerValues,
//                             outerValues,
//                         };
//                     }
//                     outerValues.push({
//                         name: outerName,
//                         type: copyCandidType(from),
//                         child: findAloneType(from).child,
//                         extra: { constant: false }, // Uncertain when created
//                     });
//                 }
//             }
//             break;
//         case 'show':
//             break;
//     }

//     return { result: { ok: transmit }, innerValues, outerValues };
// };

// // Check whether the initial value is OK
// export const checkDataSourceExportedInfo = (
//     source: DataSource,
//     canExportValues: boolean,
//     innerValues: ValueItem[],
//     outerValues: ValueItem[] | undefined, // UNDEFINED indicates that external variables are not checked // There is no need to check the external variable when the plug -in
//     el?: HTMLElement,
// ): CheckedResult<ExportedInfo | undefined> => {
//     if (source.exported === undefined) {
//         return {
//             result: { ok: undefined },
//             innerValues,
//             outerValues,
//         };
//     }

//     if (!canExportValues) {
//         return {
//             result: { err: { message: `can not export values`, el } },
//             innerValues,
//             outerValues,
//         };
//     }

//     innerValues = [...innerValues];
//     outerValues = outerValues !== undefined ? [...outerValues] : undefined;

//     switch (source.exported.target) {
//         case 'inner':
//             // Check whether the name is repeated, and make up for it
//             const innerName = source.exported.name;
//             if (innerValues.find((value) => value.name === innerName)) {
//                 return {
//                     result: {
//                         err: { message: `inner name ${innerName} already exists`, el },
//                     },
//                     innerValues,
//                     outerValues,
//                 };
//             }
//             innerValues.push(...findInnerValueItemsByExported(source));
//             break;
//         case 'outer':
//             if (outerValues) {
//                 // Check whether the name is repeated, and make up for it
//                 const outerName = source.exported.name?.trim();
//                 if (innerValues.find((value) => value.name === outerName)) {
//                     return {
//                         result: {
//                             err: { message: `outer name ${outerName} already exists`, el },
//                         },
//                         innerValues,
//                         outerValues,
//                     };
//                 }
//                 innerValues.push(...findOuterValueItemsByExported(source));
//             }
//             break;
//     }

//     return {
//         result: { ok: source.exported },
//         innerValues,
//         outerValues,
//     };
// };
