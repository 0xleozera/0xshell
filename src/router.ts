import { initTRPC } from '@trpc/server';
import type { TrpcCliMeta } from 'trpc-cli';
import { doctorCommand } from './commands/doctor';
import { installCommand } from './commands/install';
import { listCommand } from './commands/list';
import { restoreCommand } from './commands/restore';
import { uninstallCommand } from './commands/uninstall';
import type { CliContext } from './lib/context';
import {
  DoctorInputSchema,
  InstallInputSchema,
  ListInputSchema,
  RestoreInputSchema,
  UninstallInputSchema,
} from './schemas/commands';

const t = initTRPC.meta<TrpcCliMeta>().context<CliContext>().create();

/**
 * The whole CLI surface, on one screen: every command, what it does and
 * what it takes. Nothing is decided here — each procedure only binds its
 * input schema to the command that owns the use case, and the context
 * (machine, terminal, human, Catalog) arrives from `cli.ts`.
 */
export const router = t.router({
  install: t.procedure
    .meta({
      description: 'Installs a subset of the Catalog, or the whole Catalog when no filter is given',
    })
    .input(InstallInputSchema)
    .mutation(({ input, ctx }) => installCommand(input, ctx)),

  uninstall: t.procedure
    .meta({ description: 'Uninstalls a subset of the Catalog — requires a Tool, --tag or --all' })
    .input(UninstallInputSchema)
    .mutation(({ input, ctx }) => uninstallCommand(input, ctx)),

  restore: t.procedure
    .meta({
      description: 'Returns the configuration files to the state of a backup version in ~/.0xshell/backups',
    })
    .input(RestoreInputSchema)
    .mutation(({ input, ctx }) => restoreCommand(input, ctx)),

  list: t.procedure
    .meta({ description: 'Lists the whole Catalog with Tag, Stage and support on the current Platform' })
    .input(ListInputSchema)
    .query(({ input, ctx }) => listCommand(input, ctx)),

  doctor: t.procedure
    .meta({ description: 'Checks what is installed, missing or unsupported, without writing anything' })
    .input(DoctorInputSchema)
    .query(({ input, ctx }) => doctorCommand(input, ctx)),
});
