/* eslint-disable */
/**
 * Generated `api` utility.
 *
 * THIS CODE IS AUTOMATICALLY GENERATED.
 *
 * To regenerate, run `npx convex dev`.
 * @module
 */

import type * as aiScoring from "../aiScoring.js";
import type * as autoBadges from "../autoBadges.js";
import type * as badges from "../badges.js";
import type * as challenges from "../challenges.js";
import type * as email from "../email.js";
import type * as github from "../github.js";
import type * as invites from "../invites.js";
import type * as lib_auth from "../lib/auth.js";
import type * as notifications from "../notifications.js";
import type * as seed from "../seed.js";
import type * as sponsors from "../sponsors.js";
import type * as submissions from "../submissions.js";
import type * as users from "../users.js";

import type {
  ApiFromModules,
  FilterApi,
  FunctionReference,
} from "convex/server";

declare const fullApi: ApiFromModules<{
  aiScoring: typeof aiScoring;
  autoBadges: typeof autoBadges;
  badges: typeof badges;
  challenges: typeof challenges;
  email: typeof email;
  github: typeof github;
  invites: typeof invites;
  "lib/auth": typeof lib_auth;
  notifications: typeof notifications;
  seed: typeof seed;
  sponsors: typeof sponsors;
  submissions: typeof submissions;
  users: typeof users;
}>;

/**
 * A utility for referencing Convex functions in your app's public API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = api.myModule.myFunction;
 * ```
 */
export declare const api: FilterApi<
  typeof fullApi,
  FunctionReference<any, "public">
>;

/**
 * A utility for referencing Convex functions in your app's internal API.
 *
 * Usage:
 * ```js
 * const myFunctionReference = internal.myModule.myFunction;
 * ```
 */
export declare const internal: FilterApi<
  typeof fullApi,
  FunctionReference<any, "internal">
>;

export declare const components: {};
