import { initTRPC } from '@trpc/server';
import type { TrpcCliMeta } from 'trpc-cli';
import { doctorCommand } from './commands/doctor';
import { installCommand } from './commands/install';
import { listCommand } from './commands/list';
import { uninstallCommand } from './commands/uninstall';
import type { CliContext } from './lib/context';
import {
  DoctorInputSchema,
  InstallInputSchema,
  ListInputSchema,
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
      description: 'Instala um subconjunto do catálogo, ou o catálogo inteiro se nenhum filtro for informado',
    })
    .input(InstallInputSchema)
    .mutation(({ input, ctx }) => installCommand(input, ctx)),

  uninstall: t.procedure
    .meta({ description: 'Desinstala um subconjunto do catálogo — exige um Tool, --tag ou --all' })
    .input(UninstallInputSchema)
    .mutation(({ input, ctx }) => uninstallCommand(input, ctx)),

  list: t.procedure
    .meta({ description: 'Lista o catálogo inteiro com Tag, Stage e suporte na plataforma atual' })
    .input(ListInputSchema)
    .query(({ input, ctx }) => listCommand(input, ctx)),

  doctor: t.procedure
    .meta({ description: 'Verifica o que está instalado, faltando ou não suportado, sem escrever nada' })
    .input(DoctorInputSchema)
    .query(({ input, ctx }) => doctorCommand(input, ctx)),
});
