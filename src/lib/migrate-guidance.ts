/**
 * The single user-facing instruction for migrating an out-of-date on-disk
 * knowledge base. Shared by the node reader (`OldLayoutError`) and
 * `init`/`upgrade` so the two surfaces never drift on the command form.
 *
 * The harness is named with the global `--harness` flag *before* the subcommand
 * (`kenkeep --harness <id> migrate`); it is a global flag, not a `migrate`
 * option, so the reversed form is rejected. The `migrate` command itself lists
 * the valid harness ids when run, so they are not enumerated here (which also
 * keeps this module free of the harness registry and its import cycle).
 */
export const MIGRATE_COMMAND_HINT = '`npx kenkeep --harness <id> migrate`';
