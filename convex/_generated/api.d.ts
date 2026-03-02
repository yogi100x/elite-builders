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
import type * as bookmarks from "../bookmarks.js";
import type * as challenges from "../challenges.js";
import type * as crons from "../crons.js";
import type * as email from "../email.js";
import type * as engagements from "../engagements.js";
import type * as github from "../github.js";
import type * as githubCache from "../githubCache.js";
import type * as invites from "../invites.js";
import type * as lib_auth from "../lib/auth.js";
import type * as lib_email from "../lib/email.js";
import type * as lib_github from "../lib/github.js";
import type * as notifications from "../notifications.js";
import type * as recommendations from "../recommendations.js";
import type * as sandbox from "../sandbox.js";
import type * as seed from "../seed.js";
import type * as sponsorApplications from "../sponsorApplications.js";
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
  bookmarks: typeof bookmarks;
  challenges: typeof challenges;
  crons: typeof crons;
  email: typeof email;
  engagements: typeof engagements;
  github: typeof github;
  githubCache: typeof githubCache;
  invites: typeof invites;
  "lib/auth": typeof lib_auth;
  "lib/email": typeof lib_email;
  "lib/github": typeof lib_github;
  notifications: typeof notifications;
  recommendations: typeof recommendations;
  sandbox: typeof sandbox;
  seed: typeof seed;
  sponsorApplications: typeof sponsorApplications;
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
